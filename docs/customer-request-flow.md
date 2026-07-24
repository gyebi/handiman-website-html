# Customer Request Flow

Date: 2026-06-09

## Current State

The customer entry screen now lets an OTP-verified customer submit a roadside assistance request. It collects:

- Service type.
- Basic vehicle details.
- Nearest area or landmark.
- Problem description.

Precise GPS is intentionally optional at draft time. The product policy remains: collect coarse area first and reveal precise customer location only to the accepted specialist.

Submitting the form calls `POST /api/customer/requests` with the customer's Firebase ID token. The backend verifies that token, resolves the customer user created by OTP verification, validates the draft, and persists an `AssistanceRequest` with status `open` and the selected service area.

## Domain Rules

Request drafts are validated in `src/domain/request-draft.ts`.

Current validation:

- Service type must be one of the supported roadside categories.
- Service area must be selected from active service areas.
- Vehicle details are required so a specialist can prepare.
- Nearest area or landmark is required.
- Problem description must be at least 10 characters.
- Precise location must include both latitude and longitude if present.

## User-Friendly Error Guide

Error:

```text
Choose the type of roadside help needed.
```

Meaning: The user has not selected car detailing, towing, jump start, flat tire help, lockout, fuel delivery, diagnostics, or minor roadside repair.

Error:

```text
Add basic vehicle details so the specialist can prepare.
```

Meaning: The form needs enough vehicle context for dispatch, such as make, model, color, or plate number.

Error:

```text
Add the nearest area or landmark.
```

Meaning: The app needs coarse location first, even before GPS is shared.

Error:

```text
Describe the problem in at least 10 characters.
```

Meaning: The problem description is too short to help classify or route the request.

Error:

```text
Precise location needs both latitude and longitude.
```

Meaning: GPS data is incomplete. Use no precise location, or include both coordinates.

## Not Implemented Yet

- GPS capture button.
- Media upload.
- Notifications or chat.
- Customer request history/status detail screen.
- Specialist/admin sign-in onboarding for non-customer roles.

Customer authentication now uses Africa's Talking for OTP SMS delivery and Firebase Authentication for the client identity/session after OTP verification. Request persistence now follows authentication so saved requests are tied to a verified customer user.

Specialist matching now uses approved, online specialist profiles with selected service areas and categories. Accepting a request atomically moves an open request to `accepted` and assigns the specialist.

The preferred study-phase database target is hosted PostgreSQL on Neon Free, keeping application data off the local machine.
