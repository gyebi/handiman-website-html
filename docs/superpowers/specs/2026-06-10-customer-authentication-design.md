# Customer Authentication Design

Date: 2026-06-10

## Summary

Implement customer authentication with phone OTP. Africa's Talking sends real OTP SMS messages, Firebase Authentication remains the client identity/session engine, and Neon Postgres stores application user records plus short-lived OTP challenge records.

This slice is customer-only. Specialist and admin authentication will reuse the same identity foundation later, but specialist approval and admin MFA are separate implementation slices.

## Goals

- Let a customer sign in with a phone number and OTP.
- Avoid Firebase Phone Auth SMS costs by sending OTP through Africa's Talking.
- Keep Africa's Talking and Firebase Admin secrets server-only.
- Give the browser a Firebase Auth session after OTP verification.
- Store app data in hosted Postgres, not only on the local machine.
- Keep the OTP implementation provider-independent enough to swap SMS providers later.

## Non-Goals

- Specialist onboarding or approval.
- Admin login or MFA.
- Request draft persistence.
- Media uploads.
- Payments, chat, maps, or notifications beyond OTP SMS.

## Architecture

The auth flow uses three layers:

- Client UI: phone entry, OTP entry, resend cooldown, loading, and error states.
- Backend auth API: creates OTP challenges, verifies submitted OTP codes, sends SMS through an adapter, creates or resolves users, and returns Firebase custom tokens.
- Data layer: stores users and OTP challenges in Neon Postgres through Prisma.

Firebase Auth is not responsible for sending OTP in this design. Firebase Auth starts after OTP verification, when the backend issues a Firebase custom token through Firebase Admin.

## Data Model

Add app-owned identity fields to the Prisma schema:

- `User.id`: internal application ID.
- `User.firebaseUid`: unique Firebase UID, nullable only during migration if needed.
- `User.phoneNumber`: normalized E.164 phone number, unique.
- `User.role`: customer, specialist, or admin.
- `User.createdAt` and `User.updatedAt`.

Add an OTP challenge model:

- `OtpChallenge.id`: internal ID.
- `OtpChallenge.phoneNumber`: normalized E.164 phone number.
- `OtpChallenge.codeHash`: hash of the OTP code.
- `OtpChallenge.purpose`: sign-in for this slice.
- `OtpChallenge.expiresAt`: short expiry timestamp.
- `OtpChallenge.consumedAt`: set after successful verification.
- `OtpChallenge.attemptCount`: failed verification count.
- `OtpChallenge.resendAvailableAt`: cooldown timestamp.
- `OtpChallenge.createdAt` and `OtpChallenge.updatedAt`.

Do not store plaintext OTP codes.

## API Flow

### Start OTP

Endpoint: `POST /api/auth/customer/start`

Input:

- `phoneNumber`

Behavior:

- Normalize and validate the phone number.
- Enforce resend cooldown and basic rate limits.
- Generate a random 6-digit OTP.
- Store only the OTP hash and challenge metadata.
- Send the OTP through Africa's Talking using a server-only adapter.
- Return a challenge ID, masked phone number, and resend cooldown metadata.

### Verify OTP

Endpoint: `POST /api/auth/customer/verify`

Input:

- `challengeId`
- `code`

Behavior:

- Load an unexpired, unconsumed challenge.
- Reject if attempt limits are exceeded.
- Compare the submitted code to the stored hash.
- Mark the challenge consumed on success.
- Create or resolve the customer user by normalized phone number.
- Create or resolve the Firebase user.
- Issue a Firebase custom token.
- Return the custom token and basic user profile.

The browser signs in with Firebase using the returned custom token.

## Provider Boundaries

Create provider-independent interfaces for:

- OTP code generation.
- OTP hashing and comparison.
- SMS delivery.
- Firebase custom-token issuing.
- User lookup and creation.

The Africa's Talking implementation lives only on the server. Browser bundles must not import Africa's Talking credentials or server modules.

## Error Handling

User-facing errors should be direct and non-leaky:

- Invalid phone number.
- Could not send code. Try again.
- Code expired. Request a new code.
- Incorrect code.
- Too many attempts. Request a new code later.
- Please wait before requesting another code.

Server logs may include provider error codes, but must not log OTP codes or secret values.

## Security

- Generate OTP codes server-side with a cryptographically strong random source.
- Hash OTP codes before storing them.
- Expire OTP challenges quickly.
- Enforce attempt limits and resend cooldowns.
- Rate limit OTP start and verify endpoints by phone number and request source.
- Keep Africa's Talking, Firebase Admin, and database credentials in App Hosting secrets.
- Never expose OTP provider calls to the client.
- Use Firebase UID as a unique external identity reference, while keeping internal app IDs for domain records.

## Testing

Add focused tests before implementation:

- Phone number validation accepts valid Ghanaian E.164-style input and rejects invalid input.
- OTP challenges store hashes, not plaintext codes.
- Expired, consumed, and over-attempt challenges are rejected.
- Successful verification consumes the challenge.
- Existing customers are reused by phone number.
- New customers are created with role `customer`.
- SMS adapter is not imported by client modules.
- Firebase custom-token issuance is called only after OTP verification succeeds.

## Deployment Requirements

Before end-to-end production testing:

- Create a Neon Postgres database and set production `DATABASE_URL`.
- Add Africa's Talking credentials to App Hosting secrets.
- Add Firebase Admin credentials to App Hosting secrets.
- Keep Firebase App Hosting as the primary deployment target because auth requires backend API routes.

Classic static Firebase Hosting is no longer sufficient once auth APIs are active.

## Open Follow-Ups

- Specialist login can reuse the OTP foundation with different post-login routing and approval checks.
- Admin login needs stronger controls and MFA.
- Request persistence should follow customer authentication so saved requests are tied to verified users.
- Uploads and private media storage remain separate future slices.
