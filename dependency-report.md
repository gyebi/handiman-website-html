# Project Dependency Report

Last updated: 2026-06-11

This report tracks what the project needs from the owner to keep implementation moving. Do not put real secrets in this file.

## Needed From Owner

### Local Development Dependencies

- Node.js:
  - Project expects: Node `22`.
  - Current observed environment: Node `v22.22.3` through NVM.
  - Status: working and aligned with App Hosting `nodejs22`.
  - Recommended action: use `nvm use 22` for project work.

- Package manager:
  - Project expects: `pnpm@9.15.4`.
  - Current workaround: Corepack is using a `/tmp` cache because the default home cache was not writable.

  - Status: working.

### Deployment Configuration

- Firebase App Hosting secrets:
  - Add Neon, Africa's Talking, and Firebase runtime secrets to App Hosting secret manager.
  - Status: configured in Secret Manager for the current App Hosting backend. Do not commit or paste the secret values.

### Product Inputs Needed

- Specialist workflow:
  - Needed next: make sure `winfredgyebi@gmail.com` exists as a Firebase Authentication email/password user.
  - Current status: specialist OTP self sign-in, specialist profile coverage, admin approval, online/offline availability, matching queue, and atomic accept endpoints are wired.
  - Service areas: initial Accra areas are seeded for MVP testing.

- Admin login:
  - Needed next: confirm Firebase Email/Password sign-in is enabled and that `winfredgyebi@gmail.com` has a Firebase password set.
  - Status: `/admin` uses Firebase email/password; backend admin APIs still verify Firebase ID tokens and check the database role.

## Completed Dependencies

- Hosted PostgreSQL database:
  - Chosen provider: Neon.
  - Database name: `neondb`.
  - Status: `DATABASE_URL` provided for local development through ignored `.env.local`; Prisma migrations applied through specialist workflow and initial service-area seed on 2026-06-11.
  - TLS: local and App Hosting `DATABASE_URL` were updated to use `sslmode=verify-full`.

- Africa's Talking account:
  - App name: `adinkra`.
  - Username: `winfredgyebi`.
  - Status: username and API key provided for local development through ignored `.env.local` and App Hosting secrets; optional sender ID not provided.
  - Used for: customer OTP SMS delivery.

- Firebase web app config:
  - Project ID: `handimanautocare`.
  - App ID: `1:410742331256:web:ab178322dce23bf3a49a8d`.
  - Auth domain: `handimanautocare.firebaseapp.com`.
  - Storage bucket: `handimanautocare.firebasestorage.app`.
  - Status: web config provided for local development through ignored `.env.local`.
  - Used for: Firebase client initialization, analytics, and browser auth handoff.

- Firebase Admin service account:
  - Project ID: `handimanautocare`.
  - Status: service account JSON found locally; Admin env vars extracted into ignored `.env.local`.
  - Used for: server-side Firebase custom-token signing for customer browser sessions.

- Admin database access:
  - Email: `winfredgyebi@gmail.com`.
  - Status: linked in Neon as `role=admin`, `adminRole=super_admin`.

## Recently Added Code Dependencies

- `@prisma/adapter-pg@7.8.0`
  - Added because Prisma 7.8.0 requires a PostgreSQL driver adapter to construct `PrismaClient`.
  - Status: installed in `package.json` and `pnpm-lock.yaml`.

- `firebase-admin@14.0.0`
  - Added to verify Firebase ID tokens on request submission APIs.
  - Status: installed in `package.json` and `pnpm-lock.yaml`.

- Specialist workflow Prisma models:
  - Added `SpecialistAvailabilityStatus`, `SpecialistCategory`, and `SpecialistServiceArea`.
  - Status: migrated in Neon.

## Owner Decisions Pending

None currently.

## Product Decisions

- Customer authentication: phone-only for MVP. Email and social login are out of scope for the current slice.
- Request submission: OTP-verified customers can submit requests; new requests start as `open` so the next specialist workflow can match against them.
- Specialist acceptance: approved online specialists can see matching open requests and atomically accept one request.
- Admin authentication: admin login uses Firebase email/password; no SMS or SMTP provider is needed.

## How To Provide Values Safely

- Put local values in `.env.local`; do not commit `.env.local`.
- Put production values in Firebase App Hosting secrets or the chosen production secret store.
- Share only placeholder names in docs and issues; never paste real API keys into markdown files.
