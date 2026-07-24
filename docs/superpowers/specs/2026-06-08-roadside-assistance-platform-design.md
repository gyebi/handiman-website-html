# Roadside Assistance Platform Design

Date: 2026-06-08

## Summary

Build a mobile-first roadside assistance marketplace for Ghana. The first operational market is Accra, with the platform structured for later rollout to major cities including Kumasi, Tema, Takoradi, Tamale, Cape Coast, and Koforidua.

The MVP focuses on vehicle breakdown situations, not general home services. Customers request help, verified specialists accept relevant nearby requests, and both parties coordinate through status updates, ETA, map location context, and in-app chat. Payments happen offline in the MVP.

AI is limited to assisted intake and triage. It may help classify issues from chat, photos, or videos, but it must not present a final mechanical diagnosis or replace specialist judgment.

Agentic coding applies only to the development process. It is not a user-facing product feature in the MVP.

## Goals

- Let stranded drivers request roadside help quickly from a mobile device.
- Let verified specialists accept requests based on expertise, city or area, and availability.
- Support towing, jump starts, flat tires, lockouts, fuel delivery, mobile mechanic diagnostics, and qualified minor roadside repairs.
- Provide admin oversight for specialist approval, service areas, active requests, safety issues, and support.
- Build with security, privacy, and software supply-chain risk controls from the start.
- Keep the MVP small enough to validate operations before adding native apps, in-platform payments, or full live GPS tracking.

## Non-Goals

- General handyman or home services marketplace.
- Native iOS or Android apps for the first release.
- In-platform payments, refunds, or disputes for the first release.
- Full live GPS tracking for both parties in the first release.
- AI-based final diagnosis or automated repair instructions.
- Emergency dispatch replacement for police, ambulance, fire, or official emergency services.

## Users And Roles

### Customer

A driver or vehicle owner who needs roadside assistance. Customers log in with phone OTP. Email is optional for future account recovery and receipts.

### Specialist

A vetted roadside professional, mobile mechanic, tow operator, locksmith, tire technician, or fuel delivery provider. Specialists log in with phone OTP but cannot accept jobs until approved by an admin.

### Admin

An operations user with role-scoped permissions. Admin access is split into support, verification, operations, and super-admin responsibilities so one ordinary admin cannot access every sensitive action or record.

## MVP Service Categories

- Towing
- Jump start
- Flat tire help
- Vehicle lockout
- Fuel delivery
- Mobile mechanic diagnostics at the breakdown location
- Minor roadside repair when the specialist is qualified and the situation is safe

## Geography

Accra is the first operational market. The data model and admin tools must support activating additional Ghanaian cities and service areas later. Major expansion targets include Kumasi, Tema, Takoradi, Tamale, Cape Coast, and Koforidua.

## Product Architecture

The MVP should be a single full-stack web application with clear internal boundaries:

- Customer mobile-first PWA
- Specialist mobile-first PWA
- Admin dashboard
- Backend API
- Database
- Private object storage for uploaded photos, videos, and verification documents
- Chat and notification services

This keeps the first build manageable while leaving room for later native mobile apps, payment integrations, and operational scale.

The project must support a low-cost study mode and a later production scale-up path. Local development should avoid paid external services by default. OTP, maps, object storage, notifications, AI triage, payments, and analytics should be integrated behind clear provider boundaries so the MVP can start with local, mocked, or manually operated adapters and later switch to production providers without rewriting the core domains.

Current provider direction:

- Use Firebase Authentication as the primary identity and session engine.
- Use Africa's Talking for phone OTP SMS delivery instead of Firebase Phone Auth SMS, because Firebase Phone Auth bills per real SMS and the project already has an Africa's Talking account.
- Use Firebase Admin custom tokens after OTP verification so the client still gets a Firebase-authenticated session.
- Use a remote PostgreSQL database for application data. Neon Free is the preferred study-phase candidate because it supports hosted Postgres without keeping data on the local machine. Firebase SQL Connect or Cloud SQL remains a future option if tighter Firebase integration becomes more important than provider independence.
- Keep `DATABASE_URL`, Africa's Talking credentials, Firebase Admin credentials, and any other provider secrets out of source control and in environment-specific secret storage.

Scale-up design requirements:

- Keep request lifecycle, authorization, pricing agreement, and dispatch rules in provider-independent domain code.
- Isolate paid or replaceable services behind interfaces for OTP, maps/geocoding, object storage, media scanning, notifications, AI triage, payments, and observability.
- Use local or no-op adapters in development and test environments.
- Keep production provider credentials out of source control and load them through environment-specific configuration.
- Design database records with stable IDs, audit timestamps, and status history so future reporting, support, and compliance workflows can be added.
- Avoid implementation choices that assume only one city, one service category, one payment method, or one notification provider.
- Add queue or background-job boundaries before production launch for slow work such as media scanning, notification delivery, AI analysis, and unmatched-request escalation.

## Core Domains

### Identity And Access

- Phone OTP login for customers and specialists.
- OTP delivery is handled by the backend through Africa's Talking. OTP codes are generated server-side, stored only as short-lived hashes with attempt limits and resend cooldowns, and never sent directly from the browser.
- After a valid OTP, the backend creates or resolves the app user and issues a Firebase custom token. The frontend signs in to Firebase with that token and uses Firebase Auth state as the client session.
- Optional customer email.
- Role-based access control for customer, specialist, and admin.
- Admin approval required before specialists can accept requests.
- Admin accounts require MFA.
- OTP codes expire quickly, have attempt limits, resend cooldowns, and abuse monitoring.
- Sessions use secure cookie or token settings, defined lifetimes, and revocation support.
- Phone-number changes require re-verification.
- Customers and specialists can review and revoke active sessions.

### Requests And Dispatch

- Customers create breakdown requests with service type, vehicle details, location pin, description, and optional media.
- Requests have a clear lifecycle: created, open, accepted, en route, arrived, diagnosing, completed, unable to complete, cancelled, unmatched.
- Verified specialists can see relevant open requests by service category, city or area, and availability.
- One specialist accepts a request at a time.
- The MVP uses location pin, ETA, and status updates instead of full continuous GPS tracking.
- If no specialist accepts a request, it becomes unmatched and admin can intervene.
- After acceptance and before work starts, the specialist proposes a service fee, call-out fee, or fee range based on the reported problem type and visible request details.
- The customer must accept the proposed fee or fee range in-app before non-emergency work proceeds.
- If the specialist discovers that the real issue differs materially from the reported problem, the specialist must propose a revised fee and reason, and the customer must accept the revision before additional work proceeds.
- Before acceptance, specialists see only coarse area information, not the customer's exact location pin.
- Exact customer location is revealed only to the verified specialist who accepts the request.
- Exact location access is removed when a request is cancelled, unmatched, or no longer assigned to that specialist.
- Suspended, unapproved, or out-of-category specialists cannot view request details or precise location.
- Access to precise location is logged and retained only as long as needed for safety, support, and legal obligations.

### Specialist Verification

Specialists must submit:

- Ghana Card or approved identity document.
- Profile photo.
- Business name, if applicable.
- Operating city or area.
- Service categories.
- Equipment or vehicle details, especially for towing and roadside work.
- Experience, certification, or qualification details.

Admins can approve, reject, request more information, or suspend a specialist.

Verification must include manual document review, profile-photo or selfie match checks, category-specific qualification checks, and business verification where applicable. Towing, locksmith, fuel delivery, and mobile mechanic categories each require separate approval gates because the risks and equipment differ. Specialists can accept jobs only in approved service categories and approved operating areas. Re-verification is required on a defined cadence and after material profile changes, complaints, suspicious activity, or safety incidents.

### Chat

- In-app chat starts after a specialist accepts a request.
- Phone numbers are not exposed by default.
- Chat messages are associated with a request.
- Users can report abuse or safety issues from the chat context.
- Chat has per-conversation rate limits and attachment restrictions.
- The system detects risky content such as threats, suspicious links, and attempts to exchange phone numbers, then flags according to policy.
- Abuse reports preserve evidence for admin review.
- Users can mute or block non-essential chat after a report while preserving safety/support access.

### Admin Operations

Admins can:

- Review specialist applications.
- Approve, reject, request more information, or suspend specialists.
- Monitor active and stuck requests.
- Manage service categories.
- Activate or deactivate cities and service areas.
- Review complaints and safety incidents.
- Add internal support notes.
- Review audit logs for sensitive actions.

Admin permissions are separated by role:

- Support admins can review requests, support notes, reports, and limited account information.
- Verification admins can review specialist applications and verification documents.
- Operations admins can manage active service areas, categories, and stuck requests.
- Super-admins manage admin users, elevated permissions, and sensitive policy changes.

Sensitive actions such as specialist approval, specialist suspension, verification document access, and audit-log export require elevated permission, additional confirmation, or dual control where practical. Audit logs are immutable to ordinary admins and cannot be edited or deleted through the application.

### Ratings And Reviews

- Customers can submit a 1-5 rating after a completed job.
- Customers can leave a short written review.
- Customers can flag complaints for admin review.

## AI-Assisted Triage

AI may help with request intake by:

- Classifying likely service category from customer answers.
- Asking follow-up questions.
- Summarizing symptoms for specialists.
- Reviewing uploaded photos or videos to suggest likely issue categories.

AI must:

- Be presented as assistance, not final diagnosis.
- Avoid definitive repair claims.
- Defer to qualified specialist judgment.
- Handle uncertainty explicitly.
- Avoid replacing safety guidance or emergency services.
- Produce advisory metadata only and never auto-complete dispatch, safety, or account decisions.
- Avoid step-by-step hazardous repair instructions.
- Trigger deterministic emergency or support flows for danger signals rather than relying on model judgment alone.
- Treat user messages and uploaded media as untrusted input, with prompt-injection defenses.
- Log AI outputs for support and safety review.
- Use providers and settings that limit training and retention of customer media and request data where available.
- Disclose to users when media or text may be processed by AI or third-party AI services.

## Safety And Emergency Handling

- The app includes safety guidance and an SOS-style flow.
- The app must clearly state that it does not replace official emergency services.
- If a customer reports an unsafe location or immediate danger, the app surfaces emergency guidance and support escalation.
- Admins can review safety incidents and suspend accounts.
- Abuse reports from chat or request flows are admin-visible.
- Current Ghana emergency guidance must be validated before launch and reviewed periodically.
- The Accra MVP must define service-area boundaries before launch.
- Customers can use landmark-based location fallback when GPS is unavailable, inaccurate, or denied.
- Upload flows should support low-bandwidth conditions by allowing requests without media and by limiting video size or duration.
- Initial language and support assumptions must be explicit for the launch market.

## Error And Edge Case Handling

- If no specialist accepts a request, the request moves to unmatched and admin can intervene.
- If a specialist accepts but cannot complete a job, the request can be closed or reopened for another specialist.
- If a customer cancels repeatedly, the account can be rate limited or reviewed.
- If a specialist repeatedly cancels or fails to arrive, admins can review and suspend the account.
- If AI triage is uncertain, it must say so and route the request to human specialist judgment.
- If uploads fail, the customer can submit the request without media.
- If location permission is denied, the customer can manually place or describe their location.

## Payments

Payments are offline in the MVP. The platform tracks request lifecycle and service completion, but customers pay specialists directly outside the app.

The architecture should leave room for future in-platform payments, including platform fees, receipts, disputes, refunds, and compliance checks.

Offline payment safety requirements:

- The app clearly discloses that the platform does not hold funds in the MVP.
- Specialists provide a proposed service fee, call-out fee, or fee range before work starts, based on the problem type, vehicle context, location, and available media.
- Customers accept, reject, or request clarification on the proposed fee in-app before work starts.
- The accepted fee agreement is recorded with timestamp, specialist, customer, request, included work, exclusions, and whether it is fixed or a range.
- If the problem changes after inspection, any revised fee requires a new in-app customer acceptance before additional non-emergency work proceeds.
- Completion notes can record agreed work, accepted amount or range, final amount discussed, and payment method without storing sensitive payment credentials.
- Complaint reason codes include overcharging, bait-and-switch pricing, non-payment, unsafe payment pressure, and fraud.
- Admins can review payment-related safety and fraud complaints even though the MVP does not process refunds.
- Specialists are prohibited from using payment pressure, threats, or misleading pricing.

## Security Requirements

- Enforce strong role separation between customer, specialist, and admin.
- Use least-privilege access to request, chat, document, media, and location data.
- Store uploaded documents, photos, and videos privately.
- Never expose verification documents publicly.
- Rate limit OTP, request creation, chat, uploads, and authentication-sensitive endpoints.
- Keep secrets out of source control.
- Restrict CI secrets to trusted branches and jobs.
- Audit admin actions, specialist approvals, request status changes, safety incidents, and account suspensions.
- Validate uploaded files by type, size, and storage policy.
- Protect against fake requests, spam, repeated cancellations, harassment, and account abuse.
- Avoid direct phone-number exposure by default.
- Make privacy implications of location sharing clear to users.
- Encrypt stored media and verification documents using managed server-side encryption.
- Use short-lived signed URLs for private file access.
- Scan uploads for malware and quarantine suspicious files.
- Validate uploads by MIME sniffing, size, duration, and content policy rather than file extension alone.
- Strip EXIF and embedded location metadata from customer photos and videos where practical.
- Apply stricter access policies to identity documents than ordinary request media.
- Log admin access to verification documents and sensitive customer media.
- Define retention, deletion, and export flows for customer media, verification documents, chats, and location data.

## Dependency Supply-Chain Security

Dependency security is a launch requirement.

- The seven-day waiting rule applies to all dependencies, including runtime, development, test, build, linting, formatting, and code generation packages.
- New dependencies and version upgrades must not be installed until at least seven days after release.
- The rule applies to direct dependencies, transitive lockfile refreshes, base container images, GitHub Actions or CI actions, package manager plugins, code generation downloads, and toolchain downloads.
- Exceptions are allowed only for documented emergency security fixes after manual review.
- Lockfiles are required and committed.
- Runtime and package manager versions are pinned.
- Dependency additions require human review and a clear reason.
- AI coding agents must not add dependencies silently.
- Prefer mature, maintained packages with healthy project signals, clear licensing, and provenance where available.
- Keep dependency count low and prefer framework or platform built-ins when reasonable.
- Avoid package install scripts unless explicitly approved.
- Use exact pinning where practical for dependencies, CI actions, base images, and build tools.
- Verify provenance, signatures, or attestations where available.
- CI must enforce dependency release-age checks and block unapproved packages under seven days old.
- Emergency dependency exceptions must document the vulnerability, affected package, reviewer, approval time, and follow-up verification.
- CI must run tests, linting, build checks, dependency audit, secret scanning, and static analysis before merge.
- Generate an SBOM for releases.

## Development Process

Agentic coding is allowed only as part of the development workflow. Agents may help draft specs, create implementation plans, write code, run tests, review changes, and perform security checks.

Agentic development must follow these controls:

- Specs before implementation.
- Implementation plans before code changes.
- Tests appropriate to risk and behavior.
- Human review for dependency additions and security-sensitive changes.
- Security review before release.
- Verification evidence before marking work complete.

## Testing And Verification

The MVP should include focused tests for the highest-risk flows:

- Authentication and role-based access control.
- Specialist approval and suspension.
- Request lifecycle and one-specialist acceptance.
- Customer and specialist authorization for request and chat data.
- Admin-only actions.
- Upload validation.
- Rate limit behavior for OTP, request creation, chat, and uploads.
- AI triage uncertainty and human-handoff behavior.
- Dependency policy checks for lockfiles, audits, and seven-day dependency age review.
- Precise location visibility before and after request acceptance, cancellation, and reassignment.
- Admin role permissions and audit-log immutability.
- Specialist category approval and out-of-category request access denial.
- Private media access, signed URL expiry, and verification-document access controls.

Release verification must include linting, tests, build checks, dependency audit, secret scanning, static analysis, and SBOM generation.

## Open Future Enhancements

- Native iOS and Android apps.
- Full live GPS tracking for customer and specialist.
- In-platform payments and platform fees.
- Masked calling.
- Trusted contact sharing.
- Specialist subscriptions or premium placement.
- Fleet or roadside company dashboards.
- Insurance or warranty integrations.
- More advanced AI operations tooling after the MVP is stable.
