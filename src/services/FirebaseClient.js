import { getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, indexedDBLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "../firebaseConfig";

const requiredConfig = ["apiKey", "authDomain", "projectId", "appId"];
export const isFirebaseConfigured = requiredConfig.every((key) => {
  const value = firebaseConfig?.[key];
  return typeof value === "string" && value.trim() && !value.includes("ISI_");
});

if (!isFirebaseConfigured) {
  throw new Error("Konfigurasi Firebase belum lengkap. Periksa src/firebaseConfig.js.");
}

export const firebaseApp = getApps()[0] || initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Auth token lives in IndexedDB; financial records are stored only in Firestore.
export const authPersistenceReady = setPersistence(auth, indexedDBLocalPersistence).catch(async (error) => {
  console.warn("IndexedDB auth persistence unavailable; using in-memory auth persistence.", error);
  await setPersistence(auth, inMemoryPersistence);
});
