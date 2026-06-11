import { Router } from 'express';
import path from 'path';
import { prisma } from '../db.js';
import { saveDataUrl, deleteStoredFile, resolveUploadPath, UPLOAD_ROOT } from '../lib/mediaStorage.js';

export const MEDIA_CATEGORIES = [
  { id: 'feed', label: 'Feed / Timeline' },
  { id: 'ppv', label: 'PPV-Ready' },
  { id: 'lingerie', label: 'Lingerie' },
  { id: 'bts', label: 'Behind the Scenes' },
  { id: 'cosplay', label: 'Cosplay' },
  { id: 'fitness', label: 'Fitness / Lifestyle' },
  { id: 'teaser', label: 'Teaser / Promo' },
  { id: 'story', label: 'Story / 24h' },
  { id: 'raw', label: 'Roh / Unbearbeitet' },
];

const router = Router();

function toDto(row) {
  return {
    id: row.id,
    creatorId: row.creatorId,
    folderId: row.folderId ?? null,
    filename: row.filename,
    url: row.url,
    mimeType: row.mimeType,
    category: row.category,
    title: row.title,
    fileSize: row.fileSize,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toFolderDto(row) {
  return {
    id: row.id,
    creatorId: row.creatorId,
    name: row.name,
    parentId: row.parentId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    _count: row._count,
  };
}

router.get('/categories', (_req, res) => {
  res.json({ ok: true, categories: MEDIA_CATEGORIES });
});

router.get('/files/:dir/:name', (req, res) => {
  const rel = `${req.params.dir}/${req.params.name}`;
  const full = resolveUploadPath(`/api/media/files/${rel}`);
  if (!full) return res.status(404).end();
  res.sendFile(full);
});

router.get('/folders', async (req, res) => {
  try {
    const where = {};
    if (req.query.creatorId) where.creatorId = String(req.query.creatorId);
    if (req.query.parentId === 'root') where.parentId = null;
    else if (req.query.parentId) where.parentId = String(req.query.parentId);

    const rows = await prisma.mediaFolder.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { assets: true, children: true } } },
    });
    res.json({ ok: true, folders: rows.map(toFolderDto) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/folders', async (req, res) => {
  try {
    const { creatorId, name, parentId } = req.body ?? {};
    if (!creatorId || !name?.trim()) {
      return res.status(400).json({ ok: false, error: 'creatorId und name erforderlich' });
    }
    const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
    if (!creator) return res.status(404).json({ ok: false, error: 'Creator nicht gefunden' });

    const row = await prisma.mediaFolder.create({
      data: {
        creatorId,
        name: name.trim(),
        parentId: parentId || null,
      },
      include: { _count: { select: { assets: true, children: true } } },
    });
    res.status(201).json({ ok: true, folder: toFolderDto(row) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.patch('/folders/:id', async (req, res) => {
  try {
    const data = {};
    if (req.body?.name != null) data.name = String(req.body.name).trim();
    if (req.body?.parentId !== undefined) data.parentId = req.body.parentId || null;
    const row = await prisma.mediaFolder.update({
      where: { id: req.params.id },
      data,
      include: { _count: { select: { assets: true, children: true } } },
    });
    res.json({ ok: true, folder: toFolderDto(row) });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ ok: false, error: error.message });
  }
});

router.delete('/folders/:id', async (req, res) => {
  try {
    await prisma.mediaFolder.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ ok: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.creatorId) where.creatorId = String(req.query.creatorId);
    if (req.query.category) where.category = String(req.query.category);
    if (req.query.folderId === 'root') where.folderId = null;
    else if (req.query.folderId) where.folderId = String(req.query.folderId);
    if (req.query.q) {
      where.OR = [
        { title: { contains: String(req.query.q), mode: 'insensitive' } },
        { filename: { contains: String(req.query.q), mode: 'insensitive' } },
      ];
    }

    const rows = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(req.query.limit) || 200, 500),
    });
    res.json({ ok: true, items: rows.map(toDto) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/upload', async (req, res) => {
  try {
    const { creatorId, dataUrl, filename, category = 'feed', title = '', folderId } = req.body ?? {};
    if (!creatorId) return res.status(400).json({ ok: false, error: 'creatorId erforderlich' });
    if (!dataUrl) return res.status(400).json({ ok: false, error: 'dataUrl erforderlich' });

    const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
    if (!creator) return res.status(404).json({ ok: false, error: 'Creator nicht gefunden' });

    const stored = saveDataUrl(dataUrl, filename);
    const row = await prisma.mediaAsset.create({
      data: {
        creatorId,
        folderId: folderId || null,
        filename: filename || 'upload',
        url: stored.url,
        mimeType: stored.mimeType,
        category: MEDIA_CATEGORIES.some((c) => c.id === category) ? category : 'feed',
        title: title || filename || 'Upload',
        fileSize: stored.fileSize,
      },
    });
    res.status(201).json({ ok: true, item: toDto(row) });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const data = {};
    if (req.body?.title != null) data.title = String(req.body.title);
    if (req.body?.category != null) {
      data.category = MEDIA_CATEGORIES.some((c) => c.id === req.body.category)
        ? req.body.category
        : 'feed';
    }
    if (req.body?.folderId !== undefined) data.folderId = req.body.folderId || null;
    const row = await prisma.mediaAsset.update({ where: { id: req.params.id }, data });
    res.json({ ok: true, item: toDto(row) });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ ok: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ ok: false, error: 'Nicht gefunden' });
    deleteStoredFile(row.url);
    await prisma.mediaAsset.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;