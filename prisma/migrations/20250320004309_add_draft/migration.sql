-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "threadId" TEXT;

-- AlterTable
ALTER TABLE "EmailToEmail" ADD COLUMN     "composeDraftId" TEXT;

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailComposeDraft" (
    "id" TEXT NOT NULL,
    "emailFromId" TEXT NOT NULL,
    "emailSubject" TEXT NOT NULL,
    "emailContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailComposeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailComposeDraft_emailFromId_idx" ON "EmailComposeDraft"("emailFromId");

-- CreateIndex
CREATE INDEX "Email_threadId_idx" ON "Email"("threadId");

-- CreateIndex
CREATE INDEX "Email_emailFromId_idx" ON "Email"("emailFromId");

-- CreateIndex
CREATE INDEX "EmailToEmail_emailId_idx" ON "EmailToEmail"("emailId");

-- CreateIndex
CREATE INDEX "EmailToEmail_emailPersonId_idx" ON "EmailToEmail"("emailPersonId");

-- CreateIndex
CREATE INDEX "EmailToEmail_composeDraftId_idx" ON "EmailToEmail"("composeDraftId");

-- CreateIndex
CREATE INDEX "email_person_email_idx" ON "email_person"("email");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToEmail" ADD CONSTRAINT "EmailToEmail_composeDraftId_fkey" FOREIGN KEY ("composeDraftId") REFERENCES "EmailComposeDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailComposeDraft" ADD CONSTRAINT "EmailComposeDraft_emailFromId_fkey" FOREIGN KEY ("emailFromId") REFERENCES "email_person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
