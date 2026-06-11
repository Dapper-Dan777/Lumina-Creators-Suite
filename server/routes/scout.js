import { Router } from 'express';
import { prisma } from '../db.js';
import {
  runScoutSearch,
  enrichLead,
  outreachForLead,
  checkProfileUrl,
  convertLeadToCreator,
  checkOnlyFansUsername,
} from '../lib/scout.js';
import { getSearchProviderStatus } from '../lib/scoutWeb.js';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    const search = await getSearchProviderStatus();
    res.json({ ok: true, search });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

function toLeadDto(row) {
  return {
    id: row.id,
    searchId: row.searchId,
    displayName: row.displayName,
    handle: row.handle,
    platform: row.platform,
    profileUrl: row.profileUrl,
    onlyfansUrl: row.onlyfansUrl,
    hasOnlyfans: row.hasOnlyfans,
    followers: row.followers,
    engagement: row.engagement,
    niche: row.niche,
    region: row.region,
    score: row.score,
    scoreReason: row.scoreReason,
    bio: row.bio,
    signals: row.signals,
    status: row.status,
    notes: row.notes,
    aiSummary: row.aiSummary,
    outreachDraft: row.outreachDraft,
    creatorId: row.creatorId,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get('/leads', async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.platform) where.platform = String(req.query.platform);
    if (req.query.searchId) where.searchId = String(req.query.searchId);
    if (req.query.minScore) where.score = { gte: Number(req.query.minScore) };
    if (req.query.hasOnlyfans === 'true') where.hasOnlyfans = true;
    if (req.query.hasOnlyfans === 'false') where.hasOnlyfans = false;

    const rows = await prisma.scoutLead.findMany({
      where,
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
      take: Math.min(Number(req.query.limit) || 100, 200),
    });
    res.json({ ok: true, leads: rows.map(toLeadDto) });
  } catch (error) {
    console.error('scout/leads:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/searches', async (_req, res) => {
  try {
    const rows = await prisma.scoutSearch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ ok: true, searches: rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/leads/:id', async (req, res) => {
  try {
    const row = await prisma.scoutLead.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ ok: false, error: 'Nicht gefunden' });
    res.json({ ok: true, lead: toLeadDto(row) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/run', async (req, res) => {
  try {
    const body = req.body ?? {};
    const result = await runScoutSearch({
      brief: body.brief ?? '',
      niche: body.niche ?? 'Fashion & Lifestyle',
      region: body.region ?? '',
      minFollowers: body.minFollowers != null ? Number(body.minFollowers) : 1000,
      maxFollowers: body.maxFollowers != null ? Number(body.maxFollowers) : 50000,
      ofFilter: body.ofFilter ?? 'none',
      platforms: body.platforms ?? ['instagram', 'tiktok', 'linkhub'],
      limit: Math.min(Number(body.limit) || 12, 25),
    });
    res.json({
      ok: true,
      searchId: result.searchId,
      queries: result.queries,
      leads: result.leads.map(toLeadDto),
      message: `${result.leads.length} Leads gefunden und gespeichert`,
    });
  } catch (error) {
    console.error('scout/run:', error.message);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.post('/check', async (req, res) => {
  try {
    const url = req.body?.url ?? req.body?.handle ?? '';
    if (!url.trim()) return res.status(400).json({ ok: false, error: 'url oder handle erforderlich' });
    const result = await checkProfileUrl(url);
    res.json({ ok: true, profile: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/check-onlyfans', async (req, res) => {
  try {
    const username = req.body?.username ?? '';
    if (!username.trim()) return res.status(400).json({ ok: false, error: 'username erforderlich' });
    const result = await checkOnlyFansUsername(username);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.patch('/leads/:id', async (req, res) => {
  try {
    const allowed = ['status', 'notes', 'niche', 'region', 'outreachDraft'];
    const data = {};
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) data[key] = req.body[key];
    }
    const row = await prisma.scoutLead.update({ where: { id: req.params.id }, data });
    res.json({ ok: true, lead: toLeadDto(row) });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ ok: false, error: error.message });
  }
});

router.post('/leads/:id/enrich', async (req, res) => {
  try {
    const row = await enrichLead(req.params.id);
    res.json({ ok: true, lead: toLeadDto(row), message: 'Profil aktualisiert' });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.post('/leads/:id/outreach', async (req, res) => {
  try {
    const row = await outreachForLead(req.params.id, req.body?.tone ?? 'professional');
    res.json({ ok: true, lead: toLeadDto(row), message: 'Outreach-Entwurf erstellt' });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.post('/leads/:id/convert', async (req, res) => {
  try {
    const result = await convertLeadToCreator(req.params.id);
    res.json({ ok: true, ...result, message: 'Als Creator angelegt' });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    await prisma.scoutLead.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ ok: false, error: error.message });
  }
});

export default router;