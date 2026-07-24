INSERT INTO "City" ("id", "name", "active", "updatedAt")
VALUES ('city_accra', 'Accra', true, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE
SET "active" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ServiceArea" ("id", "cityId", "name", "active", "updatedAt")
VALUES
  ('area_accra_central', 'city_accra', 'Accra Central', true, CURRENT_TIMESTAMP),
  ('area_east_legon', 'city_accra', 'East Legon', true, CURRENT_TIMESTAMP),
  ('area_airport_residential', 'city_accra', 'Airport Residential', true, CURRENT_TIMESTAMP),
  ('area_madina', 'city_accra', 'Madina', true, CURRENT_TIMESTAMP),
  ('area_tema', 'city_accra', 'Tema', true, CURRENT_TIMESTAMP)
ON CONFLICT ("cityId", "name") DO UPDATE
SET "active" = true,
    "updatedAt" = CURRENT_TIMESTAMP;
