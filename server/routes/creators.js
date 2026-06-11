import { Router } from 'express';
import { prisma } from '../db.js';
import { toApiCreator } from '../lib/mappers.js';
import { autoLinkSingleCreator } from '../lib/ofLink.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rows = await prisma.creator.findMany({ orderBy: { name: 'asc' } });
    res.json(rows.map(toApiCreator));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.name?.trim()) {
      return res.status(400).json({ error: 'name ist erforderlich' });
    }

    const handle =
      body.handle?.trim() ||
      `@${body.name.toLowerCase().replace(/\s+/g, '')}`;
    const onlyfansUrl =
      body.onlyfansUrl ||
      `https://onlyfans.com/${handle.replace(/^@/, '')}`;

    const row = await prisma.creator.create({
      data: {
        name: body.name.trim(),
        handle,
        avatar: body.avatar ?? '',
        niche: body.niche ?? 'Fashion & Lifestyle',
        status: body.status ?? 'onboarding',
        revenueShare: Number(body.revenueShare ?? 70),
        monthlyRevenue: Number(body.monthlyRevenue ?? 0),
        monthlyGoal: Number(body.monthlyGoal ?? 0),
        subscribers: Number(body.subscribers ?? 0),
        growth: Number(body.growth ?? 0),
        team: body.team ?? [],
        joinedAt: body.joinedAt ?? new Date().toISOString().slice(0, 10),
        contractEndsAt: body.contractEndsAt ?? new Date().toISOString().slice(0, 10),
        notes: body.notes ?? '',
        trend: body.trend ?? [0, 0, 0, 0, 0, 0, 0],
        onlyfansUrl,
      },
    });

    let linked = row;
    try {
      const linkResult = await autoLinkSingleCreator(prisma, row);
      if (linkResult.linked) linked = linkResult.creator;
    } catch (err) {
      console.warn('OF auto-link on create:', err.message);
    }

    res.status(201).json(toApiCreator(linked));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const data = {};

    const fields = [
      'name', 'handle', 'avatar', 'headerUrl', 'niche', 'status', 'notes',
      'joinedAt', 'contractEndsAt', 'onlyfansUrl', 'onlyfansAccountId', 'onlyfansUsername',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    const nums = ['revenueShare', 'monthlyRevenue', 'monthlyGoal', 'subscribers', 'growth'];
    for (const f of nums) {
      if (body[f] !== undefined) data[f] = Number(body[f]);
    }
    if (body.team !== undefined) data.team = body.team;
    if (body.trend !== undefined) data.trend = body.trend;

    const row = await prisma.creator.update({ where: { id }, data });

    let linked = row;
    if (body.handle !== undefined || body.onlyfansUrl !== undefined) {
      try {
        const linkResult = await autoLinkSingleCreator(prisma, row);
        if (linkResult.linked) linked = linkResult.creator;
      } catch (err) {
        console.warn('OF auto-link on patch:', err.message);
      }
    }

    res.json(toApiCreator(linked));
  } catch (error) {
    console.error(error);
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.creator.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.message });
  }
});

export default router;