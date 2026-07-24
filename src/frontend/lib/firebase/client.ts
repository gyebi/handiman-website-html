"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import {
  getAuth,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  type Auth,
  type UserCredential,
} from "firebase/auth";
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

export function signInWithFirebaseEmailPassword(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export function sendFirebasePasswordResetEmail(email: string): Promise<void> {
  return sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function getCurrentFirebaseIdToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    return null;
  }

  return user.getIdToken();
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
