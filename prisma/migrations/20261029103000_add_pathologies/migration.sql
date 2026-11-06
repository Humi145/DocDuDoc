CREATE TABLE "pathologies" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "followUp" TEXT,
    "speciality" TEXT,
    "patients" TEXT[] NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "pathologies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pathologies_userId_idx" ON "pathologies"("userId");

ALTER TABLE "pathologies"
ADD CONSTRAINT "pathologies_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
