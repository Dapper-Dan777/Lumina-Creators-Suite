-- CreateTable
CREATE TABLE "ScoutSearch" (
    "id" TEXT NOT NULL,
    "brief" TEXT NOT NULL DEFAULT '',
    "niche" TEXT,
    "region" TEXT,
    "minFollowers" INTEGER,
    "maxFollowers" INTEGER,
    "ofFilter" TEXT NOT NULL DEFAULT 'any',
    "platforms" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "queries" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutLead" (
    "id" TEXT NOT NULL,
    "searchId" TEXT,
    "displayName" TEXT NOT NULL,
    "handle" TEXT,
    "platform" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "onlyfansUrl" TEXT,
    "hasOnlyfans" BOOLEAN NOT NULL DEFAULT false,
    "followers" INTEGER,
    "engagement" DOUBLE PRECISION,
    "niche" TEXT,
    "region" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreReason" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "signals" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT NOT NULL DEFAULT '',
    "aiSummary" TEXT NOT NULL DEFAULT '',
    "outreachDraft" TEXT NOT NULL DEFAULT '',
    "rawData" JSONB,
    "creatorId" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutLead_pkey" PRIMARY KEY ("id")
);

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

-- AddForeignKey
ALTER TABLE "ScoutLead" ADD CONSTRAINT "ScoutLead_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "ScoutSearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;