/*
  Warnings:

  - You are about to drop the column `isArchived` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `isDraft` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `isImportant` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `isSent` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `isSpam` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `isStarred` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `isTrash` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the `Thread` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `thread_participant` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `threadId` on table `Email` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "FileFormatType" AS ENUM ('image', 'video', 'html', 'pdf', 'word', 'pptx', 'spreadsheet', 'other');

-- CreateEnum
CREATE TYPE "FileContent" AS ENUM ('lpLetter', 'onePager', 'emailAttachment', 'deck', 'logo', 'email', 'other', 'avatar', 'zoomRecording', 'zoomTranscript');

-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_threadId_fkey";

-- DropForeignKey
ALTER TABLE "thread_participant" DROP CONSTRAINT "thread_participant_emailPersonId_fkey";

-- DropForeignKey
ALTER TABLE "thread_participant" DROP CONSTRAINT "thread_participant_threadId_fkey";

-- DropIndex
DROP INDEX "Email_threadId_idx";

-- AlterTable
ALTER TABLE "Email" DROP COLUMN "isArchived",
DROP COLUMN "isDraft",
DROP COLUMN "isImportant",
DROP COLUMN "isRead",
DROP COLUMN "isSent",
DROP COLUMN "isSpam",
DROP COLUMN "isStarred",
DROP COLUMN "isTrash",
ADD COLUMN     "labelIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "threadId" SET NOT NULL;

-- DropTable
DROP TABLE "Thread";

-- DropTable
DROP TABLE "thread_participant";

-- CreateTable
CREATE TABLE "file" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileId" TEXT NOT NULL,
    "downloadKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileFormatType" "FileFormatType" NOT NULL,
    "fileContentType" "FileContent" NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "emailIdForPdf" TEXT,
    "emailIdForHtml" TEXT,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_attachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "emailId" TEXT,

    CONSTRAINT "email_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_emailIdForPdf_key" ON "file"("emailIdForPdf");

-- CreateIndex
CREATE UNIQUE INDEX "file_emailIdForHtml_key" ON "file"("emailIdForHtml");

-- CreateIndex
CREATE UNIQUE INDEX "email_attachment_fileId_key" ON "email_attachment"("fileId");

-- CreateIndex
CREATE INDEX "email_attachment_emailId_idx" ON "email_attachment"("emailId");

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_emailIdForPdf_fkey" FOREIGN KEY ("emailIdForPdf") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_emailIdForHtml_fkey" FOREIGN KEY ("emailIdForHtml") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachment" ADD CONSTRAINT "email_attachment_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachment" ADD CONSTRAINT "email_attachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file"("id") ON DELETE CASCADE ON UPDATE CASCADE;
