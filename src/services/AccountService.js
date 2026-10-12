import { SHEETS } from "./LocalStorageService";
import { hashSecret, verifySecret, normalizeEmail, isValidPin, PIN_LENGTH } from "../utils/hash";

const ACCOUNTS_KEY = "kua:accounts";
export const ACTIVE_ACCOUNT_KEY = "kua:activeAccountId";
const SESSION_KEY = "app_unlocked";

const readAccounts = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAccounts = (list) => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  notifyChange();
};

export const notifyChange = () =>
  window.dispatchEvent(new CustomEvent("kua:account-changed"));

const toPublic = (account) => {
  if (!account) return null;
  const { passwordHash, pinHash, ...rest } = account;
  return rest;
};

export const hasAccounts = () => readAccounts().length > 0;

export const listAccounts = () => readAccounts().map(toPublic);

export const getActiveId = () => localStorage.getItem(ACTIVE_ACCOUNT_KEY) || "";

export const getActive = () =>
  toPublic(readAccounts().find((a) => a.id === getActiveId()) || null);

export const findByEmail = (email) => {
  const target = normalizeEmail(email);
  return toPublic(readAccounts().find((a) => a.email === target) || null);
};

// Data lama (kunci "@Sheet" tanpa akun) dipindahkan ke akun pertama yang dibuat.
const adoptLegacyData = (accountId) => {
  let moved = 0;
  for (const sheet of Object.values(SHEETS)) {
    const legacyKey = `@${sheet}`;
    const ownedKey = `u:${accountId}:${legacyKey}`;
    if (localStorage.getItem(ownedKey) !== null) continue;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy === null) continue;
    localStorage.setItem(ownedKey, legacy);
    localStorage.removeItem(legacyKey);
    moved += 1;
  }
  return moved;
};

export const hasLegacyData = () =>
  Object.values(SHEETS).some((sheet) => {
    try {
      return (JSON.parse(localStorage.getItem(`@${sheet}`) || "[]") || []).length > 0;
    } catch {
      return false;
    }
  });

export function activate(accountId) {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
  sessionStorage.setItem(SESSION_KEY, "1");
  notifyChange();
}

export function lock() {
  sessionStorage.removeItem(SESSION_KEY);
  notifyChange();
}

export const isUnlocked = () => sessionStorage.getItem(SESSION_KEY) === "1" && !!getActiveId();

export async function createAccount({ name, email, password, pin, avatar = null }) {
  const cleanEmail = normalizeEmail(email);
  if (!name?.trim()) throw new Error("Nama wajib diisi.");
  if (!cleanEmail) throw new Error("Email wajib diisi.");
  if (!password || password.length < 6) throw new Error("Sandi minimal 6 karakter.");
  if (!isValidPin(pin)) throw new Error(`PIN harus tepat ${PIN_LENGTH} digit angka.`);

  const accounts = readAccounts();
  if (accounts.some((a) => a.email === cleanEmail)) {
    throw new Error("Email sudah terdaftar di perangkat ini.");
  }
  const pinHash = await hashSecret(pin, "pin");
  if (accounts.some((a) => a.pinHash === pinHash)) {
    throw new Error("PIN sudah dipakai akun lain. Gunakan PIN berbeda.");
  }

  const now = new Date().toISOString();
  const account = {
    id: `acc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: cleanEmail,
    avatar,
    passwordHash: await hashSecret(password, "password"),
    pinHash,
    createdAt: now,
    updatedAt: now,
  };

  writeAccounts([...accounts, account]);
  adoptLegacyData(account.id);
  activate(account.id);
  return toPublic(account);
}

export async function verifyPassword(email, password) {
  const account = readAccounts().find((a) => a.email === normalizeEmail(email));
  if (!account) return null;
  return (await verifySecret(password, "password", account.passwordHash)) ? toPublic(account) : null;
}

export async function findByPin(pin) {
  if (!isValidPin(pin)) return null;
  const pinHash = await hashSecret(pin, "pin");
  return toPublic(readAccounts().find((a) => a.pinHash === pinHash) || null);
}

const touch = (account) => ({ ...account, updatedAt: new Date().toISOString() });

export function updateProfile(accountId, { name, email, avatar }) {
  const accounts = readAccounts();
  const index = accounts.findIndex((a) => a.id === accountId);
  if (index === -1) throw new Error("Akun tidak ditemukan.");

  const cleanEmail = normalizeEmail(email ?? accounts[index].email);
  if (accounts.some((a) => a.id !== accountId && a.email === cleanEmail)) {
    throw new Error("Email sudah dipakai akun lain.");
  }

  accounts[index] = touch({
    ...accounts[index],
    name: (name ?? accounts[index].name).trim(),
    email: cleanEmail,
    avatar: avatar !== undefined ? avatar : accounts[index].avatar,
  });
  writeAccounts(accounts);
  return toPublic(accounts[index]);
}

export async function changePassword(accountId, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) throw new Error("Sandi baru minimal 6 karakter.");
  const accounts = readAccounts();
  const index = accounts.findIndex((a) => a.id === accountId);
  if (index === -1) throw new Error("Akun tidak ditemukan.");
  if (!(await verifySecret(currentPassword, "password", accounts[index].passwordHash))) {
    throw new Error("Sandi saat ini salah.");
  }
  accounts[index] = touch({
    ...accounts[index],
    passwordHash: await hashSecret(newPassword, "password"),
  });
  writeAccounts(accounts);
}

export async function changePin(accountId, currentPin, newPin) {
  if (!isValidPin(newPin)) throw new Error(`PIN baru harus tepat ${PIN_LENGTH} digit angka.`);
  const accounts = readAccounts();
  const index = accounts.findIndex((a) => a.id === accountId);
  if (index === -1) throw new Error("Akun tidak ditemukan.");
  if (!(await verifySecret(currentPin, "pin", accounts[index].pinHash))) {
    throw new Error("PIN saat ini salah.");
  }
  const newHash = await hashSecret(newPin, "pin");
  if (accounts.some((a) => a.id !== accountId && a.pinHash === newHash)) {
    throw new Error("PIN sudah dipakai akun lain. Gunakan PIN berbeda.");
  }
  accounts[index] = touch({ ...accounts[index], pinHash: newHash });
  writeAccounts(accounts);
}

export async function verifyPinOf(accountId, pin) {
  const account = readAccounts().find((a) => a.id === accountId);
  if (!account) return false;
  return verifySecret(pin, "pin", account.pinHash);
}

