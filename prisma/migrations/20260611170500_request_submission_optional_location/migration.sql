-- Align persisted requests with the draft flow: service area assignment and
-- precise coordinates can be filled after the customer submits the request.
ALTER TABLE "AssistanceRequest" DROP CONSTRAINT "AssistanceRequest_serviceAreaId_fkey";

ALTER TABLE "AssistanceRequest"
  ALTER COLUMN "serviceAreaId" DROP NOT NULL,
  ALTER COLUMN "latitude" DROP NOT NULL,
  ALTER COLUMN "longitude" DROP NOT NULL,
  ADD COLUMN "vehicleDescription" TEXT NOT NULL DEFAULT '';

ALTER TABLE "AssistanceRequest"
  ALTER COLUMN "vehicleDescription" DROP DEFAULT;

ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_serviceAreaId_fkey"
  FOREIGN KEY ("serviceAreaId") REFERENCES "ServiceArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
