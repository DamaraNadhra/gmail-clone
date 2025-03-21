/*
  Warnings:

  - Added the required column `emailSubject` to the `Email` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "emailSubject" TEXT NOT NULL;
