-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'PENDING', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentPhotos" TEXT[],
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verificationRemarks" TEXT,
ADD COLUMN     "verifiedBy" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

