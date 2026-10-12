import { normalizeEmail, verifySecret } from "../utils/hash";

const LEGACY_ACCOUNTS_KEY = "kua:accounts";
const LEGACY_ACTIVE_KEY = "kua:activeAccountId";
const SESSION_KEY = "app_unlocked";

let activeProfile = null;

const readLegacyAccounts = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_ACCOUNTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const publicProfile = (account) => {
  if (!account) return null;
  const { passwordHash, pinHash, ...profile } = account;
  return profile;
};

export const notifyChange = () => window.dispatchEvent(new CustomEvent("kua:account-changed"));
export const getActiveId = () => activeProfile?.id || "";
export const getLegacyActiveId = () => localStorage.getItem(LEGACY_ACTIVE_KEY) || "";
export const getActive = () => activeProfile ? { ...activeProfile } : null;
export const isUnlocked = () => sessionStorage.getItem(SESSION_KEY) === "1" && !!activeProfile?.id;
export const listAccounts = () => activeProfile ? [{ ...activeProfile }] : [];
export const hasAccounts = () => Boolean(activeProfile);
export const hasLegacyAccounts = () => readLegacyAccounts().length > 0;

export const findLegacyAccountByEmail = (email) => {
  const target = normalizeEmail(email);
  return publicProfile(readLegacyAccounts().find((account) => normalizeEmail(account.email) === target) || null);
};

export async function verifyPassword(email, password) {
  const account = readLegacyAccounts().find((item) => normalizeEmail(item.email) === normalizeEmail(email));
  if (!account?.passwordHash) return null;
  return (await verifySecret(password, "password", account.passwordHash)) ? publicProfile(account) : null;
}

const writeLegacyAccounts = (accounts) => {
  localStorage.setItem(LEGACY_ACCOUNTS_KEY, JSON.stringify(accounts));
};

export function linkCloudIdentity(accountId, cloudUid, cloudProfile = {}) {
  const accounts = readLegacyAccounts();
  const index = accounts.findIndex((account) => account.id === accountId || account.cloudUid === cloudUid);
  if (index === -1) return ensureCloudAccount(cloudUid, cloudProfile);

  const legacy = accounts[index];
  accounts[index] = {
    ...legacy,
    cloudUid,
    name: cloudProfile.name || legacy.name,
    email: normalizeEmail(cloudProfile.email || legacy.email),
    avatar: cloudProfile.avatar ?? legacy.avatar ?? null,
    updatedAt: new Date().toISOString(),
  };
  // Firebase is now the credential authority. Retain the profile until its old data migrates.
  delete accounts[index].passwordHash;
  delete accounts[index].pinHash;
  writeLegacyAccounts(accounts);
  activeProfile = publicProfile(accounts[index]);
  notifyChange();
  return { ...activeProfile };
}

export function ensureCloudAccount(cloudUid, cloudProfile = {}) {
  const legacy = readLegacyAccounts().find((account) => account.cloudUid === cloudUid);
  activeProfile = {
    id: legacy?.id || `cloud_${cloudUid}`,
    cloudUid,
    name: String(cloudProfile.name || legacy?.name || cloudProfile.email?.split("@")[0] || "Pengguna").trim(),
    email: normalizeEmail(cloudProfile.email || legacy?.email || ""),
    avatar: cloudProfile.avatar ?? legacy?.avatar ?? null,
    createdAt: legacy?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notifyChange();
  return { ...activeProfile };
}

export function removeLegacyAccount(accountId) {
  const accounts = readLegacyAccounts().filter((account) => account.id !== accountId);
  if (accounts.length) writeLegacyAccounts(accounts);
  else localStorage.removeItem(LEGACY_ACCOUNTS_KEY);
}

export function activate(accountId) {
  if (activeProfile && activeProfile.id !== accountId) {
    activeProfile = { ...activeProfile, id: accountId };
  }
  sessionStorage.setItem(SESSION_KEY, "1");
  notifyChange();
}

export function lock() {
  sessionStorage.removeItem(SESSION_KEY);
  activeProfile = null;
  notifyChange();
}

export function clearActiveCloudAccount() {
  sessionStorage.removeItem(SESSION_KEY);
  activeProfile = null;
  notifyChange();
}

export function updateProfile(accountId, updates) {
  if (!activeProfile || activeProfile.id !== accountId) throw new Error("Akun cloud tidak aktif.");
  activeProfile = {
    ...activeProfile,
    name: String(updates.name ?? activeProfile.name).trim(),
    email: normalizeEmail(updates.email ?? activeProfile.email),
    avatar: updates.avatar !== undefined ? updates.avatar : activeProfile.avatar,
    updatedAt: new Date().toISOString(),
  };
  notifyChange();
  return { ...activeProfile };
}
