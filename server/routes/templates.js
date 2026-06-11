import { Router } from 'express';
import { prisma } from '../db.js';
import { CONTENT_TEMPLATES, buildTemplateItems } from '../lib/contentTemplates.js';
import { toApiContent } from '../lib/mappers.js';

const router = Router();

router.get('/', (_req, res) => {
  const list = Object.entries(CONTENT_TEMPLATES).map(([niche, items]) => ({
    niche,
    postCount: items.filter((i) => i.type === 'Post').length,
    ppvCount: items.filter((i) => i.type === 'PPV').length,
    storyCount: items.filter((i) => i.type === 'Story').length,
    total: items.length,
  }));
  res.json({ ok: true, templates: list });
});

router.post('/apply', async (req, res) => {
  try {
    const { niche, creatorId } = req.body ?? {};
    if (!niche || !creatorId) {
      return res.status(400).json({ ok: false, error: 'niche und creatorId erforderlich' });
    }

    const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
    if (!creator) return res.status(404).json({ ok: false, error: 'Creator nicht gefunden' });

    const payloads = buildTemplateItems(niche, creatorId);
    const created = [];
    for (const data of payloads) {
      const row = await prisma.contentItem.create({
        data: {
          creatorId: data.creatorId,
          title: data.title,
          caption: data.caption,
          type: data.type,
          status: data.status,
          scheduledFor: new Date(data.scheduledFor),
          price: data.price,
          cover: data.cover,
        },
      });
      created.push(toApiContent(row));
    }

    res.json({
      ok: true,
      created,
      message: `${created.length} Posts aus Template „${niche}" geplant`,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;