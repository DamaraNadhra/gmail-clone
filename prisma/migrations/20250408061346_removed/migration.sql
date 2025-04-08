/*
  Warnings:

  - You are about to drop the column `composeDraftId` on the `EmailToEmail` table. All the data in the column will be lost.
  - You are about to drop the `EmailComposeDraft` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `emailId` on table `EmailToEmail` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "EmailComposeDraft" DROP CONSTRAINT "EmailComposeDraft_emailFromId_fkey";

-- DropForeignKey
ALTER TABLE "EmailToEmail" DROP CONSTRAINT "EmailToEmail_composeDraftId_fkey";

-- DropIndex
DROP INDEX "EmailToEmail_composeDraftId_idx";

-- AlterTable
ALTER TABLE "EmailToEmail" DROP COLUMN "composeDraftId",
ALTER COLUMN "emailId" SET NOT NULL;

-- DropTable
DROP TABLE "EmailComposeDraft";
