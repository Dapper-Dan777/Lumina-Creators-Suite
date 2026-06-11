import { Router } from 'express';
import { prisma } from '../db.js';
import { toApiContent } from '../lib/mappers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { creatorId, status } = req.query;
    const rows = await prisma.contentItem.findMany({
      where: {
        ...(creatorId && { creatorId: String(creatorId) }),
        ...(status && { status: String(status) }),
      },
      orderBy: { scheduledFor: 'asc' },
    });
    res.json(rows.map(toApiContent));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.title?.trim() || !body.creatorId) {
      return res.status(400).json({ error: 'title und creatorId sind erforderlich' });
    }

    const row = await prisma.contentItem.create({
      data: {
        creatorId: body.creatorId,
        title: body.title.trim(),
        caption: body.caption?.trim() ?? '',
        type: body.type ?? 'Post',
        status: body.status ?? 'draft',
        scheduledFor: new Date(body.scheduledFor ?? Date.now()),
        price: body.price != null ? Number(body.price) : null,
        cover: body.cover ?? 'linear-gradient(135deg,#ec4899,#22d3ee)',
      },
    });

    res.status(201).json(toApiContent(row));
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

    if (body.title !== undefined) data.title = body.title;
    if (body.caption !== undefined) data.caption = body.caption;
    if (body.type !== undefined) data.type = body.type;
    if (body.status !== undefined) data.status = body.status;
    if (body.scheduledFor !== undefined) data.scheduledFor = new Date(body.scheduledFor);
    if (body.price !== undefined) data.price = body.price == null ? null : Number(body.price);
    if (body.cover !== undefined) data.cover = body.cover;
    if (body.status === 'published' && !body.publishedAt) {
      data.publishedAt = new Date();
    }

    const row = await prisma.contentItem.update({ where: { id }, data });
    res.json(toApiContent(row));
  } catch (error) {
    console.error(error);
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.contentItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.message });
  }
});

export default router;