/**
 * Talent scout pipeline — web search, scrape, AI score, persist.
 */

import { prisma } from '../db.js';
import { generateScoutQueries, scoreScoutLeads, generateScoutOutreach } from './ai.js';
import { searchWeb, filterSocialResults, normalizeProfileUrl } from './scoutWeb.js';
import { scrapeProfile, checkOnlyFansUsername } from './scoutScrape.js';
import { autoLinkSingleCreator } from './ofLink.js';
import { toApiCreator } from './mappers.js';

const DEFAULT_PLATFORMS = ['instagram', 'tiktok', 'twitter', 'linkhub', 'reddit'];

async function mapPool(items, concurrency, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function passesFilters(lead, criteria) {
  const { ofFilter = 'any', minFollowers, maxFollowers } = criteria;

  if (ofFilter === 'none' && lead.hasOnlyfans) return false;
  if (ofFilter === 'has' && !lead.hasOnlyfans) return false;

  if (lead.followers != null) {
    if (minFollowers != null && lead.followers < minFollowers * 0.5) return false;
    if (maxFollowers != null && lead.followers > maxFollowers * 2) return false;
  }

  return true;
}

export async function runScoutSearch(criteria) {
  const {
    brief = '',
    niche = 'Fashion & Lifestyle',
    region = '',
    minFollowers = 1000,
    maxFollowers = 50000,
    ofFilter = 'any',
    platforms = DEFAULT_PLATFORMS,
    limit = 15,
  } = criteria;

  const search = await prisma.scoutSearch.create({
    data: {
      brief,
      niche,
      region: region || null,
      minFollowers,
      maxFollowers,
      ofFilter,
      platforms,
      status: 'running',
    },
  });

  try {
    const queries = await generateScoutQueries({
      brief,
      niche,
      region,
      minFollowers,
      maxFollowers,
      ofFilter,
      platforms,
    });

    await prisma.scoutSearch.update({
      where: { id: search.id },
      data: { queries },
    });

    const allResults = [];
    const seenUrls = new Set();

    for (const query of queries) {
      const hits = await searchWeb(query, 10);
      const social = filterSocialResults(hits, platforms);
      for (const hit of social) {
        const url = normalizeProfileUrl(hit.url);
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        allResults.push({ ...hit, url });
      }
      if (allResults.length >= limit * 2) break;
      await new Promise((r) => setTimeout(r, 400));
    }

    const toScrape = allResults.slice(0, limit * 2);

    const scraped = await mapPool(toScrape, 3, async (hit) => {
      try {
        const profile = await scrapeProfile(hit.url);
        return {
          ...profile,
          searchTitle: hit.title,
          searchSnippet: hit.snippet ?? '',
        };
      } catch (err) {
        console.warn('Scrape failed:', hit.url, err.message);
        return null;
      }
    });

    const filtered = scraped.filter(Boolean).filter((l) => passesFilters(l, criteria));
    const scored = await scoreScoutLeads(filtered, {
      brief,
      niche,
      region,
      minFollowers,
      maxFollowers,
      ofFilter,
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    const saved = [];
    for (const lead of top) {
      const row = await prisma.scoutLead.upsert({
        where: { profileUrl: lead.profileUrl },
        create: {
          searchId: search.id,
          displayName: lead.displayName,
          handle: lead.handle,
          platform: lead.platform,
          profileUrl: lead.profileUrl,
          onlyfansUrl: lead.onlyfansUrl,
          hasOnlyfans: lead.hasOnlyfans,
          followers: lead.followers,
          niche: lead.niche ?? niche,
          region: lead.region ?? (region || null),
          score: lead.score,
          scoreReason: lead.scoreReason,
          bio: lead.bio ?? '',
          signals: lead.signals ?? [],
          aiSummary: lead.aiSummary ?? '',
          rawData: lead.rawData ?? null,
          lastCheckedAt: lead.lastCheckedAt ?? new Date(),
        },
        update: {
          searchId: search.id,
          displayName: lead.displayName,
          handle: lead.handle,
          platform: lead.platform,
          onlyfansUrl: lead.onlyfansUrl,
          hasOnlyfans: lead.hasOnlyfans,
          followers: lead.followers,
          niche: lead.niche ?? niche,
          region: lead.region ?? (region || null),
          score: lead.score,
          scoreReason: lead.scoreReason,
          bio: lead.bio ?? '',
          signals: lead.signals ?? [],
          aiSummary: lead.aiSummary ?? '',
          rawData: lead.rawData ?? null,
          lastCheckedAt: lead.lastCheckedAt ?? new Date(),
        },
      });
      saved.push(row);
    }

    await prisma.scoutSearch.update({
      where: { id: search.id },
      data: { status: 'done', resultCount: saved.length },
    });

    return { searchId: search.id, queries, leads: saved };
  } catch (error) {
    await prisma.scoutSearch.update({
      where: { id: search.id },
      data: { status: 'failed', error: error.message },
    });
    throw error;
  }
}

export async function enrichLead(leadId) {
  const lead = await prisma.scoutLead.findUnique({ where: { id: leadId } });
  if (!lead) {
    const err = new Error('Lead nicht gefunden');
    err.status = 404;
    throw err;
  }

  const scraped = await scrapeProfile(lead.profileUrl);
  const scored = await scoreScoutLeads([{ ...scraped, profileUrl: lead.profileUrl }], {
    niche: lead.niche,
    region: lead.region,
    ofFilter: 'any',
  });
  const s = scored[0];

  return prisma.scoutLead.update({
    where: { id: leadId },
    data: {
      displayName: scraped.displayName,
      handle: scraped.handle,
      onlyfansUrl: scraped.onlyfansUrl,
      hasOnlyfans: scraped.hasOnlyfans,
      followers: scraped.followers,
      bio: scraped.bio,
      signals: s.signals ?? scraped.signals,
      score: s.score,
      scoreReason: s.scoreReason,
      aiSummary: s.aiSummary,
      rawData: scraped.rawData,
      lastCheckedAt: scraped.lastCheckedAt,
    },
  });
}

export async function outreachForLead(leadId, tone = 'professional') {
  const lead = await prisma.scoutLead.findUnique({ where: { id: leadId } });
  if (!lead) {
    const err = new Error('Lead nicht gefunden');
    err.status = 404;
    throw err;
  }

  const message = await generateScoutOutreach(lead, tone);
  return prisma.scoutLead.update({
    where: { id: leadId },
    data: { outreachDraft: message },
  });
}

export async function checkProfileUrl(input) {
  let url = input.trim();
  if (!url.startsWith('http')) {
    if (url.startsWith('@')) url = `https://www.instagram.com/${url.slice(1)}/`;
    else if (!url.includes('.')) url = `https://www.instagram.com/${url}/`;
    else url = `https://${url}`;
  }

  const scraped = await scrapeProfile(url);
  const scored = await scoreScoutLeads([scraped], { ofFilter: 'any' });
  return { ...scored[0], checkedAt: new Date().toISOString() };
}

export async function convertLeadToCreator(leadId) {
  const lead = await prisma.scoutLead.findUnique({ where: { id: leadId } });
  if (!lead) {
    const err = new Error('Lead nicht gefunden');
    err.status = 404;
    throw err;
  }

  const handle = lead.handle ?? `@${lead.displayName.toLowerCase().replace(/\s+/g, '')}`;
  const onlyfansUrl =
    lead.onlyfansUrl ??
    (lead.hasOnlyfans && lead.handle
      ? `https://onlyfans.com/${lead.handle.replace(/^@/, '')}`
      : null);

  const row = await prisma.creator.create({
    data: {
      name: lead.displayName,
      handle,
      avatar: '',
      niche: lead.niche ?? 'Fashion & Lifestyle',
      status: 'onboarding',
      revenueShare: 70,
      monthlyRevenue: 0,
      monthlyGoal: 0,
      subscribers: 0,
      growth: 0,
      team: [],
      joinedAt: new Date().toISOString().slice(0, 10),
      contractEndsAt: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      notes: `Scout-Lead: ${lead.profileUrl}\n${lead.aiSummary}\n${lead.notes}`.trim(),
      trend: [0, 0, 0, 0, 0, 0, 0],
      onlyfansUrl,
    },
  });

  let linked = row;
  try {
    const linkResult = await autoLinkSingleCreator(prisma, row);
    if (linkResult.linked) linked = linkResult.creator;
  } catch {
    // optional
  }

  await prisma.scoutLead.update({
    where: { id: leadId },
    data: { status: 'converted', creatorId: linked.id },
  });

  return { creator: toApiCreator(linked), leadId };
}

export { checkOnlyFansUsername };