import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  updateEmail,
  updatePassword,
  updateProfile as updateAuthProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, authPersistenceReady, db } from "./FirebaseClient";

const profileRef = (uid) => doc(db, "users", uid, "profile", "main");

export const getCurrentUser = () => auth.currentUser;

export async function onAuthChange(callback) {
  await authPersistenceReady;
  return onAuthStateChanged(auth, callback);
}

export async function signIn(email, password) {
  await authPersistenceReady;
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

export async function register(email, password) {
  await authPersistenceReady;
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

export async function getProfile(uid) {
  const snapshot = await getDoc(profileRef(uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveProfile(user, profile) {
  if (!user?.uid) throw new Error("Sesi cloud belum aktif.");
  const cleanProfile = {
    name: String(profile.name || user.displayName || user.email?.split("@")[0] || "Pengguna").trim(),
    email: user.email || profile.email || "",
    avatar: profile.avatar || null,
    updatedAt: serverTimestamp(),
  };
  await updateAuthProfile(user, { displayName: cleanProfile.name });
  await setDoc(profileRef(user.uid), cleanProfile, { merge: true });
  return { id: user.uid, uid: user.uid, ...cleanProfile, updatedAt: new Date().toISOString() };
}

export async function ensureProfile(user, fallback = {}) {
  const profile = await getProfile(user.uid);
  if (profile?.name) {
    return { id: user.uid, uid: user.uid, ...profile, email: user.email || profile.email || "" };
  }
  return saveProfile(user, {
    name: fallback.name || user.displayName || user.email?.split("@")[0],
    avatar: fallback.avatar || null,
  });
}

export async function updateProfile(user, updates) {
  if (!user) throw new Error("Sesi cloud berakhir. Masuk kembali.");
  const current = (await getProfile(user.uid)) || {};
  const nextName = String(updates.name ?? current.name ?? user.displayName ?? "").trim();
  const nextEmail = String(updates.email ?? user.email ?? "").trim().toLowerCase();
  if (!nextName) throw new Error("Nama wajib diisi.");
  if (!nextEmail) throw new Error("Email wajib diisi.");
  if (nextEmail !== String(user.email || "").toLowerCase()) {
    await updateEmail(user, nextEmail);
  }
  await updateAuthProfile(user, { displayName: nextName });
  const next = { name: nextName, email: nextEmail, avatar: updates.avatar ?? current.avatar ?? null, updatedAt: serverTimestamp() };
  await setDoc(profileRef(user.uid), next, { merge: true });
  return { id: user.uid, uid: user.uid, ...next, updatedAt: new Date().toISOString() };
}

export async function changePassword(user, currentPassword, nextPassword) {
  if (!user?.email) throw new Error("Sesi cloud berakhir. Masuk kembali.");
  if (!nextPassword || nextPassword.length < 6) throw new Error("Sandi baru minimal 6 karakter.");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, nextPassword);
}

export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logout() {
  await signOut(auth);
}

export function friendlyCloudError(error) {
  const code = error?.code || "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email atau sandi salah.";
  }
  if (code === "auth/email-already-in-use") return "Email sudah terdaftar. Silakan masuk.";
  if (code === "auth/weak-password") return "Sandi minimal 6 karakter.";
  if (code === "auth/invalid-email") return "Format email tidak valid.";
  if (code === "auth/network-request-failed" || code === "unavailable") return "Koneksi internet bermasalah. Data belum dapat dikirim ke cloud.";
  if (code === "permission-denied" || error?.message?.includes("Missing or insufficient permissions")) {
    return "Akses Firestore ditolak. Aturan keamanan Firestore perlu dipublikasikan dari file firestore.rules.";
  }
  if (code === "auth/operation-not-allowed") return "Aktifkan metode Email/Password di Firebase Authentication.";
  return error?.message || "Terjadi kesalahan saat mengakses cloud.";
}
