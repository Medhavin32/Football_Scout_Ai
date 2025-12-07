-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('VIEWED', 'INTERESTED', 'SELECTED', 'REJECTED');

-- CreateTable
CREATE TABLE "VideoSelection" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "status" "SelectionStatus" NOT NULL DEFAULT 'VIEWED',
    "clubName" TEXT,
    "comments" TEXT,
    "selectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoSelection_videoId_scoutId_key" ON "VideoSelection"("videoId", "scoutId");

-- CreateIndex
CREATE INDEX "VideoSelection_videoId_idx" ON "VideoSelection"("videoId");

-- CreateIndex
CREATE INDEX "VideoSelection_scoutId_idx" ON "VideoSelection"("scoutId");

-- AddForeignKey
ALTER TABLE "VideoSelection" ADD CONSTRAINT "VideoSelection_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "UploadedVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSelection" ADD CONSTRAINT "VideoSelection_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

