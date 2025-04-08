-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isImportant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSpam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isStarred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTrash" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastEmailAt" TIMESTAMP(3),
ADD COLUMN     "snippet" TEXT,
ADD COLUMN     "subject" TEXT;

-- CreateTable
CREATE TABLE "_ThreadToemail_person" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ThreadToemail_person_AB_unique" ON "_ThreadToemail_person"("A", "B");

-- CreateIndex
CREATE INDEX "_ThreadToemail_person_B_index" ON "_ThreadToemail_person"("B");

-- AddForeignKey
ALTER TABLE "_ThreadToemail_person" ADD CONSTRAINT "_ThreadToemail_person_A_fkey" FOREIGN KEY ("A") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ThreadToemail_person" ADD CONSTRAINT "_ThreadToemail_person_B_fkey" FOREIGN KEY ("B") REFERENCES "email_person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
