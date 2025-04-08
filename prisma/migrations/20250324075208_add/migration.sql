/*
  Warnings:

  - You are about to drop the `_ThreadToemail_person` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ThreadToemail_person" DROP CONSTRAINT "_ThreadToemail_person_A_fkey";

-- DropForeignKey
ALTER TABLE "_ThreadToemail_person" DROP CONSTRAINT "_ThreadToemail_person_B_fkey";

-- DropTable
DROP TABLE "_ThreadToemail_person";

-- CreateTable
CREATE TABLE "thread_participant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "emailPersonId" TEXT NOT NULL,

    CONSTRAINT "thread_participant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thread_participant_threadId_id_idx" ON "thread_participant"("threadId", "id");

-- AddForeignKey
ALTER TABLE "thread_participant" ADD CONSTRAINT "thread_participant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_participant" ADD CONSTRAINT "thread_participant_emailPersonId_fkey" FOREIGN KEY ("emailPersonId") REFERENCES "email_person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
