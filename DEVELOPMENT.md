# Development Plan

## Next Development Stages

### 1. Add SMS confirmation

The project already uses Africa's Talking, so the existing integration should be reused.

After a request is successfully saved, the backend should send an SMS to:

`validation.data.customerPhone`

Suggested message:

```text
Handiman: We received your car detailing request.
Reference: HD-20260805-8LNRP4.
Our team will contact you shortly to confirm the details.
```

### 2. Do not fail the request when SMS fails

This must be non-blocking.

If:

- the database insert succeeds, and
- Africa's Talking temporarily fails,

the API should still return success because the request was saved.

Example response:

```json
{
  "ok": true,
  "message": "Your detailing request has been received.",
  "request": {
    "requestNumber": "HD-20260805-8LNRP4",
    "status": "new"
  },
  "notification": {
    "smsSent": false
  }
}
```

The customer can still copy the request number shown on the website.

### 3. Record the SMS delivery state

For the first version, add these fields to `PublicDetailingRequest`:

- `confirmationSmsStatus String @default("pending")`
- `confirmationSmsSentAt DateTime?`
- `confirmationSmsError String?`

A separate notification table is a better long-term design:

```text
Notification
- id
- requestId
- channel
- destination
- status
- providerMessageId
- sentAt
- failedAt
```

### 4. Notify Handiman staff

After a new request arrives, Handiman staff should be notified.

Initial options:

- SMS to an operations phone
- Email to the Handiman team
- Admin dashboard queue
- All three later

Suggested staff SMS content:

```text
New Handiman detailing request:
HD-20260805-8LNRP4
Full detail, SUV
East Legon
Preferred: Aug 10, morning
```

Avoid placing unnecessary customer information in staff SMS messages.

### 5. Build the operations workflow

The public request status should start as:

`new`

The staff workflow should then move through:

`new` -> `contacted` -> `confirmed` -> `converted`

Possible alternate outcomes:

- `cancelled`
- `spam`

When staff confirms the booking, the public request can be converted into the existing authenticated `AssistanceRequest`.

### 6. Add spam protection before production

Because the endpoint is public, it will eventually receive automated submissions.

Before launch, add:

- rate limiting
- request-body size limits
- Cloudflare Turnstile or another CAPTCHA
- duplicate-submission detection
- logging that masks phone numbers
- strict production CORS origins

## Notes

- SMS delivery should be treated as a best-effort notification, not a requirement for request creation.
- Request creation is the source of truth; notifications should be recorded separately from the request save path as the codebase grows.
