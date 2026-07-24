ALTER TABLE "User"
  ALTER COLUMN "phoneNumber" DROP NOT NULL,
  ADD COLUMN "email" TEXT;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "AdminEmailOtpChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminEmailOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminEmailOtpChallenge_email_createdAt_idx" ON "AdminEmailOtpChallenge"("email", "createdAt");
CREATE INDEX "AdminEmailOtpChallenge_expiresAt_idx" ON "AdminEmailOtpChallenge"("expiresAt");
