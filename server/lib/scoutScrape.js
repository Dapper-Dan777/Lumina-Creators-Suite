/**
 * Profile & link-in-bio scraping for talent scouting (private use).
 */

import { detectPlatformFromUrl, normalizeProfileUrl } from './scoutWeb.js';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const OF_PATTERNS = [
  /https?:\/\/(?:www\.)?onlyfans\.com\/[a-zA-Z0-9._-]+/gi,
  /onlyfans\.com\/[a-zA-Z0-9._-]+/gi,
];

export async function fetchHtml(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) return { ok: false, status: res.status, html: null };
    return { ok: true, status: res.status, html: await res.text() };
  } catch (err) {
    return { ok: false, status: 0, html: null, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

export function extractMeta(html) {
  const pick = (re) => html.match(re)?.[1]?.trim() ?? '';
  const decode = (s) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

  return {
    title: decode(pick(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) || pick(/<title[^>]*>([^<]*)<\/title>/i)),
    description: decode(
      pick(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i) ||
        pick(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i),
    ),
    image: pick(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i),
  };
}

export function extractOnlyFansLinks(text) {
  const found = new Set();
  for (const pattern of OF_PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      let link = m[0];
      if (!link.startsWith('http')) link = `https://${link}`;
      found.add(normalizeProfileUrl(link));
    }
  }
  return [...found];
}

export function extractLinks(html) {
  const links = new Set();
  const re = /href=["'](https?:\/\/[^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    links.add(m[1]);
  }
  return [...links];
}

export function parseFollowerHint(text) {
  if (!text) return null;
  const normalized = text.replace(/\u00a0/g, ' ');

  const kMatch = normalized.match(/([\d.,]+)\s*[kK]\s*(?:followers?|Follower|Abonnenten?|fans?)/i);
  if (kMatch) {
    const n = parseFloat(kMatch[1].replace(',', '.'));
    if (!Number.isNaN(n)) return Math.round(n * 1000);
  }

  const mMatch = normalized.match(/([\d.,]+)\s*[mM]\s*(?:followers?|Follower|Abonnenten?)/i);
  if (mMatch) {
    const n = parseFloat(mMatch[1].replace(',', '.'));
    if (!Number.isNaN(n)) return Math.round(n * 1_000_000);
  }

  const plain = normalized.match(/([\d.,]+)\s*(?:followers?|Follower|Abonnenten?)/i);
  if (plain) {
    const n = parseInt(plain[1].replace(/[.,]/g, ''), 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  return null;
}

export function extractHandle(url, platform) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (platform === 'instagram' && parts[0] && !['p', 'reel', 'stories'].includes(parts[0])) {
      return `@${parts[0]}`;
    }
    if (platform === 'tiktok' && parts[0]?.startsWith('@')) return parts[0];
    if (platform === 'tiktok' && parts[0]) return `@${parts[0]}`;
    if (platform === 'twitter' && parts[0]) return `@${parts[0]}`;
    if (platform === 'onlyfans' && parts[0]) return `@${parts[0]}`;
    if (platform === 'reddit' && parts[0] === 'user' && parts[1]) return `u/${parts[1]}`;
    return parts[0] ? `@${parts[0].replace(/^@/, '')}` : null;
  } catch {
    return null;
  }
}

function collectSignals(text, platform, ofLinks) {
  const signals = [];
  const lower = text.toLowerCase();

  if (ofLinks.length) signals.push('OnlyFans-Link gefunden');
  if (/link in bio|linktree|beacons|allmylinks/i.test(lower)) signals.push('Link-in-Bio');
  if (/fitness|gym|workout/i.test(lower)) signals.push('Fitness-Content');
  if (/cosplay/i.test(lower)) signals.push('Cosplay');
  if (/model|influencer|creator|content creator/i.test(lower)) signals.push('Creator-Self-Label');
  if (/exclusive|subscribe|vip|ppv/i.test(lower)) signals.push('Monetarisierungs-Signale');
  if (/germany|deutsch|berlin|münchen|hamburg|🇩🇪/i.test(lower)) signals.push('DACH-Bezug');
  if (platform === 'tiktok') signals.push('TikTok-Präsenz');
  if (platform === 'instagram') signals.push('Instagram-Präsenz');

  return [...new Set(signals)];
}

async function scrapeLinkHub(url, html) {
  const links = extractLinks(html);
  const ofLinks = [];
  const socialLinks = [];

  for (const link of links) {
    if (/onlyfans\.com/i.test(link)) ofLinks.push(normalizeProfileUrl(link));
    if (/instagram\.com|tiktok\.com|twitter\.com|x\.com/i.test(link)) {
      socialLinks.push(normalizeProfileUrl(link));
    }
  }

  return {
    ofLinks: [...new Set(ofLinks)],
    socialLinks: [...new Set(socialLinks)].slice(0, 5),
  };
}

export async function scrapeProfile(inputUrl) {
  const profileUrl = normalizeProfileUrl(inputUrl);
  const platform = detectPlatformFromUrl(profileUrl);
  const fetched = await fetchHtml(profileUrl);
  const now = new Date();

  if (!fetched.ok || !fetched.html) {
    return {
      profileUrl,
      platform,
      displayName: extractHandle(profileUrl, platform) ?? profileUrl,
      handle: extractHandle(profileUrl, platform),
      bio: '',
      followers: null,
      hasOnlyfans: platform === 'onlyfans',
      onlyfansUrl: platform === 'onlyfans' ? profileUrl : null,
      signals: [],
      rawData: { fetchStatus: fetched.status, error: fetched.error },
      lastCheckedAt: now,
    };
  }

  const meta = extractMeta(fetched.html);
  const textBlob = `${meta.title} ${meta.description} ${fetched.html.slice(0, 8000)}`;
  let ofLinks = extractOnlyFansLinks(textBlob);
  let linkedSocial = [];

  if (platform === 'linkhub') {
    const hub = await scrapeLinkHub(profileUrl, fetched.html);
    ofLinks = [...new Set([...ofLinks, ...hub.ofLinks])];
    linkedSocial = hub.socialLinks;
  }

  if (platform === 'onlyfans' && !ofLinks.length) {
    ofLinks = [profileUrl];
  }

  const followers = parseFollowerHint(textBlob);
  const handle = extractHandle(profileUrl, platform);
  const displayName =
    meta.title?.split(/[|\-–]/)[0]?.trim() || handle || profileUrl;

  const signals = collectSignals(textBlob, platform, ofLinks);

  return {
    profileUrl,
    platform,
    displayName,
    handle,
    bio: meta.description || meta.title || '',
    followers,
    hasOnlyfans: ofLinks.length > 0,
    onlyfansUrl: ofLinks[0] ?? null,
    signals,
    linkedSocial,
    rawData: {
      meta,
      fetchStatus: fetched.status,
      ofLinks,
      linkedSocial,
    },
    lastCheckedAt: now,
  };
}

export async function checkOnlyFansUsername(username) {
  const slug = username.replace(/^@/, '').trim();
  if (!slug) return { exists: false };
  const url = `https://onlyfans.com/${slug}`;
  const fetched = await fetchHtml(url, 8000);
  if (!fetched.html) return { exists: null, url, uncertain: true };

  const lower = fetched.html.toLowerCase();
  const exists =
    !lower.includes('this page is not available') &&
    !lower.includes('page not found') &&
    fetched.status !== 404;

  return { exists, url, meta: extractMeta(fetched.html) };
}