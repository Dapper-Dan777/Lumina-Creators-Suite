import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDefaultDatabaseUrl() {
  // Vercel: immer eingebaute SQLite — kein Neon/Postgres nötig
  if (process.env.VERCEL) {
    return 'file:/tmp/lumina.db';
  }

  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const dataDir = path.join(__dirname, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  return `file:${path.join(dataDir, 'lumina.db')}`;
}

export const databaseUrl = resolveDefaultDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}