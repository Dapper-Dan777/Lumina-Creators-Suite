-- CreateTable
CREATE TABLE "Creator" (
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
    "team" JSONB NOT NULL DEFAULT [],
    "joinedAt" TEXT NOT NULL,
    "contractEndsAt" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "trend" JSONB NOT NULL DEFAULT [],
    "onlyfansUrl" TEXT,
    "onlyfansAccountId" TEXT,
    "onlyfansUsername" TEXT,
    "headerUrl" TEXT,
    "avatarSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContentItem" (
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
    CONSTRAINT "ContentItem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaFolder_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaAsset" (
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
    CONSTRAINT "MediaAsset_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MediaFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoutSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brief" TEXT NOT NULL DEFAULT '',
    "niche" TEXT,
    "region" TEXT,
    "minFollowers" INTEGER,
    "maxFollowers" INTEGER,
    "ofFilter" TEXT NOT NULL DEFAULT 'any',
    "platforms" JSONB NOT NULL DEFAULT [],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "queries" JSONB NOT NULL DEFAULT [],
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScoutLead" (
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
    "signals" JSONB NOT NULL DEFAULT [],
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT NOT NULL DEFAULT '',
    "aiSummary" TEXT NOT NULL DEFAULT '',
    "outreachDraft" TEXT NOT NULL DEFAULT '',
    "rawData" JSONB,
    "creatorId" TEXT,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScoutLead_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "ScoutSearch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Creator_onlyfansAccountId_key" ON "Creator"("onlyfansAccountId");

-- CreateIndex
CREATE INDEX "ContentItem_creatorId_scheduledFor_idx" ON "ContentItem"("creatorId", "scheduledFor");

-- CreateIndex
CREATE INDEX "ContentItem_status_idx" ON "ContentItem"("status");

-- CreateIndex
CREATE INDEX "MediaFolder_creatorId_parentId_idx" ON "MediaFolder"("creatorId", "parentId");

-- CreateIndex
CREATE INDEX "MediaAsset_creatorId_category_idx" ON "MediaAsset"("creatorId", "category");

-- CreateIndex
CREATE INDEX "MediaAsset_creatorId_folderId_idx" ON "MediaAsset"("creatorId", "folderId");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "ScoutSearch_status_idx" ON "ScoutSearch"("status");

-- CreateIndex
CREATE INDEX "ScoutSearch_createdAt_idx" ON "ScoutSearch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutLead_profileUrl_key" ON "ScoutLead"("profileUrl");

-- CreateIndex
CREATE INDEX "ScoutLead_status_idx" ON "ScoutLead"("status");

-- CreateIndex
CREATE INDEX "ScoutLead_score_idx" ON "ScoutLead"("score");

-- CreateIndex
CREATE INDEX "ScoutLead_platform_idx" ON "ScoutLead"("platform");

-- CreateIndex
CREATE INDEX "ScoutLead_hasOnlyfans_idx" ON "ScoutLead"("hasOnlyfans");

-- CreateIndex
CREATE INDEX "ScoutLead_searchId_idx" ON "ScoutLead"("searchId");
