ALTER TABLE "correspondants"
ADD COLUMN "speciality" TEXT,
ADD COLUMN "patientslist" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "correspondants"
ALTER COLUMN "patientslist" DROP DEFAULT;
