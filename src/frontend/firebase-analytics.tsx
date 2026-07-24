"use client";

import { useEffect } from "react";
import { initializeFirebaseAnalytics } from "@/frontend/lib/firebase/client";

export function FirebaseAnalytics() {
  useEffect(() => {
    void initializeFirebaseAnalytics();
  }, []);

  return null;
}
