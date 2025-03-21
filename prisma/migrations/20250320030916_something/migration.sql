/*
  Warnings:

  - You are about to drop the column `clerkId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emailPersonId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `email_person` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "EmailComposeDraft" DROP CONSTRAINT "EmailComposeDraft_emailFromId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_emailPersonId_fkey";

-- DropIndex
DROP INDEX "User_emailPersonId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "clerkId",
DROP COLUMN "emailPersonId";

-- CreateIndex
CREATE UNIQUE INDEX "email_person_userId_key" ON "email_person"("userId");

-- AddForeignKey
ALTER TABLE "email_person" ADD CONSTRAINT "email_person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailComposeDraft" ADD CONSTRAINT "EmailComposeDraft_emailFromId_fkey" FOREIGN KEY ("emailFromId") REFERENCES "email_person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
