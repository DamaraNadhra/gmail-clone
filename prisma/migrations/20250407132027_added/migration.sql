-- AlterTable
ALTER TABLE "file" ALTER COLUMN "fileFormatType" SET DEFAULT 'other',
ALTER COLUMN "fileContentType" SET DEFAULT 'other';

-- CreateTable
CREATE TABLE "thread" (
    "id" TEXT NOT NULL,
    "snippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thread_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
