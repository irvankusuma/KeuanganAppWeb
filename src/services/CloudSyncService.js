import LocalStorageService, { SHEETS } from "./LocalStorageService";
import { firebaseConfig } from "../firebaseConfig";

export const isFirebaseConfigured = Boolean(
  firebaseConfig?.apiKey && !String(firebaseConfig.apiKey).includes("ISI_")
);

let mods = null;
let auth = null;
let db = null;

async function ensureFirebase() {
  if (mods) return mods;
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const app = initializeApp(firebaseConfig);
  auth = authMod.getAuth(app);
  db = fsMod.getFirestore(app);
  mods = { authMod, fsMod };
  return mods;
}

const AUTH_ERRORS = {
  "auth/invalid-credential": "Email atau password salah.",
  "auth/invalid-login-credentials": "Email atau password salah.",
  "auth/user-not-found": "Email belum terdaftar. Pilih tab Daftar dulu.",
  "auth/wrong-password": "Password salah.",
  "auth/email-already-in-use": "Email sudah terdaftar. Pilih tab Masuk.",
  "auth/weak-password": "Password minimal 6 karakter.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/user-not-found": "Email tidak terdaftar. Pilih tab Daftar dulu.",
  "auth/network-request-failed": "Gagal terhubung. Periksa internet Anda.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu sebentar lagi.",
  "auth/operation-not-allowed": "Login email/password belum diaktifkan di Firebase Console.",
};

export function friendlyAuthError(err) {
  const code = err?.code || "";
  const msg = err?.message || "";
  if (code === "permission-denied" || msg.includes("Missing or insufficient permissions")) {
    return "Akses database ditolak. Di Firebase Console: buat Firestore Database (lokasi singapore), lalu publish aturan keamanan yang tertera di halaman Backup Cloud.";
  }
  if (code === "unavailable") {
    return "Tidak bisa terhubung ke server Firebase. Periksa koneksi internet.";
  }
  return AUTH_ERRORS[code] || msg || "Terjadi kesalahan tidak diketahui.";
}

export function onAuthChange(cb) {
  if (!isFirebaseConfigured) {
    cb(null);
    return () => {};
  }
  let unsub = null;
  let cancelled = false;
  ensureFirebase().then(({ authMod }) => {
    if (cancelled) return;
    unsub = authMod.onAuthStateChanged(auth, (u) =>
      cb(u ? { uid: u.uid, email: u.email } : null)
    );
  });
  return () => {
    cancelled = true;
    if (unsub) unsub();
  };
}

export async function register(email, password) {
  const { authMod } = await ensureFirebase();
  await authMod.createUserWithEmailAndPassword(auth, email, password);
}

export async function login(email, password) {
  const { authMod } = await ensureFirebase();
  await authMod.signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  const { authMod } = await ensureFirebase();
  await authMod.signOut(auth);
}

export async function sendPasswordReset(email) {
  const { authMod } = await ensureFirebase();
  await authMod.sendPasswordResetEmail(auth, email);
}

export function collectLocal() {
  const data = {};
  for (const name of Object.values(SHEETS)) {
    data[name] = LocalStorageService.readSheet(name);
  }
  return data;
}

export function countRows(data) {
  return Object.values(data).reduce((n, rows) => n + (rows?.length || 0), 0);
}

export function getLastPushMs() {
  return Number(localStorage.getItem("kua:lastPushMs") || 0);
}

export async function pushToCloud() {
  const { fsMod } = await ensureFirebase();
  const user = auth?.currentUser;
  if (!user) throw new Error("Belum login ke akun cloud.");
  const data = collectLocal();
  await fsMod.setDoc(fsMod.doc(db, "backups", user.uid), {
    data,
    updatedAtMs: Date.now(),
    device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "HP" : "Komputer",
  });
  const ms = Date.now();
  localStorage.setItem("kua:lastPushMs", String(ms));
  return ms;
}

export async function fetchCloud() {
  const { fsMod } = await ensureFirebase();
  const user = auth?.currentUser;
  if (!user) return null;
  const snap = await fsMod.getDoc(fsMod.doc(db, "backups", user.uid));
  return snap.exists() ? snap.data() : null;
}

export async function restoreFromCloud() {
  const cloud = await fetchCloud();
  if (!cloud?.data) return null;
  for (const [sheet, rows] of Object.entries(cloud.data)) {
    if (Array.isArray(rows)) LocalStorageService.writeSheet(sheet, rows);
  }
  const ms = Number(cloud.updatedAtMs) || Date.now();
  localStorage.setItem("kua:lastAppliedCloudMs", String(ms));
  localStorage.setItem("kua:lastChangeMs", String(ms));
  return cloud;
}
