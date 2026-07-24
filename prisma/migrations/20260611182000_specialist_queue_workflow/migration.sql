-- Specialist availability is explicit so approval and online state are separate.
CREATE TYPE "SpecialistAvailabilityStatus" AS ENUM ('offline', 'online');

CREATE TABLE "SpecialistCategory" (
    "id" TEXT NOT NULL,
    "specialistProfileId" TEXT NOT NULL,
    "serviceCategory" "ServiceCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialistCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpecialistServiceArea" (
    "id" TEXT NOT NULL,
    "specialistProfileId" TEXT NOT NULL,
    "serviceAreaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialistServiceArea_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SpecialistCategory" ("id", "specialistProfileId", "serviceCategory")
SELECT "id" || ':category:' || category::text, "id", category
FROM (
  SELECT "id", unnest("approvedCategories") AS category
  FROM "SpecialistProfile"
) selected_categories;

INSERT INTO "SpecialistServiceArea" ("id", "specialistProfileId", "serviceAreaId")
SELECT "id" || ':area:' || "serviceAreaId", "id", "serviceAreaId"
FROM (
  SELECT "id", unnest("approvedServiceAreaIds") AS "serviceAreaId"
  FROM "SpecialistProfile"
) selected_areas;

ALTER TABLE "SpecialistProfile"
  ADD COLUMN "availabilityStatus" "SpecialistAvailabilityStatus" NOT NULL DEFAULT 'offline';

UPDATE "SpecialistProfile"
SET "availabilityStatus" = CASE WHEN "available" THEN 'online'::"SpecialistAvailabilityStatus" ELSE 'offline'::"SpecialistAvailabilityStatus" END
WHERE "approvalStatus" = 'approved';

UPDATE "SpecialistProfile"
SET "availabilityStatus" = 'offline'
WHERE "approvalStatus" <> 'approved';

ALTER TABLE "SpecialistProfile"
  DROP COLUMN "approvedCategories",
  DROP COLUMN "approvedServiceAreaIds",
  DROP COLUMN "available";

CREATE UNIQUE INDEX "SpecialistCategory_specialistProfileId_serviceCategory_key" ON "SpecialistCategory"("specialistProfileId", "serviceCategory");
CREATE INDEX "SpecialistCategory_serviceCategory_idx" ON "SpecialistCategory"("serviceCategory");
CREATE UNIQUE INDEX "SpecialistServiceArea_specialistProfileId_serviceAreaId_key" ON "SpecialistServiceArea"("specialistProfileId", "serviceAreaId");
CREATE INDEX "SpecialistServiceArea_serviceAreaId_idx" ON "SpecialistServiceArea"("serviceAreaId");

ALTER TABLE "SpecialistCategory" ADD CONSTRAINT "SpecialistCategory_specialistProfileId_fkey"
  FOREIGN KEY ("specialistProfileId") REFERENCES "SpecialistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SpecialistServiceArea" ADD CONSTRAINT "SpecialistServiceArea_specialistProfileId_fkey"
  FOREIGN KEY ("specialistProfileId") REFERENCES "SpecialistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SpecialistServiceArea" ADD CONSTRAINT "SpecialistServiceArea_serviceAreaId_fkey"
  FOREIGN KEY ("serviceAreaId") REFERENCES "ServiceArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
