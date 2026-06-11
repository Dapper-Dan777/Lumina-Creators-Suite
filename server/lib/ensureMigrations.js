import { prisma } from '../db.js';

let ready = false;

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS "Creator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "niche" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "revenueShare" INTEGER NOT NULL DEFAULT 70,
    "monthlyRevenue" INTEGER NOT NULL DEFAULT 0,
    "monthlyGoal" INTEGER NOT NULL DEFAULT 0,
    "subscribers" INTEGER NOT NULL DEFAULT 0,
    "growth" REAL NOT NULL DEFAULT 0,
    "team" TEXT NOT NULL DEFAULT '[]',
    "joinedAt" TEXT NOT NULL,
    "contractEndsAt" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "trend" TEXT NOT NULL DEFAULT '[]',
    "onlyfansUrl" TEXT,
    "onlyfansAccountId" TEXT,
    "onlyfansUsername" TEXT,
    "headerUrl" TEXT,
    "avatarSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "ContentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledFor" DATETIME NOT NULL,
    "price" INTEGER,
    "cover" TEXT NOT NULL DEFAULT 'linear-gradient(135deg,#ec4899,#22d3ee)',
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MediaFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("parentId") REFERENCES "MediaFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "folderId" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "category" TEXT NOT NULL DEFAULT 'feed',
    "title" TEXT NOT NULL DEFAULT '',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("folderId") REFERENCES "MediaFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ScoutSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brief" TEXT NOT NULL DEFAULT '',
    "niche" TEXT,
    "region" TEXT,
    "minFollowers" INTEGER,
    "maxFollowers" INTEGER,
    "ofFilter" TEXT NOT NULL DEFAULT 'any',
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "queries" TEXT NOT NULL DEFAULT '[]',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "ScoutLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "searchId" TEXT,
    "displayName" TEXT NOT NULL,
    "handle" TEXT,
    "platform" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "onlyfansUrl" TEXT,
    "hasOnlyfans" BOOLEAN NOT NULL DEFAULT false,
    "followers" INTEGER,
    "engagement" REAL,
    "niche" TEXT,
    "region" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreReason" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "signals" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT NOT NULL DEFAULT '',
    "aiSummary" TEXT NOT NULL DEFAULT '',
    "outreachDraft" TEXT NOT NULL DEFAULT '',
    "rawData" TEXT,
    "creatorId" TEXT,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("searchId") REFERENCES "ScoutSearch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Creator_onlyfansAccountId_key" ON "Creator"("onlyfansAccountId");
CREATE INDEX IF NOT EXISTS "ContentItem_creatorId_scheduledFor_idx" ON "ContentItem"("creatorId", "scheduledFor");
CREATE INDEX IF NOT EXISTS "ContentItem_status_idx" ON "ContentItem"("status");
CREATE INDEX IF NOT EXISTS "MediaFolder_creatorId_parentId_idx" ON "MediaFolder"("creatorId", "parentId");
CREATE INDEX IF NOT EXISTS "MediaAsset_creatorId_category_idx" ON "MediaAsset"("creatorId", "category");
CREATE INDEX IF NOT EXISTS "MediaAsset_creatorId_folderId_idx" ON "MediaAsset"("creatorId", "folderId");
CREATE INDEX IF NOT EXISTS "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");
CREATE INDEX IF NOT EXISTS "ScoutSearch_status_idx" ON "ScoutSearch"("status");
CREATE INDEX IF NOT EXISTS "ScoutSearch_createdAt_idx" ON "ScoutSearch"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ScoutLead_profileUrl_key" ON "ScoutLead"("profileUrl");
CREATE INDEX IF NOT EXISTS "ScoutLead_status_idx" ON "ScoutLead"("status");
CREATE INDEX IF NOT EXISTS "ScoutLead_score_idx" ON "ScoutLead"("score");
CREATE INDEX IF NOT EXISTS "ScoutLead_platform_idx" ON "ScoutLead"("platform");
CREATE INDEX IF NOT EXISTS "ScoutLead_hasOnlyfans_idx" ON "ScoutLead"("hasOnlyfans");
CREATE INDEX IF NOT EXISTS "ScoutLead_searchId_idx" ON "ScoutLead"("searchId");
`;

export async function runMigrationsIfNeeded() {
  if (ready) return;

  const existing = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Creator'",
  );
  if (Array.isArray(existing) && existing.length > 0) {
    ready = true;
    return;
  }

  for (const statement of INIT_SQL.split(';')) {
    const sql = statement.trim();
    if (!sql) continue;
    await prisma.$executeRawUnsafe(sql);
  }

  ready = true;
}