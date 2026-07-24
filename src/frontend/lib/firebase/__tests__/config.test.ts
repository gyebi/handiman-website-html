import { afterEach, describe, expect, test } from "vitest";
import { getFirebaseConfig, isFirebaseAnalyticsEnabled } from "../config";

const firebaseEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
] as const;

const originalEnv = { ...process.env };

afterEach(() => {
  for (const key of firebaseEnvKeys) {
    delete process.env[key];
  }

  Object.assign(process.env, originalEnv);
});

describe("Firebase client config", () => {
  test("maps public environment variables to the Firebase SDK config shape", () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "api-key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "example.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "example-project";
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "example.firebasestorage.app";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456789";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456789:web:abcdef";
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = "G-ABCDEF123";

    expect(getFirebaseConfig()).toEqual({
      apiKey: "api-key",
      authDomain: "example.firebaseapp.com",
      projectId: "example-project",
      storageBucket: "example.firebasestorage.app",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef",
      measurementId: "G-ABCDEF123",
    });
  });

  test("leaves analytics disabled when the measurement id is absent", () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "api-key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "example.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "example-project";
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "example.firebasestorage.app";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456789";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456789:web:abcdef";

    expect(isFirebaseAnalyticsEnabled()).toBe(false);
  });
});
