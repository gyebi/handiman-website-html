# Project Status And Next Deliverables

Date: 2026-07-06

## Current Assessment

Handiman Mechanics is a web app, not a static website. It has customer, specialist, and admin workflows backed by API routes, authentication, Prisma models, and a PostgreSQL database.

The current project state is an MVP implementation snapshot. The core product direction is clear and meaningful functionality is already wired, but the codebase still needs cleanup, workflow completion, and production-readiness checks before it should be treated as a release candidate.

## Current Product Scope

- Customer phone OTP sign-in.
- Firebase custom-token browser sessions.
- Customer roadside assistance request creation.
- Specialist sign-in, profile coverage, availability, matching queue, and request acceptance.
- Admin sign-in and specialist approval actions.
- PostgreSQL persistence through Prisma.
- Firebase App Hosting configuration.

## Current Verification Baseline

- `pnpm test`: passing, 20 test files and 72 tests.
- `pnpm typecheck`: passing.
- `pnpm lint`: passing.
- `pnpm build`: passing when Turbopack is allowed to create its worker processes outside the sandbox restriction.

## Immediate Deliverables

1. Reorganize the repository into a clearer Next.js `src` layout:
   - `src/app` for Next.js pages, layouts, and route handlers.
   - `src/frontend` for browser UI components and client-only helpers.
   - `src/backend` for server-only application logic.
   - `src/domain` for shared business rules and domain types.
2. Fix the current typecheck failure.
3. Fix the current lint failures.
4. Re-run tests, typecheck, lint, and build.
5. Commit the current completed project state.

Status: completed in commit `45efaea`.

## Next Product Deliverables

1. Customer request status experience:
   - Request detail screen.
   - Request history.
   - Clear status transitions after specialist acceptance.

Status: completed in the current slice:

- Added authenticated `GET /api/customer/requests`.
- Added authenticated `GET /api/customer/requests/[requestId]`.
- Added recent request history to the customer page.
- Added `/customer/requests/[requestId]` detail view.
- Added customer-facing status labels and descriptions, including accepted-specialist state.
2. Specialist onboarding polish:
   - Better profile setup flow.
   - Clear pending-review and rejected states.
   - Admin-visible profile completeness.

Status: completed in the current slice:

- Added specialist onboarding status messaging.
- Added a coverage checklist for category, service area, and admin approval.
- Disabled online availability until the profile is complete and approved.
- Made rejected and suspended states explicit in the specialist dashboard.
- Made admin approvals show profile completeness, selected categories, and selected service areas.
- Prevented incomplete profiles from being approved in the admin UI.
- Resubmitting a draft or rejected specialist profile now moves it to pending review.
3. Location improvements:
   - Optional GPS capture.
   - Preserve the policy that precise location is revealed only to the accepted specialist.

Status: completed in the current slice:

- Added an optional "Use current GPS" control to the customer request form.
- Added clear GPS success, unavailable, denied, and removal states.
- Included precise coordinates in request submission only when the customer explicitly captures GPS.
- Kept nearest area/landmark as the required location field.
- Preserved the existing privacy policy that precise location is stored with the request and should only be exposed to the accepted specialist.
4. Operational readiness:
   - Confirm production secrets in Firebase App Hosting.
   - Validate deployment build.
   - Review database migrations against Neon.
5. Future communication features:
   - Notifications.
   - Chat or customer-specialist updates.
   - Media upload for request context.
