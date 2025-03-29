-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'SCOUT');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'PROCESSING', 'ANALYZED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "playerProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "club" TEXT,
    "nationality" TEXT,
    "speed" DOUBLE PRECISION,
    "dribbling" DOUBLE PRECISION,
    "passing" DOUBLE PRECISION,
    "shooting" DOUBLE PRECISION,
    "defending" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedVideo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerProfileId" TEXT,
    "videoUrl" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysisData" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "detectedPlayerId" TEXT NOT NULL,
    "trackingData" JSONB NOT NULL,
    "keyEvents" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysisData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetrics" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "dribbling" DOUBLE PRECISION NOT NULL,
    "passing" DOUBLE PRECISION NOT NULL,
    "shooting" DOUBLE PRECISION NOT NULL,
    "agility" DOUBLE PRECISION NOT NULL,
    "stamina" DOUBLE PRECISION NOT NULL,
    "intelligence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutReport" (
    "id" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_userId_key" ON "PlayerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AIAnalysisData_videoId_key" ON "AIAnalysisData"("videoId");

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedVideo" ADD CONSTRAINT "UploadedVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedVideo" ADD CONSTRAINT "UploadedVideo_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysisData" ADD CONSTRAINT "AIAnalysisData_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "UploadedVideo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMetrics" ADD CONSTRAINT "PerformanceMetrics_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReport" ADD CONSTRAINT "ScoutReport_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReport" ADD CONSTRAINT "ScoutReport_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
