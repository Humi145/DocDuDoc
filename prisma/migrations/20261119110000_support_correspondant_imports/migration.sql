ALTER TABLE "correspondants"
ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "correspondants"
ADD COLUMN "sourceId" TEXT;

CREATE UNIQUE INDEX "correspondants_userId_sourceId_key"
ON "correspondants"("userId", "sourceId");
