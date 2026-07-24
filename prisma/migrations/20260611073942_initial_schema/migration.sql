-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'specialist', 'admin');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('support', 'verification', 'operations', 'super_admin');

-- CreateEnum
CREATE TYPE "SpecialistApprovalStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('towing', 'jump_start', 'flat_tire', 'vehicle_lockout', 'fuel_delivery', 'mobile_mechanic_diagnostics', 'minor_roadside_repair');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('created', 'open', 'accepted', 'en_route', 'arrived', 'diagnosing', 'completed', 'unable_to_complete', 'cancelled', 'unmatched');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('customer_sign_in');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "adminRole" "AdminRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'customer_sign_in',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceArea" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialistProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvalStatus" "SpecialistApprovalStatus" NOT NULL DEFAULT 'draft',
    "approvedCategories" "ServiceCategory"[],
    "approvedServiceAreaIds" TEXT[],
    "available" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialistProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistanceRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "specialistId" TEXT,
    "serviceCategory" "ServiceCategory" NOT NULL,
    "serviceAreaId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'created',
    "coarseArea" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "OtpChallenge_phoneNumber_purpose_createdAt_idx" ON "OtpChallenge"("phoneNumber", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceArea_cityId_name_key" ON "ServiceArea"("cityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialistProfile_userId_key" ON "SpecialistProfile"("userId");

-- CreateIndex
CREATE INDEX "AssistanceRequest_status_serviceCategory_serviceAreaId_idx" ON "AssistanceRequest"("status", "serviceCategory", "serviceAreaId");

-- CreateIndex
CREATE INDEX "AssistanceRequest_customerId_idx" ON "AssistanceRequest"("customerId");

-- CreateIndex
CREATE INDEX "AssistanceRequest_specialistId_idx" ON "AssistanceRequest"("specialistId");

-- AddForeignKey
ALTER TABLE "ServiceArea" ADD CONSTRAINT "ServiceArea_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistProfile" ADD CONSTRAINT "SpecialistProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES "ServiceArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
