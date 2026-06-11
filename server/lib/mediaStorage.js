import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT ??
  (process.env.VERCEL
    ? path.join(os.tmpdir(), 'lumina-uploads')
    : path.join(__dirname, '..', 'data', 'uploads'));

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function saveDataUrl(dataUrl, originalName = 'upload') {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    const err = new Error('Ungültiges Bildformat — nur data-URL base64');
    err.status = 400;
    throw err;
  }

  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 12 * 1024 * 1024) {
    const err = new Error('Datei zu groß (max 12 MB)');
    err.status = 400;
    throw err;
  }

  const ext =
    mime.includes('png') ? 'png' :
    mime.includes('webp') ? 'webp' :
    mime.includes('gif') ? 'gif' :
    'jpg';

  const id = randomUUID();
  const dir = path.join(UPLOAD_ROOT, id.slice(0, 2));
  ensureDir(dir);
  const filename = `${id}.${ext}`;
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, buffer);

  return {
    storagePath: fullPath,
    url: `/api/media/files/${id.slice(0, 2)}/${filename}`,
    mimeType: mime,
    fileSize: buffer.length,
  };
}

export function deleteStoredFile(url) {
  if (!url?.startsWith('/api/media/files/')) return;
  const rel = url.replace('/api/media/files/', '');
  const full = path.join(UPLOAD_ROOT, rel);
  if (fs.existsSync(full)) fs.unlinkSync(full);
}

export function resolveUploadPath(url) {
  if (!url?.startsWith('/api/media/files/')) return null;
  const rel = url.replace('/api/media/files/', '');
  const full = path.join(UPLOAD_ROOT, rel);
  return fs.existsSync(full) ? full : null;
}