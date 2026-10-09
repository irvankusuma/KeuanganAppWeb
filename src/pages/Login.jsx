import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, LogIn, Eye, EyeOff, Lock, ShieldCheck, Loader2, Mail } from "lucide-react";
import * as CloudSync from "../services/CloudSyncService";

/**
 * Alur masuk dua lapis:
 *   1. Akun cloud (email + password Firebase) — pintu utama & kunci backup.
 *   2. PIN perangkat — kunci cepat setiap kali aplikasi dibuka ulang.
 * PIN disimpan sebagai hash (bukan teks asli) di localStorage.
 */
const PIN_KEY = "app_pin";
const LOCK_KEY = "app_pin_lock";
const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 60_000;

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
  return `h1:${(h >>> 0).toString(16)}`;
};

const hashPin = async (pin) => {
  const salted = `KeuanganApp:${pin}`;
  if (globalThis.crypto?.subtle) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salted));
    return `sha256:${toHex(new Uint8Array(buffer))}`;
  }
  return weakHash(salted);
};

const verifyPin = async (pin, stored) => {
  if (!stored) return false;
  if (stored.startsWith("sha256:") || stored.startsWith("h1:")) {
    return (await hashPin(pin)) === stored;
  }
  return pin === stored;
};

const readLock = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCK_KEY) || "{}");
    return { count: Number(parsed.count) || 0, until: Number(parsed.until) || 0 };
  } catch {
    return { count: 0, until: 0 };
  }
};

const writeLock = (count, until) => {
  localStorage.setItem(LOCK_KEY, JSON.stringify({ count, until }));
};

const inputCls =
  "w-full bg-[#141d2e] border border-[#1e2d45] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-colors disabled:opacity-50";

function Logo({ subtitle }) {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
        <DollarSign size={28} className="text-white" />
      </div>
      <h1 className="text-xl font-bold text-white">KeuanganApp</h1>
      <p className="text-sm text-slate-400 mt-1 text-center">{subtitle}</p>
    </div>
  );
}

/* ─── Lapis 1: akun cloud (email + password) ─── */
function CloudGate() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setSent(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await CloudSync.login(email.trim(), password);
      else if (mode === "register") await CloudSync.register(email.trim(), password);
      else {
        await CloudSync.sendPasswordReset(email.trim());
        setSent(true);
      }
    } catch (err) {
      setError(CloudSync.friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Logo subtitle="Masuk untuk melanjutkan — data Anda tersimpan aman di cloud" />

        <div className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl p-6 shadow-2xl">
          {mode !== "forgot" && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-black/30 rounded-xl mb-5">
              {[["login", "Masuk"], ["register", "Daftar Akun"]].map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`py-2 rounded-lg text-xs font-bold transition-colors ${mode === m ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="nama@email.com"
                className={inputCls}
                autoFocus
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Sandi {mode === "register" && "(min. 6 karakter)"}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••"
                  className={inputCls}
                />
              </div>
            )}

            {mode === "forgot" && sent && (
              <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                Link reset sandi telah dikirim ke {email.trim()}. Cek inbox (atau folder spam) email Anda.
              </p>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {busy
                ? "Memproses..."
                : mode === "login"
                  ? "Masuk"
                  : mode === "register"
                    ? "Daftar & Masuk"
                    : "Kirim Link Reset Sandi"}
            </button>
          </form>

          <div className="mt-4 text-center">
            {mode !== "forgot" ? (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Lupa sandi / lupa akun?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Kembali ke halaman masuk
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} />
          Akun menghubungkan perangkat Anda dengan backup cloud pribadi
        </p>
      </div>
    </div>
  );
}

/* ─── Lapis 2: PIN perangkat ─── */
function PinGate({ cloudEmail, onSwitchAccount }) {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  const storedPin = localStorage.getItem(PIN_KEY);
  const isFirstTime = !storedPin;

  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(() => {
    const lock = readLock();
    return lock.until > Date.now() ? lock.until : 0;
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockedUntil) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const remainingSeconds = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
  const isLocked = remainingSeconds > 0;

  const unlock = () => {
    sessionStorage.setItem("app_unlocked", "1");
    navigate("/");
  };

  const registerFailure = () => {
    const lock = readLock();
    const count = lock.count + 1;
    if (count >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCK_DURATION;
      writeLock(0, until);
      setLockedUntil(until);
      setNow(Date.now());
      setError(`Terlalu banyak percobaan salah. Coba lagi dalam ${Math.ceil(LOCK_DURATION / 1000)} detik.`);
    } else {
      writeLock(count, 0);
      setError(`PIN salah. Sisa percobaan: ${MAX_ATTEMPTS - count}.`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (isLocked || loading) return;

    if (isFirstTime) {
      if (pin.length < 4) {
        setError("PIN minimal 4 digit.");
        return;
      }
      if (pin !== pinConfirm) {
        setError("Konfirmasi PIN tidak cocok.");
        return;
      }
      setLoading(true);
      try {
        localStorage.setItem(PIN_KEY, await hashPin(pin));
        writeLock(0, 0);
        unlock();
      } catch {
        setError("Gagal menyimpan PIN di perangkat ini.");
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    const matches = await verifyPin(pin, storedPin);
    if (matches) {
      // Migrasi PIN polos (data lama) menjadi hash.
      if (!storedPin.startsWith("sha256:") && !storedPin.startsWith("h1:")) {
        localStorage.setItem(PIN_KEY, await hashPin(pin));
      }
      writeLock(0, 0);
      timeoutRef.current = setTimeout(unlock, 250);
      return;
    }

    setPin("");
    registerFailure();
    setLoading(false);
  };

  const handleSkip = () => {
    sessionStorage.setItem("app_unlocked", "1");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Logo subtitle={isFirstTime ? "Buat PIN untuk melindungi data Anda" : "Masukkan PIN untuk melanjutkan"} />

        {cloudEmail && (
          <p className="text-center text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
            Login cloud aktif: {cloudEmail}
          </p>
        )}

        <div className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {isFirstTime ? "Buat PIN baru" : "PIN"}
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  disabled={isLocked}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  placeholder="••••"
                  className={`${inputCls} pr-10 tracking-widest`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  title={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isFirstTime && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Konfirmasi PIN
                </label>
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pinConfirm}
                  onChange={(e) => {
                    setPinConfirm(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  placeholder="••••"
                  className={`${inputCls} tracking-widest`}
                />
              </div>
            )}

            {isLocked && (
              <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <Lock size={14} className="shrink-0" />
                <span>Terkunci sementara. Coba lagi dalam {remainingSeconds} detik.</span>
              </div>
            )}

            {error && !isLocked && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? "Memverifikasi..." : isFirstTime ? "Buat PIN & Masuk" : "Masuk"}
            </button>

            {isFirstTime && (
              <button
                type="button"
                onClick={handleSkip}
                className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 transition-colors"
              >
                Lewati, gunakan tanpa PIN
              </button>
            )}
          </form>
        </div>

        {onSwitchAccount && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onSwitchAccount}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Ganti akun cloud / keluar akun
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} />
          PIN disimpan sebagai hash di perangkat ini
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [fbUser, setFbUser] = useState(CloudSync.isFirebaseConfigured ? undefined : null);

  useEffect(() => {
    if (sessionStorage.getItem("app_unlocked")) {
      navigate("/", { replace: true });
      return undefined;
    }
    if (!CloudSync.isFirebaseConfigured) return undefined;
    return CloudSync.onAuthChange(setFbUser);
  }, [navigate]);

  if (CloudSync.isFirebaseConfigured && fbUser === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <Loader2 size={28} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (CloudSync.isFirebaseConfigured && !fbUser) {
    return <CloudGate />;
  }

  return (
    <PinGate
      cloudEmail={fbUser?.email}
      onSwitchAccount={
        CloudSync.isFirebaseConfigured
          ? () => CloudSync.logout().then(() => setFbUser(null))
          : undefined
      }
    />
  );
}
