-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_threadId_fkey";

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
