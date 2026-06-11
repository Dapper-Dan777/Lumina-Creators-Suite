-- AlterTable
ALTER TABLE "Creator" ADD COLUMN "onlyfansAccountId" TEXT;
ALTER TABLE "Creator" ADD COLUMN "onlyfansUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Creator_onlyfansAccountId_key" ON "Creator"("onlyfansAccountId");