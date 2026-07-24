# Auth And Data Provider Decisions

Date: 2026-06-10

## Decisions

- Customer authentication will use phone OTP.
- Firebase Authentication will be the app identity and client session engine.
- Africa's Talking will send OTP SMS messages.
- Neon Free is the preferred remote PostgreSQL candidate for the study/MVP database.
- No production or user data should be stored only on the local machine.

## Why Firebase Auth Still Fits

Firebase Auth gives the app a managed identity layer, stable user IDs, client session handling, and a clean path to Firebase-protected services later. The app should not use Firebase Phone Auth as the SMS sender for real OTP by default because Firebase bills real phone authentication SMS messages per send.

The intended flow is:

1. Customer enters a phone number.
2. The backend generates a short OTP.
3. The backend stores only a hashed OTP with expiry, attempt count, resend cooldown, and phone number.
4. The backend sends the OTP through Africa's Talking.
5. Customer submits the OTP.
6. The backend verifies the OTP and creates or resolves the application user.
7. The backend issues a Firebase Admin custom token.
8. The frontend signs in with the custom token and receives a Firebase Auth session.

Africa's Talking API keys must never be exposed to browser code. They belong in App Hosting secrets or the equivalent production secret store.

## Why Neon Is A Good Study-Phase Database

The project already uses Prisma with a PostgreSQL schema, so Neon is a direct fit. It keeps application data off the local machine while avoiding early Cloud SQL cost and operational weight.

As of 2026-06-10, Neon's official pricing page lists a free plan with no credit card required, 0.5 GB storage per project, 100 CU-hours monthly per project, and scale-to-zero behavior when inactive. That is appropriate for development, demos, and early validation. It is not a guarantee that the app can run production traffic forever at no cost.

Production review triggers:

- Database storage approaches the free-plan limit.
- Auth or request traffic needs always-on database responsiveness.
- The app needs stronger availability guarantees, support, backups, or compliance posture.
- Query volume or connection patterns exceed free-plan behavior.

## Current Implementation Status

- Firebase web app config exists.
- Firebase Analytics is initialized when configured.
- Firebase Auth client sign-in with custom tokens is implemented for the customer flow.
- Africa's Talking OTP delivery is implemented behind a server-only adapter.
- Prisma is configured for PostgreSQL and the schema includes customer auth persistence. Production `DATABASE_URL` must still be provided through secrets.
- Firebase Data Connect exists in the repo, but its schema is still generated sample content and should not be treated as the active application database model.

## Next Implementation Slice

Design and implement customer authentication first:

- Add provider-independent OTP domain rules.
- Add a server-only OTP adapter boundary.
- Add an Africa's Talking OTP sender implementation behind that boundary.
- Add Firebase custom-token issuance after successful OTP verification.
- Add customer sign-in UI states for phone entry, OTP entry, resend cooldown, success, and errors.
- Keep tests focused on OTP validation, rate limits, secret isolation, and Firebase session handoff.
