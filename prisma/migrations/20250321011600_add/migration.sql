/*
  Warnings:

  - A unique constraint covering the columns `[name,email]` on the table `email_person` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "email_person_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "email_person_name_email_key" ON "email_person"("name", "email");
