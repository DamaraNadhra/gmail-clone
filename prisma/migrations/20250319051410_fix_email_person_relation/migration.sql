/*
  Warnings:

  - You are about to drop the column `userId` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `email_person` table. All the data in the column will be lost.
  - You are about to drop the `_EmailTo` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[emailPersonId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `email_person` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_emailFromId_fkey";

-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_userId_fkey";

-- DropForeignKey
ALTER TABLE "_EmailTo" DROP CONSTRAINT "_EmailTo_A_fkey";

-- DropForeignKey
ALTER TABLE "_EmailTo" DROP CONSTRAINT "_EmailTo_B_fkey";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Email" DROP COLUMN "userId",
ALTER COLUMN "emailFromId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
ADD COLUMN     "emailPersonId" TEXT;

-- AlterTable
ALTER TABLE "email_person" DROP COLUMN "updatedAt",
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

-- DropTable
DROP TABLE "_EmailTo";

-- CreateTable
CREATE TABLE "EmailToEmail" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "emailPersonId" TEXT NOT NULL,
    "isTo" BOOLEAN NOT NULL DEFAULT false,
    "isCc" BOOLEAN NOT NULL DEFAULT false,
    "isBcc" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailPersonId_key" ON "User"("emailPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "email_person_email_key" ON "email_person"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_emailPersonId_fkey" FOREIGN KEY ("emailPersonId") REFERENCES "email_person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_emailFromId_fkey" FOREIGN KEY ("emailFromId") REFERENCES "email_person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToEmail" ADD CONSTRAINT "EmailToEmail_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToEmail" ADD CONSTRAINT "EmailToEmail_emailPersonId_fkey" FOREIGN KEY ("emailPersonId") REFERENCES "email_person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
