/*
  Warnings:

  - You are about to drop the column `email` on the `Email` table. All the data in the column will be lost.
  - Added the required column `emailContent` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emailDate` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emailFromId` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emailHtml` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emailSnippet` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Email` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Email" DROP COLUMN "email",
ADD COLUMN     "emailContent" TEXT NOT NULL,
ADD COLUMN     "emailDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "emailFromId" TEXT NOT NULL,
ADD COLUMN     "emailHtml" TEXT NOT NULL,
ADD COLUMN     "emailSnippet" TEXT NOT NULL,
ADD COLUMN     "emailToId" TEXT[],
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isImportant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSpam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isStarred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTrash" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "email_person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmailTo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_EmailTo_AB_unique" ON "_EmailTo"("A", "B");

-- CreateIndex
CREATE INDEX "_EmailTo_B_index" ON "_EmailTo"("B");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_emailFromId_fkey" FOREIGN KEY ("emailFromId") REFERENCES "email_person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmailTo" ADD CONSTRAINT "_EmailTo_A_fkey" FOREIGN KEY ("A") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmailTo" ADD CONSTRAINT "_EmailTo_B_fkey" FOREIGN KEY ("B") REFERENCES "email_person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
