import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import * as CloudAuth from "./CloudAuthService";
import CloudDataService, { SHEETS } from "./CloudDataService";
import * as Accounts from "./AccountService";
import { db } from "./FirebaseClient";

const SHEET_NAMES = Object.values(SHEETS);
const OLD_BACKUP_REF = (uid) => doc(db, "backups", uid);

let status = { status: "signed-out", ready: false, uid: "", message: "" };
let authUnsubscribe = null;
let dataUnsubscribes = [];
let activeUid = "";
let connectionGeneration = 0;

const emitStatus = (next) => {
  status = { ...status, ...next };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kua:cloud-status", { detail: { ...status } }));
  }
};

export const getCloudStatus = () => ({ ...status });

const randomId = () => globalThis.crypto?.randomUUID?.() || `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

const cleanFirestoreValue = (value) => {
  if (Array.isArray(value)) return value.map((item) => item === undefined ? null : cleanFirestoreValue(item));
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, cleanFirestoreValue(item)]));
  }
  return value;
};

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().filter((key) => key !== "id").map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const sheetRowsRef = (uid, sheet) => collection(db, "users", uid, "sheets", sheet, "rows");
const rowRef = (uid, sheet, id) => doc(db, "users", uid, "sheets", sheet, "rows", encodeURIComponent(String(id)));

function parseRows(raw) {
  try {
    const rows = JSON.parse(raw || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function readLegacyLocalData(accountId) {
  const data = {};
  const usedKeys = [];
  for (const sheet of SHEET_NAMES) {
    const rows = [];
    const accountKey = accountId ? `u:${accountId}:@${sheet}` : "";
    const legacyKey = `@${sheet}`;
    for (const key of [accountKey, legacyKey].filter(Boolean)) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      usedKeys.push(key);
      rows.push(...parseRows(raw));
    }
    data[sheet] = rows;
  }
  // Some older accounts stored income under Pendapatan in account-scoped keys.
  for (const key of [accountId ? `u:${accountId}:@Pendapatan` : "", "@Pendapatan"].filter(Boolean)) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    usedKeys.push(key);
    data[SHEETS.PEMASUKAN].push(...parseRows(raw));
  }
  const targetRaw = localStorage.getItem("@TargetTabungan");
  if (targetRaw !== null) {
    usedKeys.push("@TargetTabungan");
    const target = Number.parseFloat(targetRaw);
    if (Number.isFinite(target) && target > 0) {
      data[SHEETS.APP_SETTINGS].push({ id: "targetTabungan", value: target });
    }
  }
  return { data, usedKeys };
}

function hasLegacyRowsForAccount(accountId) {
  if (!accountId) return false;
  const keys = [
    ...SHEET_NAMES.map((sheet) => `u:${accountId}:@${sheet}`),
    `u:${accountId}:@Pendapatan`,
  ];
  return keys.some((key) => parseRows(localStorage.getItem(key)).length > 0);
}

function readOldCloudBackup(snapshot) {
  if (!snapshot?.exists()) return {};
  const backup = snapshot.data();
  if (Number(backup?.migratedToVersion) >= 2) return {};
  const value = backup?.data;
  return value && typeof value === "object" ? value : {};
}

function mergeRows(...groups) {
  const merged = [];
  const byId = new Map();
  for (const group of groups) {
    for (const source of Array.isArray(group) ? group : []) {
      if (!source || typeof source !== "object") continue;
      const row = { ...source, id: String(source.id ?? randomId()) };
      const previous = byId.get(row.id);
      if (!previous) {
        byId.set(row.id, row);
        merged.push(row);
        continue;
      }
      if (canonical(previous) === canonical(row)) continue;

      // Keep both values if two old devices reused the same numeric row id.
      const copied = { ...row, id: randomId(), migratedFromId: row.id };
      byId.set(copied.id, copied);
      merged.push(copied);
    }
  }
  return merged;
}

async function writeRowsInBatches(uid, rowsBySheet) {
  let batch = writeBatch(db);
  let writes = 0;
  const commitIfNeeded = async (force = false) => {
    if (writes === 0 || (!force && writes < 450)) return;
    await batch.commit();
    batch = writeBatch(db);
    writes = 0;
  };

  for (const [sheet, rows] of Object.entries(rowsBySheet)) {
    for (const row of rows) {
      const id = String(row.id ?? randomId());
      batch.set(rowRef(uid, sheet, id), cleanFirestoreValue({ ...row, id }));
      writes += 1;
      await commitIfNeeded();
    }
  }
  await commitIfNeeded(true);
}

function clearMigratedLocalData(accountId, usedKeys) {
  usedKeys.forEach((key) => localStorage.removeItem(key));
  if (accountId) {
    for (const sheet of SHEET_NAMES) localStorage.removeItem(`u:${accountId}:@${sheet}`);
  }
}

async function readCurrentCloudRows(uid) {
  const rows = {};
  for (const sheet of SHEET_NAMES) {
    const snapshot = await getDocs(sheetRowsRef(uid, sheet));
    rows[sheet] = snapshot.docs.map((item) => ({ ...item.data(), id: item.data().id ?? decodeURIComponent(item.id) }));
  }
  return rows;
}

async function migrateAndLoad(user, generation) {
  const legacyAccount = Accounts.findLegacyAccountByEmail(user.email);
  const legacyActiveId = Accounts.getLegacyActiveId();
  if (legacyActiveId && legacyActiveId !== legacyAccount?.id && hasLegacyRowsForAccount(legacyActiveId)) {
    throw new Error("Data lama masih terkait dengan akun lokal lain. Masuk menggunakan email akun lama agar datanya dipindahkan ke cloud dengan aman.");
  }
  const legacyAccountId = legacyAccount?.id || "";
  const local = readLegacyLocalData(legacyAccountId);
  const [cloudRows, oldBackupSnapshot, profile] = await Promise.all([
    readCurrentCloudRows(user.uid),
    getDoc(OLD_BACKUP_REF(user.uid)),
    CloudAuth.getProfile(user.uid),
  ]);
  if (generation !== connectionGeneration) return null;

  const oldBackup = readOldCloudBackup(oldBackupSnapshot);
  if (Array.isArray(oldBackup.Pendapatan)) {
    oldBackup[SHEETS.PEMASUKAN] = [...(oldBackup[SHEETS.PEMASUKAN] || []), ...oldBackup.Pendapatan];
    delete oldBackup.Pendapatan;
  }
  const hasLegacyRows = Object.values(local.data).some((rows) => rows.length > 0);
  const hasOldBackupRows = Object.values(oldBackup).some((rows) => Array.isArray(rows) && rows.length > 0);
  const merged = {};
  for (const sheet of SHEET_NAMES) {
    merged[sheet] = mergeRows(cloudRows[sheet], oldBackup[sheet], local.data[sheet]);
  }

  // Upload and verify legacy data before deleting its old browser copy.
  if (hasLegacyRows || hasOldBackupRows) {
    await writeRowsInBatches(user.uid, merged);
    if (hasOldBackupRows) {
      await setDoc(OLD_BACKUP_REF(user.uid), {
        data: {},
        migratedToVersion: 2,
        migratedAt: serverTimestamp(),
      }, { merge: true });
    }
  }
  if (local.usedKeys.length) clearMigratedLocalData(legacyAccountId, local.usedKeys);
  // The active legacy account ID is needed to locate old data until upload succeeds.
  if (!legacyActiveId || legacyActiveId === legacyAccount?.id) {
    localStorage.removeItem("kua:activeAccountId");
  }
  if (generation !== connectionGeneration) return null;

  const account = legacyAccount
    ? Accounts.linkCloudIdentity(legacyAccount.id, user.uid, profile || legacyAccount)
    : Accounts.ensureCloudAccount(user.uid, profile || { email: user.email, name: user.displayName || user.email?.split("@")[0] });
  Accounts.activate(account.id);
  if (legacyAccount) Accounts.removeLegacyAccount(legacyAccount.id);

  for (const sheet of SHEET_NAMES) {
    CloudDataService.replaceSheetFromCloud(sheet, merged[sheet], { emit: false });
  }
  return merged;
}

async function writeChangedRows(uid, sheetName, previousRows, nextRows) {
  if (activeUid !== uid) throw new Error("Akun cloud berubah sebelum data disimpan.");
  const before = new Map((previousRows || []).map((row) => [String(row.id), row]));
  const after = new Map((nextRows || []).map((row) => [String(row.id), row]));
  const operations = [];

  for (const [id, row] of after) {
    const previous = before.get(id);
    if (!previous || JSON.stringify(cleanFirestoreValue(previous)) !== JSON.stringify(cleanFirestoreValue(row))) {
      operations.push({ type: "set", id, row: cleanFirestoreValue({ ...row, id }) });
    }
  }
  for (const id of before.keys()) {
    if (!after.has(id)) operations.push({ type: "delete", id });
  }

  emitStatus({ status: "syncing", ready: true, uid, message: "Menyimpan perubahan ke cloud…" });
  try {
    for (let start = 0; start < operations.length; start += 450) {
      const batch = writeBatch(db);
      operations.slice(start, start + 450).forEach((operation) => {
        const ref = rowRef(uid, sheetName, operation.id);
        if (operation.type === "set") batch.set(ref, operation.row);
        else batch.delete(ref);
      });
      await batch.commit();
    }
    emitStatus({ status: "ready", ready: true, uid, message: "Tersimpan di cloud" });
  } catch (error) {
    emitStatus({ status: "error", ready: true, uid, message: CloudAuth.friendlyCloudError(error) });
    throw error;
  }
}

async function connectUser(user) {
  if (activeUid === user.uid && status.ready) return;
  const generation = ++connectionGeneration;
  activeUid = user.uid;
  dataUnsubscribes.forEach((unsubscribe) => unsubscribe());
  dataUnsubscribes = [];
  CloudDataService.clearCloudData();
  emitStatus({ status: "connecting", ready: false, uid: user.uid, message: "Menghubungkan ke database cloud…" });

  try {
    await migrateAndLoad(user, generation);
    if (generation !== connectionGeneration) return;

    const initialSnapshots = SHEET_NAMES.map((sheet) => new Promise((resolve, reject) => {
      let firstSnapshot = true;
      const unsubscribe = onSnapshot(sheetRowsRef(user.uid, sheet), (snapshot) => {
        const rows = snapshot.docs.map((item) => ({ ...item.data(), id: item.data().id ?? decodeURIComponent(item.id) }));
        CloudDataService.replaceSheetFromCloud(sheet, rows);
        if (firstSnapshot) {
          firstSnapshot = false;
          resolve();
        }
      }, (error) => {
        emitStatus({ status: "error", ready: false, uid: user.uid, message: CloudAuth.friendlyCloudError(error) });
        if (firstSnapshot) reject(error);
      });
      dataUnsubscribes.push(unsubscribe);
    }));

    await Promise.all(initialSnapshots);
    if (generation !== connectionGeneration) return;
    CloudDataService.setCloudWriter((sheet, previous, next) => writeChangedRows(user.uid, sheet, previous, next));
    emitStatus({ status: "ready", ready: true, uid: user.uid, message: "Tersimpan dan tersinkron realtime" });
  } catch (error) {
    if (generation !== connectionGeneration) return;
    CloudDataService.setCloudWriter(null);
    emitStatus({ status: "error", ready: false, uid: user.uid, message: CloudAuth.friendlyCloudError(error) });
  }
}

function disconnectUser() {
  connectionGeneration += 1;
  activeUid = "";
  dataUnsubscribes.forEach((unsubscribe) => unsubscribe());
  dataUnsubscribes = [];
  CloudDataService.clearCloudData();
  Accounts.clearActiveCloudAccount();
  emitStatus({ status: "signed-out", ready: false, uid: "", message: "" });
}

export function startRealtimeSync() {
  let disposed = false;
  CloudAuth.onAuthChange((user) => {
    if (disposed) return;
    if (!user) {
      disconnectUser();
      return;
    }
    connectUser(user);
  }).then((unsubscribe) => {
    authUnsubscribe = unsubscribe;
    if (disposed) unsubscribe();
  }).catch((error) => {
    emitStatus({ status: "error", ready: false, message: CloudAuth.friendlyCloudError(error) });
  });

  const onOffline = () => {
    CloudDataService.setCloudWriter(null);
    emitStatus({ status: "error", ready: false, message: "Tidak ada koneksi internet. Data baru tidak dapat disimpan ke cloud." });
  };
  const onOnline = () => {
    const user = CloudAuth.getCurrentUser();
    if (!user) return;
    activeUid = "";
    emitStatus({ status: "connecting", ready: false, uid: user.uid, message: "Menyambungkan kembali ke cloud…" });
    connectUser(user);
  };
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);

  return () => {
    disposed = true;
    authUnsubscribe?.();
    authUnsubscribe = null;
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("online", onOnline);
    disconnectUser();
  };
}
