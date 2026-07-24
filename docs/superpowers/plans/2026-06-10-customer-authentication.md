# Customer Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build customer phone OTP authentication using Africa's Talking for SMS delivery, Firebase custom tokens for browser sessions, and PostgreSQL/Prisma for app users and OTP challenges.

**Architecture:** Add provider-independent auth domain functions first, then wire server-only adapters for OTP storage, SMS delivery, and Firebase custom-token signing. Keep customer auth endpoints under `app/api/auth/customer/*`, keep browser UI in a client component, and avoid new dependencies by using built-in `crypto` plus `fetch`.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Firebase client SDK, Africa's Talking SMS REST API, Vitest, Testing Library.

---

## File Structure

- Modify: `prisma/schema.prisma` - add `firebaseUid` to `User` and add `OtpChallenge`.
- Create: `src/domain/auth.ts` - phone normalization, OTP policy constants, OTP validation helpers, masked phone formatting.
- Test: `src/domain/__tests__/auth.test.ts` - domain-level phone and OTP behavior.
- Create: `src/server/auth/otp-crypto.ts` - OTP generation, hashing, and comparison using Node `crypto`.
- Test: `src/server/auth/__tests__/otp-crypto.test.ts` - verifies hashes do not expose plaintext and comparisons work.
- Create: `src/server/auth/customer-auth-service.ts` - orchestration for start and verify flows using injected repositories/providers.
- Test: `src/server/auth/__tests__/customer-auth-service.test.ts` - tests challenge lifecycle, user reuse/creation, SMS handoff, and Firebase token handoff with in-memory fakes.
- Create: `src/server/auth/africas-talking-sms.ts` - server-only SMS sender using `fetch`.
- Test: `src/server/auth/__tests__/africas-talking-sms.test.ts` - verifies request shape and secret handling.
- Create: `src/server/auth/firebase-custom-token.ts` - server-only Firebase custom-token signer using service account env vars and Node `crypto`.
- Test: `src/server/auth/__tests__/firebase-custom-token.test.ts` - verifies JWT shape without logging secrets.
- Create: `src/server/db/prisma.ts` - singleton Prisma client.
- Create: `src/server/auth/prisma-customer-auth-repository.ts` - Prisma-backed user/challenge repository.
- Create: `app/api/auth/customer/start/route.ts` - start OTP API route.
- Create: `app/api/auth/customer/verify/route.ts` - verify OTP API route.
- Create: `app/customer-auth-panel.tsx` - client-side customer sign-in form.
- Modify: `app/page.tsx` - place auth panel above or near the request draft form.
- Modify: `src/lib/firebase/client.ts` - export Firebase Auth helpers for custom-token sign-in.
- Test: `app/__tests__/customer-auth-panel.test.tsx` - UI state tests for phone, OTP, errors, and success.
- Modify: `.env.example` - document Neon, Africa's Talking, and Firebase Admin env vars without secrets.
- Modify: `apphosting.yaml` - document production secrets required by auth.
- Modify: `docs/auth-and-data-provider-decisions.md` - mark the implementation state after this plan is executed.

## Task 1: Add Auth Domain Rules

**Files:**
- Create: `src/domain/auth.ts`
- Test: `src/domain/__tests__/auth.test.ts`

- [ ] **Step 1: Write failing domain tests**

Create `src/domain/__tests__/auth.test.ts`:

```ts
import {
  maskPhoneNumber,
  normalizeGhanaPhoneNumber,
  otpPolicy,
  validateOtpCode,
} from "../auth";

describe("customer auth domain", () => {
  test("normalizes Ghana phone numbers to E.164 format", () => {
    expect(normalizeGhanaPhoneNumber("024 123 4567")).toEqual({
      ok: true,
      phoneNumber: "+233241234567",
    });
    expect(normalizeGhanaPhoneNumber("+233 24 123 4567")).toEqual({
      ok: true,
      phoneNumber: "+233241234567",
    });
    expect(normalizeGhanaPhoneNumber("233241234567")).toEqual({
      ok: true,
      phoneNumber: "+233241234567",
    });
  });

  test("rejects invalid Ghana phone numbers", () => {
    expect(normalizeGhanaPhoneNumber("123")).toEqual({
      ok: false,
      error: "Enter a valid Ghana phone number.",
    });
    expect(normalizeGhanaPhoneNumber("+15555550100")).toEqual({
      ok: false,
      error: "Enter a valid Ghana phone number.",
    });
  });

  test("validates six digit OTP codes", () => {
    expect(validateOtpCode("123456")).toEqual({ ok: true, code: "123456" });
    expect(validateOtpCode(" 123456 ")).toEqual({ ok: true, code: "123456" });
    expect(validateOtpCode("12345")).toEqual({ ok: false, error: "Enter the 6-digit code." });
    expect(validateOtpCode("abcdef")).toEqual({ ok: false, error: "Enter the 6-digit code." });
  });

  test("masks phone numbers without hiding the country code", () => {
    expect(maskPhoneNumber("+233241234567")).toBe("+233 *** ** 4567");
  });

  test("defines conservative OTP policy defaults", () => {
    expect(otpPolicy.codeLength).toBe(6);
    expect(otpPolicy.expiresInSeconds).toBe(5 * 60);
    expect(otpPolicy.resendCooldownSeconds).toBe(60);
    expect(otpPolicy.maxAttempts).toBe(5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm test src/domain/__tests__/auth.test.ts
```

Expected: fail because `src/domain/auth.ts` does not exist.

- [ ] **Step 3: Implement the domain helpers**

Create `src/domain/auth.ts`:

```ts
export const otpPolicy = {
  codeLength: 6,
  expiresInSeconds: 5 * 60,
  resendCooldownSeconds: 60,
  maxAttempts: 5,
} as const;

type Result<T> = { ok: true } & T | { ok: false; error: string };

export function normalizeGhanaPhoneNumber(input: string): Result<{ phoneNumber: string }> {
  const compact = input.replace(/[\s()-]/g, "");
  const withoutPlus = compact.startsWith("+") ? compact.slice(1) : compact;

  let localNumber: string;

  if (/^0\d{9}$/.test(withoutPlus)) {
    localNumber = withoutPlus.slice(1);
  } else if (/^233\d{9}$/.test(withoutPlus)) {
    localNumber = withoutPlus.slice(3);
  } else {
    return { ok: false, error: "Enter a valid Ghana phone number." };
  }

  return { ok: true, phoneNumber: `+233${localNumber}` };
}

export function validateOtpCode(input: string): Result<{ code: string }> {
  const code = input.trim();

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code." };
  }

  return { ok: true, code };
}

export function maskPhoneNumber(phoneNumber: string): string {
  return `${phoneNumber.slice(0, 4)} *** ** ${phoneNumber.slice(-4)}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm test src/domain/__tests__/auth.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/auth.ts src/domain/__tests__/auth.test.ts
git commit -m "feat: add customer auth domain rules"
```

## Task 2: Add Prisma Auth Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update the Prisma schema**

Modify the `User` model and add `OtpPurpose` plus `OtpChallenge`:

```prisma
enum OtpPurpose {
  customer_sign_in
}

model User {
  id          String    @id @default(cuid())
  firebaseUid String?   @unique
  phoneNumber String    @unique
  role        UserRole
  adminRole   AdminRole?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  specialistProfile SpecialistProfile?
  customerRequests  AssistanceRequest[] @relation("CustomerRequests")
  assignedRequests  AssistanceRequest[] @relation("AssignedRequests")
}

model OtpChallenge {
  id                String     @id @default(cuid())
  phoneNumber       String
  codeHash          String
  purpose           OtpPurpose @default(customer_sign_in)
  expiresAt         DateTime
  consumedAt        DateTime?
  attemptCount      Int        @default(0)
  resendAvailableAt DateTime
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  @@index([phoneNumber, purpose, createdAt])
  @@index([expiresAt])
}
```

- [ ] **Step 2: Validate the schema**

Run:

```bash
pnpm prisma validate
```

Expected: Prisma reports the schema is valid.

- [ ] **Step 3: Generate the Prisma client**

Run:

```bash
pnpm prisma:generate
```

Expected: Prisma client generation succeeds.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add customer auth persistence schema"
```

## Task 3: Add OTP Crypto Utilities

**Files:**
- Create: `src/server/auth/otp-crypto.ts`
- Test: `src/server/auth/__tests__/otp-crypto.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/server/auth/__tests__/otp-crypto.test.ts`:

```ts
import { compareOtpCode, generateOtpCode, hashOtpCode } from "../otp-crypto";

describe("OTP crypto utilities", () => {
  test("generates six digit codes", () => {
    const code = generateOtpCode();

    expect(code).toMatch(/^\d{6}$/);
  });

  test("stores hashes instead of plaintext codes", () => {
    const hash = hashOtpCode("123456", "+233241234567");

    expect(hash).not.toContain("123456");
    expect(hash).not.toContain("+233241234567");
    expect(compareOtpCode("123456", "+233241234567", hash)).toBe(true);
    expect(compareOtpCode("000000", "+233241234567", hash)).toBe(false);
  });

  test("binds an OTP hash to the phone number", () => {
    const hash = hashOtpCode("123456", "+233241234567");

    expect(compareOtpCode("123456", "+233201111111", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm test src/server/auth/__tests__/otp-crypto.test.ts
```

Expected: fail because `otp-crypto.ts` does not exist.

- [ ] **Step 3: Implement OTP crypto**

Create `src/server/auth/otp-crypto.ts`:

```ts
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtpCode(code: string, phoneNumber: string): string {
  return createHash("sha256").update(`${phoneNumber}:${code}`).digest("hex");
}

export function compareOtpCode(code: string, phoneNumber: string, expectedHash: string): boolean {
  const actualHash = hashOtpCode(code, phoneNumber);
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm test src/server/auth/__tests__/otp-crypto.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/otp-crypto.ts src/server/auth/__tests__/otp-crypto.test.ts
git commit -m "feat: add OTP crypto utilities"
```

## Task 4: Add Customer Auth Service With In-Memory Tests

**Files:**
- Create: `src/server/auth/customer-auth-service.ts`
- Test: `src/server/auth/__tests__/customer-auth-service.test.ts`

- [ ] **Step 1: Write failing service tests**

Create `src/server/auth/__tests__/customer-auth-service.test.ts`:

```ts
import { createCustomerAuthService, type AuthChallenge, type AuthUser } from "../customer-auth-service";

function createMemoryRepository() {
  const challenges = new Map<string, AuthChallenge>();
  const users = new Map<string, AuthUser>();
  let challengeCounter = 0;

  return {
    challenges,
    users,
    repository: {
      async findLatestActiveChallenge(phoneNumber: string, now: Date) {
        return [...challenges.values()]
          .filter((challenge) => challenge.phoneNumber === phoneNumber)
          .filter((challenge) => !challenge.consumedAt)
          .filter((challenge) => challenge.expiresAt > now)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
      },
      async createChallenge(input: Omit<AuthChallenge, "id" | "attemptCount" | "consumedAt" | "createdAt">) {
        challengeCounter += 1;
        const challenge: AuthChallenge = {
          ...input,
          id: `challenge_${challengeCounter}`,
          attemptCount: 0,
          consumedAt: null,
          createdAt: new Date("2026-06-10T12:00:00.000Z"),
        };
        challenges.set(challenge.id, challenge);
        return challenge;
      },
      async findChallengeById(id: string) {
        return challenges.get(id) ?? null;
      },
      async incrementChallengeAttempts(id: string) {
        const challenge = challenges.get(id);
        if (!challenge) return;
        challenges.set(id, { ...challenge, attemptCount: challenge.attemptCount + 1 });
      },
      async consumeChallenge(id: string, consumedAt: Date) {
        const challenge = challenges.get(id);
        if (!challenge) return;
        challenges.set(id, { ...challenge, consumedAt });
      },
      async findUserByPhoneNumber(phoneNumber: string) {
        return users.get(phoneNumber) ?? null;
      },
      async createCustomerUser(input: { phoneNumber: string; firebaseUid: string }) {
        const user: AuthUser = {
          id: `user_${users.size + 1}`,
          firebaseUid: input.firebaseUid,
          phoneNumber: input.phoneNumber,
          role: "customer",
        };
        users.set(input.phoneNumber, user);
        return user;
      },
      async updateUserFirebaseUid(userId: string, firebaseUid: string) {
        const user = [...users.values()].find((candidate) => candidate.id === userId);
        if (!user) throw new Error("User not found");
        const updated = { ...user, firebaseUid };
        users.set(user.phoneNumber, updated);
        return updated;
      },
    },
  };
}

describe("customer auth service", () => {
  test("starts an OTP challenge and sends an SMS", async () => {
    const memory = createMemoryRepository();
    const sentMessages: Array<{ to: string; message: string }> = [];
    const service = createCustomerAuthService({
      repository: memory.repository,
      sendSms: async (message) => sentMessages.push(message),
      issueFirebaseCustomToken: async () => "firebase-token",
      createFirebaseUid: (phoneNumber) => `phone:${phoneNumber}`,
      generateCode: () => "123456",
      hashCode: (code, phoneNumber) => `hash:${phoneNumber}:${code}`,
      compareCode: (code, phoneNumber, hash) => hash === `hash:${phoneNumber}:${code}`,
      now: () => new Date("2026-06-10T12:00:00.000Z"),
    });

    const result = await service.startCustomerOtp("024 123 4567");

    expect(result).toEqual({
      ok: true,
      challengeId: "challenge_1",
      maskedPhoneNumber: "+233 *** ** 4567",
      resendAvailableAt: new Date("2026-06-10T12:01:00.000Z"),
    });
    expect(sentMessages).toEqual([
      {
        to: "+233241234567",
        message: "Your Handiman verification code is 123456. It expires in 5 minutes.",
      },
    ]);
    expect([...memory.challenges.values()][0].codeHash).toBe("hash:+233241234567:123456");
  });

  test("blocks resend during cooldown", async () => {
    const memory = createMemoryRepository();
    const service = createCustomerAuthService({
      repository: memory.repository,
      sendSms: async () => undefined,
      issueFirebaseCustomToken: async () => "firebase-token",
      createFirebaseUid: (phoneNumber) => `phone:${phoneNumber}`,
      generateCode: () => "123456",
      hashCode: (code, phoneNumber) => `hash:${phoneNumber}:${code}`,
      compareCode: (code, phoneNumber, hash) => hash === `hash:${phoneNumber}:${code}`,
      now: () => new Date("2026-06-10T12:00:00.000Z"),
    });

    await service.startCustomerOtp("+233241234567");
    const result = await service.startCustomerOtp("+233241234567");

    expect(result).toEqual({
      ok: false,
      error: "Please wait before requesting another code.",
    });
  });

  test("verifies OTP, creates customer, and returns Firebase custom token", async () => {
    const memory = createMemoryRepository();
    const service = createCustomerAuthService({
      repository: memory.repository,
      sendSms: async () => undefined,
      issueFirebaseCustomToken: async (firebaseUid) => `token:${firebaseUid}`,
      createFirebaseUid: (phoneNumber) => `phone:${phoneNumber}`,
      generateCode: () => "123456",
      hashCode: (code, phoneNumber) => `hash:${phoneNumber}:${code}`,
      compareCode: (code, phoneNumber, hash) => hash === `hash:${phoneNumber}:${code}`,
      now: () => new Date("2026-06-10T12:00:00.000Z"),
    });

    const started = await service.startCustomerOtp("+233241234567");
    if (!started.ok) throw new Error(started.error);
    const result = await service.verifyCustomerOtp(started.challengeId, "123456");

    expect(result).toEqual({
      ok: true,
      firebaseCustomToken: "token:phone:+233241234567",
      user: {
        id: "user_1",
        firebaseUid: "phone:+233241234567",
        phoneNumber: "+233241234567",
        role: "customer",
      },
    });
    expect(memory.challenges.get(started.challengeId)?.consumedAt).toEqual(new Date("2026-06-10T12:00:00.000Z"));
  });

  test("rejects incorrect OTP and increments attempts", async () => {
    const memory = createMemoryRepository();
    const service = createCustomerAuthService({
      repository: memory.repository,
      sendSms: async () => undefined,
      issueFirebaseCustomToken: async () => "firebase-token",
      createFirebaseUid: (phoneNumber) => `phone:${phoneNumber}`,
      generateCode: () => "123456",
      hashCode: (code, phoneNumber) => `hash:${phoneNumber}:${code}`,
      compareCode: (code, phoneNumber, hash) => hash === `hash:${phoneNumber}:${code}`,
      now: () => new Date("2026-06-10T12:00:00.000Z"),
    });

    const started = await service.startCustomerOtp("+233241234567");
    if (!started.ok) throw new Error(started.error);
    const result = await service.verifyCustomerOtp(started.challengeId, "000000");

    expect(result).toEqual({ ok: false, error: "Incorrect code." });
    expect(memory.challenges.get(started.challengeId)?.attemptCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm test src/server/auth/__tests__/customer-auth-service.test.ts
```

Expected: fail because `customer-auth-service.ts` does not exist.

- [ ] **Step 3: Implement the service**

Create `src/server/auth/customer-auth-service.ts`:

```ts
import { maskPhoneNumber, normalizeGhanaPhoneNumber, otpPolicy, validateOtpCode } from "@/domain/auth";

export type AuthChallenge = {
  id: string;
  phoneNumber: string;
  codeHash: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  attemptCount: number;
  consumedAt: Date | null;
  createdAt: Date;
};

export type AuthUser = {
  id: string;
  firebaseUid: string | null;
  phoneNumber: string;
  role: "customer" | "specialist" | "admin";
};

export type CustomerAuthRepository = {
  findLatestActiveChallenge(phoneNumber: string, now: Date): Promise<AuthChallenge | null>;
  createChallenge(input: Omit<AuthChallenge, "id" | "attemptCount" | "consumedAt" | "createdAt">): Promise<AuthChallenge>;
  findChallengeById(id: string): Promise<AuthChallenge | null>;
  incrementChallengeAttempts(id: string): Promise<void>;
  consumeChallenge(id: string, consumedAt: Date): Promise<void>;
  findUserByPhoneNumber(phoneNumber: string): Promise<AuthUser | null>;
  createCustomerUser(input: { phoneNumber: string; firebaseUid: string }): Promise<AuthUser>;
  updateUserFirebaseUid(userId: string, firebaseUid: string): Promise<AuthUser>;
};

type CustomerAuthDependencies = {
  repository: CustomerAuthRepository;
  sendSms(message: { to: string; message: string }): Promise<void>;
  issueFirebaseCustomToken(firebaseUid: string): Promise<string>;
  createFirebaseUid(phoneNumber: string): string;
  generateCode(): string;
  hashCode(code: string, phoneNumber: string): string;
  compareCode(code: string, phoneNumber: string, hash: string): boolean;
  now(): Date;
};

type StartResult =
  | { ok: true; challengeId: string; maskedPhoneNumber: string; resendAvailableAt: Date }
  | { ok: false; error: string };

type VerifyResult =
  | { ok: true; firebaseCustomToken: string; user: AuthUser }
  | { ok: false; error: string };

export function createCustomerAuthService(dependencies: CustomerAuthDependencies) {
  return {
    async startCustomerOtp(inputPhoneNumber: string): Promise<StartResult> {
      const normalized = normalizeGhanaPhoneNumber(inputPhoneNumber);
      if (!normalized.ok) return normalized;

      const now = dependencies.now();
      const existingChallenge = await dependencies.repository.findLatestActiveChallenge(normalized.phoneNumber, now);

      if (existingChallenge && existingChallenge.resendAvailableAt > now) {
        return { ok: false, error: "Please wait before requesting another code." };
      }

      const code = dependencies.generateCode();
      const expiresAt = new Date(now.getTime() + otpPolicy.expiresInSeconds * 1000);
      const resendAvailableAt = new Date(now.getTime() + otpPolicy.resendCooldownSeconds * 1000);
      const challenge = await dependencies.repository.createChallenge({
        phoneNumber: normalized.phoneNumber,
        codeHash: dependencies.hashCode(code, normalized.phoneNumber),
        expiresAt,
        resendAvailableAt,
      });

      await dependencies.sendSms({
        to: normalized.phoneNumber,
        message: `Your Handiman verification code is ${code}. It expires in 5 minutes.`,
      });

      return {
        ok: true,
        challengeId: challenge.id,
        maskedPhoneNumber: maskPhoneNumber(normalized.phoneNumber),
        resendAvailableAt,
      };
    },

    async verifyCustomerOtp(challengeId: string, inputCode: string): Promise<VerifyResult> {
      const code = validateOtpCode(inputCode);
      if (!code.ok) return code;

      const now = dependencies.now();
      const challenge = await dependencies.repository.findChallengeById(challengeId);

      if (!challenge || challenge.consumedAt) {
        return { ok: false, error: "Code expired. Request a new code." };
      }

      if (challenge.expiresAt <= now) {
        return { ok: false, error: "Code expired. Request a new code." };
      }

      if (challenge.attemptCount >= otpPolicy.maxAttempts) {
        return { ok: false, error: "Too many attempts. Request a new code later." };
      }

      if (!dependencies.compareCode(code.code, challenge.phoneNumber, challenge.codeHash)) {
        await dependencies.repository.incrementChallengeAttempts(challenge.id);
        return { ok: false, error: "Incorrect code." };
      }

      await dependencies.repository.consumeChallenge(challenge.id, now);

      const existingUser = await dependencies.repository.findUserByPhoneNumber(challenge.phoneNumber);
      const firebaseUid = existingUser?.firebaseUid ?? dependencies.createFirebaseUid(challenge.phoneNumber);
      const user = existingUser
        ? existingUser.firebaseUid
          ? existingUser
          : await dependencies.repository.updateUserFirebaseUid(existingUser.id, firebaseUid)
        : await dependencies.repository.createCustomerUser({ phoneNumber: challenge.phoneNumber, firebaseUid });
      const firebaseCustomToken = await dependencies.issueFirebaseCustomToken(firebaseUid);

      return { ok: true, firebaseCustomToken, user };
    },
  };
}
```

- [ ] **Step 4: Run the service tests**

Run:

```bash
pnpm test src/server/auth/__tests__/customer-auth-service.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/customer-auth-service.ts src/server/auth/__tests__/customer-auth-service.test.ts
git commit -m "feat: add customer auth service"
```

## Task 5: Add Server Provider Adapters

**Files:**
- Create: `src/server/auth/africas-talking-sms.ts`
- Create: `src/server/auth/firebase-custom-token.ts`
- Test: `src/server/auth/__tests__/africas-talking-sms.test.ts`
- Test: `src/server/auth/__tests__/firebase-custom-token.test.ts`

- [ ] **Step 1: Write failing Africa's Talking tests**

Create `src/server/auth/__tests__/africas-talking-sms.test.ts`:

```ts
import { createAfricasTalkingSmsSender } from "../africas-talking-sms";

describe("Africa's Talking SMS sender", () => {
  test("sends SMS with server credentials and form payload", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const sender = createAfricasTalkingSmsSender({
      username: "sandbox",
      apiKey: "secret-key",
      senderId: "HANDIMAN",
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify({ SMSMessageData: { Recipients: [] } }), { status: 201 });
      },
    });

    await sender({ to: "+233241234567", message: "Your code is 123456." });

    expect(calls[0].url).toBe("https://api.africastalking.com/version1/messaging");
    expect(calls[0].init.method).toBe("POST");
    expect((calls[0].init.headers as Record<string, string>).apiKey).toBe("secret-key");
    expect(calls[0].init.body?.toString()).toBe(
      "username=sandbox&to=%2B233241234567&message=Your+code+is+123456.&from=HANDIMAN",
    );
  });

  test("throws a generic error when provider request fails", async () => {
    const sender = createAfricasTalkingSmsSender({
      username: "sandbox",
      apiKey: "secret-key",
      fetch: async () => new Response("denied", { status: 401 }),
    });

    await expect(sender({ to: "+233241234567", message: "Your code is 123456." })).rejects.toThrow(
      "Could not send code. Try again.",
    );
  });
});
```

- [ ] **Step 2: Write failing Firebase custom token tests**

Create `src/server/auth/__tests__/firebase-custom-token.test.ts`:

```ts
import { createFirebaseCustomTokenIssuer } from "../firebase-custom-token";

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASC...
-----END PRIVATE KEY-----`;

describe("Firebase custom token issuer", () => {
  test("creates a three-part JWT for a Firebase UID", async () => {
    const issuer = createFirebaseCustomTokenIssuer({
      clientEmail: "firebase-adminsdk@example.iam.gserviceaccount.com",
      privateKey,
      projectId: "handimanautocare",
      sign: async () => "signed-by-test",
      nowSeconds: () => 1_780_000_000,
    });

    const token = await issuer("phone:+233241234567");
    const [header, payload, signature] = token.split(".");
    const decodedHeader = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    expect(decodedHeader).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decodedPayload.iss).toBe("firebase-adminsdk@example.iam.gserviceaccount.com");
    expect(decodedPayload.sub).toBe("firebase-adminsdk@example.iam.gserviceaccount.com");
    expect(decodedPayload.aud).toBe("https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit");
    expect(decodedPayload.uid).toBe("phone:+233241234567");
    expect(signature).toBe("signed-by-test");
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run:

```bash
pnpm test src/server/auth/__tests__/africas-talking-sms.test.ts src/server/auth/__tests__/firebase-custom-token.test.ts
```

Expected: fail because both adapter modules do not exist.

- [ ] **Step 4: Implement Africa's Talking adapter**

Create `src/server/auth/africas-talking-sms.ts`:

```ts
type SendSms = (message: { to: string; message: string }) => Promise<void>;

type AfricasTalkingConfig = {
  username: string;
  apiKey: string;
  senderId?: string;
  fetch?: typeof fetch;
};

export function createAfricasTalkingSmsSender(config: AfricasTalkingConfig): SendSms {
  return async ({ to, message }) => {
    const body = new URLSearchParams({
      username: config.username,
      to,
      message,
    });

    if (config.senderId) {
      body.set("from", config.senderId);
    }

    const response = await (config.fetch ?? fetch)("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: config.apiKey,
      },
      body,
    });

    if (!response.ok) {
      throw new Error("Could not send code. Try again.");
    }
  };
}
```

- [ ] **Step 5: Implement Firebase custom token issuer**

Create `src/server/auth/firebase-custom-token.ts`:

```ts
import { createSign } from "node:crypto";

const firebaseAudience = "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

type FirebaseCustomTokenConfig = {
  clientEmail: string;
  privateKey: string;
  projectId: string;
  nowSeconds?: () => number;
  sign?: (input: string, privateKey: string) => Promise<string> | string;
};

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signWithPrivateKey(input: string, privateKey: string): string {
  return createSign("RSA-SHA256").update(input).sign(privateKey, "base64url");
}

export function createFirebaseCustomTokenIssuer(config: FirebaseCustomTokenConfig) {
  return async (firebaseUid: string): Promise<string> => {
    const now = config.nowSeconds?.() ?? Math.floor(Date.now() / 1000);
    const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
    const payload = base64UrlJson({
      iss: config.clientEmail,
      sub: config.clientEmail,
      aud: firebaseAudience,
      iat: now,
      exp: now + 60 * 60,
      uid: firebaseUid,
      claims: {
        role: "customer",
      },
    });
    const unsignedToken = `${header}.${payload}`;
    const signature = await (config.sign ?? signWithPrivateKey)(unsignedToken, config.privateKey);

    return `${unsignedToken}.${signature}`;
  };
}
```

- [ ] **Step 6: Run the adapter tests**

Run:

```bash
pnpm test src/server/auth/__tests__/africas-talking-sms.test.ts src/server/auth/__tests__/firebase-custom-token.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/server/auth/africas-talking-sms.ts src/server/auth/firebase-custom-token.ts src/server/auth/__tests__/africas-talking-sms.test.ts src/server/auth/__tests__/firebase-custom-token.test.ts
git commit -m "feat: add customer auth provider adapters"
```

## Task 6: Add Prisma Repository And API Routes

**Files:**
- Create: `src/server/db/prisma.ts`
- Create: `src/server/auth/prisma-customer-auth-repository.ts`
- Create: `app/api/auth/customer/start/route.ts`
- Create: `app/api/auth/customer/verify/route.ts`

- [ ] **Step 1: Add Prisma singleton**

Create `src/server/db/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: Add Prisma repository**

Create `src/server/auth/prisma-customer-auth-repository.ts`:

```ts
import type { CustomerAuthRepository } from "./customer-auth-service";
import { prisma } from "@/server/db/prisma";

export function createPrismaCustomerAuthRepository(): CustomerAuthRepository {
  return {
    async findLatestActiveChallenge(phoneNumber, now) {
      return prisma.otpChallenge.findFirst({
        where: {
          phoneNumber,
          purpose: "customer_sign_in",
          consumedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      });
    },
    async createChallenge(input) {
      return prisma.otpChallenge.create({
        data: {
          ...input,
          purpose: "customer_sign_in",
        },
      });
    },
    async findChallengeById(id) {
      return prisma.otpChallenge.findUnique({ where: { id } });
    },
    async incrementChallengeAttempts(id) {
      await prisma.otpChallenge.update({
        where: { id },
        data: { attemptCount: { increment: 1 } },
      });
    },
    async consumeChallenge(id, consumedAt) {
      await prisma.otpChallenge.update({
        where: { id },
        data: { consumedAt },
      });
    },
    async findUserByPhoneNumber(phoneNumber) {
      return prisma.user.findUnique({ where: { phoneNumber } });
    },
    async createCustomerUser(input) {
      return prisma.user.create({
        data: {
          firebaseUid: input.firebaseUid,
          phoneNumber: input.phoneNumber,
          role: "customer",
        },
      });
    },
    async updateUserFirebaseUid(userId, firebaseUid) {
      return prisma.user.update({
        where: { id: userId },
        data: { firebaseUid },
      });
    },
  };
}
```

- [ ] **Step 3: Add route factory helper inside each route**

Create `app/api/auth/customer/start/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createAfricasTalkingSmsSender } from "@/server/auth/africas-talking-sms";
import { createCustomerAuthService } from "@/server/auth/customer-auth-service";
import { createPrismaCustomerAuthRepository } from "@/server/auth/prisma-customer-auth-repository";
import { generateOtpCode, hashOtpCode, compareOtpCode } from "@/server/auth/otp-crypto";
import { createFirebaseCustomTokenIssuer } from "@/server/auth/firebase-custom-token";

export const runtime = "nodejs";

function getCustomerAuthService() {
  return createCustomerAuthService({
    repository: createPrismaCustomerAuthRepository(),
    sendSms: createAfricasTalkingSmsSender({
      username: process.env.AFRICAS_TALKING_USERNAME ?? "",
      apiKey: process.env.AFRICAS_TALKING_API_KEY ?? "",
      senderId: process.env.AFRICAS_TALKING_SENDER_ID || undefined,
    }),
    issueFirebaseCustomToken: createFirebaseCustomTokenIssuer({
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "",
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? "",
    }),
    createFirebaseUid: (phoneNumber) => `phone:${phoneNumber}`,
    generateCode: generateOtpCode,
    hashCode: hashOtpCode,
    compareCode: compareOtpCode,
    now: () => new Date(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { phoneNumber?: unknown };

  if (typeof body.phoneNumber !== "string") {
    return NextResponse.json({ ok: false, error: "Enter a valid Ghana phone number." }, { status: 400 });
  }

  const result = await getCustomerAuthService().startCustomerOtp(body.phoneNumber);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
```

Create `app/api/auth/customer/verify/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createAfricasTalkingSmsSender } from "@/server/auth/africas-talking-sms";
import { createCustomerAuthService } from "@/server/auth/customer-auth-service";
import { createPrismaCustomerAuthRepository } from "@/server/auth/prisma-customer-auth-repository";
import { generateOtpCode, hashOtpCode, compareOtpCode } from "@/server/auth/otp-crypto";
import { createFirebaseCustomTokenIssuer } from "@/server/auth/firebase-custom-token";

export const runtime = "nodejs";

function getCustomerAuthService() {
  return createCustomerAuthService({
    repository: createPrismaCustomerAuthRepository(),
    sendSms: createAfricasTalkingSmsSender({
      username: process.env.AFRICAS_TALKING_USERNAME ?? "",
      apiKey: process.env.AFRICAS_TALKING_API_KEY ?? "",
      senderId: process.env.AFRICAS_TALKING_SENDER_ID || undefined,
    }),
    issueFirebaseCustomToken: createFirebaseCustomTokenIssuer({
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "",
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? "",
    }),
    createFirebaseUid: (phoneNumber) => `phone:${phoneNumber}`,
    generateCode: generateOtpCode,
    hashCode: hashOtpCode,
    compareCode: compareOtpCode,
    now: () => new Date(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { challengeId?: unknown; code?: unknown };

  if (typeof body.challengeId !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ ok: false, error: "Enter the 6-digit code." }, { status: 400 });
  }

  const result = await getCustomerAuthService().verifyCustomerOtp(body.challengeId, body.code);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
```

- [ ] **Step 4: Typecheck**

Run:

```bash
pnpm typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/server/db/prisma.ts src/server/auth/prisma-customer-auth-repository.ts app/api/auth/customer/start/route.ts app/api/auth/customer/verify/route.ts
git commit -m "feat: add customer auth API routes"
```

## Task 7: Add Firebase Client Auth Helper And Customer UI

**Files:**
- Modify: `src/lib/firebase/client.ts`
- Create: `app/customer-auth-panel.tsx`
- Modify: `app/page.tsx`
- Test: `app/__tests__/customer-auth-panel.test.tsx`

- [ ] **Step 1: Add Firebase client helper**

Modify `src/lib/firebase/client.ts`:

```ts
"use client";

import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithCustomToken, type Auth, type UserCredential } from "firebase/auth";
import { getFirebaseConfig, isFirebaseAnalyticsEnabled } from "./config";

let analyticsPromise: Promise<Analytics | null> | undefined;

export function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function signInWithFirebaseCustomToken(customToken: string): Promise<UserCredential> {
  return signInWithCustomToken(getFirebaseAuth(), customToken);
}

export function initializeFirebaseAnalytics(): Promise<Analytics | null> {
  if (!isFirebaseAnalyticsEnabled()) {
    return Promise.resolve(null);
  }

  analyticsPromise ??= isSupported().then((supported) => {
    if (!supported) {
      return null;
    }

    return getAnalytics(getFirebaseApp());
  });

  return analyticsPromise;
}
```

- [ ] **Step 2: Write failing UI tests**

Create `app/__tests__/customer-auth-panel.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { CustomerAuthPanel } from "../customer-auth-panel";

vi.mock("@/lib/firebase/client", () => ({
  signInWithFirebaseCustomToken: vi.fn(() => Promise.resolve({ user: { uid: "phone:+233241234567" } })),
}));

describe("CustomerAuthPanel", () => {
  test("starts OTP and moves to code entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              ok: true,
              challengeId: "challenge_1",
              maskedPhoneNumber: "+233 *** ** 4567",
              resendAvailableAt: "2026-06-10T12:01:00.000Z",
            }),
            { status: 200 },
          ),
        ),
      ),
    );

    render(<CustomerAuthPanel />);

    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "0241234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));

    expect(await screen.findByText("Code sent to +233 *** ** 4567")).toBeInTheDocument();
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
  });

  test("verifies OTP and shows signed-in state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: true,
              challengeId: "challenge_1",
              maskedPhoneNumber: "+233 *** ** 4567",
              resendAvailableAt: "2026-06-10T12:01:00.000Z",
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: true,
              firebaseCustomToken: "firebase-token",
              user: {
                id: "user_1",
                firebaseUid: "phone:+233241234567",
                phoneNumber: "+233241234567",
                role: "customer",
              },
            }),
            { status: 200 },
          ),
        ),
    );

    render(<CustomerAuthPanel />);

    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "0241234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByLabelText("Verification code");
    fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify code" }));

    await waitFor(() => expect(screen.getByText("Signed in as +233241234567")).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run UI tests to verify they fail**

Run:

```bash
pnpm test app/__tests__/customer-auth-panel.test.tsx
```

Expected: fail because `app/customer-auth-panel.tsx` does not exist.

- [ ] **Step 4: Implement customer auth panel**

Create `app/customer-auth-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { KeyRound, Phone, ShieldCheck } from "lucide-react";
import { signInWithFirebaseCustomToken } from "@/lib/firebase/client";

type StartSuccess = {
  ok: true;
  challengeId: string;
  maskedPhoneNumber: string;
  resendAvailableAt: string;
};

type VerifySuccess = {
  ok: true;
  firebaseCustomToken: string;
  user: {
    id: string;
    firebaseUid: string;
    phoneNumber: string;
    role: "customer";
  };
};

type Failure = { ok: false; error: string };

export function CustomerAuthPanel() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<StartSuccess | null>(null);
  const [signedInPhoneNumber, setSignedInPhoneNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startOtp() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/customer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });
    const result = (await response.json()) as StartSuccess | Failure;

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setChallenge(result);
  }

  async function verifyOtp() {
    if (!challenge) return;

    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/customer/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.challengeId, code }),
    });
    const result = (await response.json()) as VerifySuccess | Failure;

    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }

    await signInWithFirebaseCustomToken(result.firebaseCustomToken);
    setSignedInPhoneNumber(result.user.phoneNumber);
    setLoading(false);
  }

  if (signedInPhoneNumber) {
    return (
      <section className="rounded-lg border border-service/25 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 text-service" />
          Signed in as {signedInPhoneNumber}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound aria-hidden="true" className="h-5 w-5 text-service" />
        <h2 className="text-lg font-semibold text-ink">Customer sign in</h2>
      </div>

      <div className="grid gap-3">
        <label className="field-label">
          Phone number
          <input
            className="field-control"
            name="phoneNumber"
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="024 123 4567"
            type="tel"
            value={phoneNumber}
          />
        </label>

        {challenge ? (
          <>
            <p className="text-sm font-medium text-slate-700">Code sent to {challenge.maskedPhoneNumber}</p>
            <label className="field-label">
              Verification code
              <input
                className="field-control"
                inputMode="numeric"
                maxLength={6}
                name="code"
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                value={code}
              />
            </label>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-road px-4 py-2 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={verifyOtp}
              type="button"
            >
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Verify code
            </button>
          </>
        ) : (
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-road px-4 py-2 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={startOtp}
            type="button"
          >
            <Phone aria-hidden="true" className="h-4 w-4" />
            Send code
          </button>
        )}

        {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Add the panel to the customer page**

Modify `app/page.tsx`:

```tsx
import { CustomerAuthPanel } from "./customer-auth-panel";
```

Place this JSX just above the existing request form:

```tsx
<CustomerAuthPanel />
```

- [ ] **Step 6: Run UI tests**

Run:

```bash
pnpm test app/__tests__/customer-auth-panel.test.tsx app/__tests__/entry-pages.test.tsx
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/firebase/client.ts app/customer-auth-panel.tsx app/page.tsx app/__tests__/customer-auth-panel.test.tsx
git commit -m "feat: add customer auth UI"
```

## Task 8: Update Environment And Deployment Docs

**Files:**
- Modify: `.env.example`
- Modify: `apphosting.yaml`
- Modify: `docs/auth-and-data-provider-decisions.md`

- [ ] **Step 1: Update `.env.example`**

Add these variables without real secret values:

```dotenv
# Hosted Postgres. Use Neon or another managed Postgres provider; do not use local-only data for production.
DATABASE_URL=""

# Africa's Talking OTP SMS. Server-only; never expose in NEXT_PUBLIC variables.
AFRICAS_TALKING_USERNAME=""
AFRICAS_TALKING_API_KEY=""
AFRICAS_TALKING_SENDER_ID=""

# Firebase Admin custom token signing. Server-only.
FIREBASE_ADMIN_PROJECT_ID=""
FIREBASE_ADMIN_CLIENT_EMAIL=""
FIREBASE_ADMIN_PRIVATE_KEY=""
```

- [ ] **Step 2: Update `apphosting.yaml` secrets**

Add these entries under `env:`:

```yaml
  - variable: DATABASE_URL
    secret: DATABASE_URL
    availability:
      - RUNTIME
  - variable: AFRICAS_TALKING_USERNAME
    secret: AFRICAS_TALKING_USERNAME
    availability:
      - RUNTIME
  - variable: AFRICAS_TALKING_API_KEY
    secret: AFRICAS_TALKING_API_KEY
    availability:
      - RUNTIME
  - variable: AFRICAS_TALKING_SENDER_ID
    secret: AFRICAS_TALKING_SENDER_ID
    availability:
      - RUNTIME
  - variable: FIREBASE_ADMIN_PROJECT_ID
    secret: FIREBASE_ADMIN_PROJECT_ID
    availability:
      - RUNTIME
  - variable: FIREBASE_ADMIN_CLIENT_EMAIL
    secret: FIREBASE_ADMIN_CLIENT_EMAIL
    availability:
      - RUNTIME
  - variable: FIREBASE_ADMIN_PRIVATE_KEY
    secret: FIREBASE_ADMIN_PRIVATE_KEY
    availability:
      - RUNTIME
```

- [ ] **Step 3: Update provider decision implementation status**

In `docs/auth-and-data-provider-decisions.md`, change:

```markdown
- Firebase Auth is not implemented yet.
- Africa's Talking OTP is not implemented yet.
- Prisma is configured for PostgreSQL, but production `DATABASE_URL` is not wired.
```

to:

```markdown
- Firebase Auth client sign-in with custom tokens is implemented for the customer flow.
- Africa's Talking OTP delivery is implemented behind a server-only adapter.
- Prisma is configured for PostgreSQL and the schema includes customer auth persistence. Production `DATABASE_URL` must still be provided through secrets.
```

- [ ] **Step 4: Run final verification**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

```bash
git add .env.example apphosting.yaml docs/auth-and-data-provider-decisions.md
git commit -m "docs: document customer auth runtime configuration"
```

## Self-Review

- Spec coverage: The plan covers customer phone entry, OTP start and verify APIs, Africa's Talking SMS, Firebase custom tokens, Neon/Postgres persistence schema, client Firebase sign-in, deployment secrets, and tests.
- Provider secrecy: SMS and Firebase Admin code live in `src/server/*` and route handlers only. Browser code receives only API responses and Firebase custom tokens.
- Database locality: `DATABASE_URL` is documented as hosted Postgres; local-only production data is explicitly rejected.
- Dependency policy: No new dependencies are required. Existing `firebase` and `@prisma/client` packages are used.
- Follow-up boundaries: Specialist auth, admin auth/MFA, request persistence, uploads, and maps remain outside this plan.
