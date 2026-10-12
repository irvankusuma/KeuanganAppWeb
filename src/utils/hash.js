const toHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// Fallback untuk konteks non-HTTPS di mana crypto.subtle tidak tersedia.
const weakHash = (value) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

export async function hashSecret(value, purpose = "generic") {
  const salted = `KeuanganApp:${purpose}:${value}`;
  if (globalThis.crypto?.subtle) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salted));
    return `sha256:${toHex(new Uint8Array(buffer))}`;
  }
  return `h1:${weakHash(salted)}`;
}

export async function verifySecret(value, purpose, stored) {
  if (!stored) return false;
  return (await hashSecret(value, purpose)) === stored;
}

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const PIN_LENGTH = 8;

export const isValidPin = (pin) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(String(pin ?? ""));

export const digitsOnly = (value, max = PIN_LENGTH) =>
  String(value ?? "").replace(/\D/g, "").slice(0, max);
