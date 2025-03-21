-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDay" TIMESTAMP(3),
ADD COLUMN     "clerkId" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "googleScopes" TEXT[],
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "publicMetadata" JSONB;
