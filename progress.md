# Project Progress

Last updated: 2026-06-11

## Current Branch State

- Branch: `main`, tracking `origin/main`.
- Working tree: customer authentication work is in progress and not committed yet.
- Baseline before auth work was green: tests, typecheck, and lint passed.
- Local environment note: this machine is running Node `v24.16.0`; `package.json` expects Node `22`, so commands show an engine warning.

## Completed In This Session

- Added customer auth domain rules:
  - Ghana phone number normalization to E.164.
  - Six-digit OTP validation.
  - Phone masking.
  - OTP policy constants.
- Added Prisma auth schema:
  - `User.firebaseUid`.
  - `OtpPurpose`.
  - `OtpChallenge`.
- Added server auth utilities:
  - OTP generation.
  - OTP hashing.
  - Timing-safe OTP comparison.
- Added customer auth service:
  - Starts OTP challenges.
  - Enforces resend cooldown.
  - Verifies OTP attempts.
  - Creates or reuses customer users.
  - Issues Firebase custom tokens through an injected provider.
- Added provider adapters:
  - Africa's Talking SMS sender.
  - Firebase custom-token JWT issuer.
- Added backend API route wiring:
  - `POST /api/auth/customer/start`
  - `POST /api/auth/customer/verify`
  - Prisma singleton and customer auth repository.
- Added customer auth UI:
  - Phone entry.
  - OTP entry.
  - Firebase custom-token sign-in helper.
  - Signed-in state.
- Updated runtime configuration docs:
  - `.env.example`
  - `apphosting.yaml`
  - `docs/auth-and-data-provider-decisions.md`
- Added Prisma PostgreSQL driver adapter:
  - `@prisma/adapter-pg@7.8.0`.
  - Prisma singleton now constructs `PrismaClient` with `new PrismaPg(databaseUrl)`.
- Configured the owner-provided Neon `DATABASE_URL` in ignored `.env.local`.
- Created and applied the initial Prisma migration to Neon:
  - `prisma/migrations/20260611073942_initial_schema/migration.sql`.

## Verification

Passing:

- `pnpm test`: 11 test files, 45 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm prisma validate`: passed.
- `pnpm prisma:generate`: passed after schema changes.
- `pnpm prisma:migrate --name initial_schema`: applied the initial schema to Neon.
- `pnpm build`: passed after adding the Prisma PostgreSQL adapter.

Build status:

- First `pnpm build` failed in the sandbox because Turbopack was denied worker/port behavior.
- Rerunning build outside the sandbox initially exposed a real Prisma adapter issue.
- That issue is now resolved with `@prisma/adapter-pg@7.8.0`.
- Latest build passed and lists the customer auth API routes as dynamic server-rendered endpoints.

## Resolved Build Blocker

`src/server/db/prisma.ts` previously constructed:

```ts
new PrismaClient()
```

With Prisma 7.8.0 this fails during build/runtime with:

```text
PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions
```

Resolved by:

- Adding exact dependency `@prisma/adapter-pg@7.8.0`.
- Updating `src/server/db/prisma.ts` to construct Prisma with a Postgres adapter using `process.env.DATABASE_URL` and a local fallback URL.

## Next Steps

1. Review `next-env.d.ts`; it was modified by Next tooling and should only be kept if the generated change is expected.
2. Commit the completed customer auth slice.
3. Configure the Neon `DATABASE_URL` in Firebase App Hosting secrets.
4. Configure remaining real owner-provided values from `dependency-report.md`.

## Companion Reports

- `dependency-report.md` tracks owner-provided accounts, secrets, runtime requirements, and pending service decisions.
