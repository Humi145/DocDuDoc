CREATE TABLE "correspondants" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "correspondants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "correspondants_userId_email_key"
ON "correspondants"("userId", "email");

CREATE INDEX "correspondants_userId_idx"
ON "correspondants"("userId");

ALTER TABLE "correspondants"
ADD CONSTRAINT "correspondants_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
