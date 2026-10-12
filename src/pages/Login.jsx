import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  LogIn,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  UserPlus,
  ArrowLeft,
  Camera,
  KeyRound,
  Mail,
} from "lucide-react";
import * as Accounts from "../services/AccountService";
import { digitsOnly, isValidPin, PIN_LENGTH } from "../utils/hash";
import { fileToAvatarDataUrl } from "../utils/avatar";
import Avatar from "../components/Avatar";

/**
 * Kunci akses dua lapis, seluruhnya tersimpan di perangkat ini:
 *   1. Email + sandi -> identitas akun
 *   2. PIN 8 digit   -> pembuka kunci sekaligus pencocok profil akun
 */
const LOCK_KEY = "kua:pinLock";
const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 60_000;

const inputCls =
  "w-full bg-[#141d2e] border border-[#1e2d45] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-colors disabled:opacity-50";
const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";
const primaryBtn =
  "w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed";

const readLock = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCK_KEY) || "{}");
    return { count: Number(parsed.count) || 0, until: Number(parsed.until) || 0 };
  } catch {
    return { count: 0, until: 0 };
  }
};

function usePinLock() {
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

  const remaining = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;

  const registerFailure = () => {
    const count = readLock().count + 1;
    if (count >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCK_DURATION;
      localStorage.setItem(LOCK_KEY, JSON.stringify({ count: 0, until }));
      setLockedUntil(until);
      setNow(Date.now());
      return `Terlalu banyak percobaan salah. Coba lagi dalam ${Math.ceil(LOCK_DURATION / 1000)} detik.`;
    }
    localStorage.setItem(LOCK_KEY, JSON.stringify({ count, until: 0 }));
    return `PIN salah. Sisa percobaan: ${MAX_ATTEMPTS - count}.`;
  };

  const reset = () => localStorage.setItem(LOCK_KEY, JSON.stringify({ count: 0, until: 0 }));

  return { remaining, isLocked: remaining > 0, registerFailure, reset };
}

function Shell({ children, subtitle }) {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
            <DollarSign size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">KeuanganApp</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">{subtitle}</p>
        </div>
        <div className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl p-6 shadow-2xl">
          {children}
        </div>
        <p className="text-center text-xs text-slate-600 mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} />
          Sandi &amp; PIN disimpan sebagai hash di perangkat ini
        </p>
      </div>
    </div>
  );
}

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
      {children}
    </p>
  );
}

function LockNote({ seconds }) {
  return (
    <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
      <Lock size={14} className="shrink-0" />
      <span>Terkunci sementara. Coba lagi dalam {seconds} detik.</span>
    </div>
  );
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}

/* ─── Lapis 2: PIN ─── */
function PinScreen({ account, onBack, onUnlocked }) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { remaining, isLocked, registerFailure, reset } = usePinLock();
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked || loading) return;
    if (!isValidPin(pin)) {
      setError(`PIN harus tepat ${PIN_LENGTH} digit angka.`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Jika sandi sudah diverifikasi, PIN harus milik akun yang sama.
      // Mode PIN saja tetap bisa memilih akun berdasarkan PIN.
      const matched = account
        ? (await Accounts.verifyPinOf(account.id, pin) ? account : null)
        : await Accounts.findByPin(pin);
      if (!matched) {
        setPin("");
        setError(registerFailure());
        return;
      }
      reset();
      Accounts.activate(matched.id);
      onUnlocked(matched);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell subtitle={account ? "Masukkan PIN untuk melanjutkan" : `Masuk dengan PIN ${PIN_LENGTH} digit`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center gap-1 pb-1">
          <Avatar src={account?.avatar} name={account?.name} size={56} ring />
          <p className="text-sm font-bold text-white mt-1.5">{account?.name || "Akun terdaftar"}</p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Mail size={11} />
            {account?.email || "PIN mencocokkan akun Anda otomatis"}
          </p>
        </div>

        <div>
          <label className={labelCls} htmlFor="pin-input">
            PIN ({PIN_LENGTH} digit)
          </label>
          <div className="relative">
            <input
              id="pin-input"
              ref={inputRef}
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PIN_LENGTH}
              value={pin}
              disabled={isLocked}
              onChange={(e) => {
                setPin(digitsOnly(e.target.value));
                setError("");
              }}
              placeholder={"•".repeat(PIN_LENGTH)}
              className={`${inputCls} pr-10 tracking-[0.4em] text-center`}
              autoComplete="off"
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
          <p className="text-[10px] text-slate-600 mt-1.5 text-center">
            {pin.length}/{PIN_LENGTH} digit
          </p>
        </div>

        {isLocked ? <LockNote seconds={remaining} /> : <ErrorNote>{error}</ErrorNote>}

        <button type="submit" disabled={loading || isLocked} className={primaryBtn}>
          {loading ? <Spinner /> : <KeyRound size={16} />}
          {loading ? "Membuka..." : "Buka Kunci"}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft size={13} />
          Kembali ke Login
        </button>
      </form>
    </Shell>
  );
}

/* ─── Lapis 1: email + sandi ─── */
function PasswordScreen({ onVerified, onUsePinOnly, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const account = await Accounts.verifyPassword(email, password);
      if (!account) {
        setError("Email atau sandi salah.");
        return;
      }
      onVerified(account);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell subtitle="Masuk untuk melanjutkan — data Anda tersimpan aman di perangkat ini">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="nama@email.com"
            className={inputCls}
            autoComplete="username"
            autoFocus
            required
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="password">Sandi</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••"
              className={`${inputCls} pr-10`}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
              title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <ErrorNote>{error}</ErrorNote>

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? <Spinner /> : <LogIn size={16} />}
          {loading ? "Memeriksa..." : "Masuk"}
        </button>

        <div className="flex items-center justify-between gap-2 text-xs pt-1">
          <button
            type="button"
            onClick={onUsePinOnly}
            className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <KeyRound size={12} />
            Lupa sandi? Pakai PIN
          </button>
          <button
            type="button"
            onClick={onRegister}
            className="text-blue-400 hover:text-blue-300 transition-colors font-medium shrink-0"
          >
            Daftar Akun
          </button>
        </div>
      </form>
    </Shell>
  );
}

/* ─── Daftar akun baru ─── */
function RegisterScreen({ onRegistered, onBackToLogin, showLegacyNote }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    pin: "",
    pinConfirm: "",
    avatar: null,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setField("avatar", await fileToAvatarDataUrl(file));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (form.password !== form.passwordConfirm) {
      setError("Konfirmasi sandi tidak cocok.");
      return;
    }
    if (!isValidPin(form.pin)) {
      setError(`PIN harus tepat ${PIN_LENGTH} digit angka.`);
      return;
    }
    if (form.pin !== form.pinConfirm) {
      setError("Konfirmasi PIN tidak cocok.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const account = await Accounts.createAccount({
        name: form.name,
        email: form.email,
        password: form.password,
        pin: form.pin,
        avatar: form.avatar,
      });
      onRegistered(account);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell subtitle="Buat akun untuk melindungi data keuangan Anda">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="flex items-center gap-3 pb-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group shrink-0"
            title="Unggah foto profil"
          >
            <Avatar src={form.avatar} name={form.name} size={56} />
            <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </span>
          </button>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Foto profil (opsional).
            <br />
            Klik lingkaran untuk mengunggah.
          </p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
        </div>

        <div>
          <label className={labelCls} htmlFor="reg-name">Nama</label>
          <input
            id="reg-name"
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Nama Anda"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="nama@email.com"
            className={inputCls}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} htmlFor="reg-pass">Sandi</label>
            <input
              id="reg-pass"
              type={showSecret ? "text" : "password"}
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder="min. 6 karakter"
              className={inputCls}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="reg-pass2">Konfirmasi Sandi</label>
            <input
              id="reg-pass2"
              type={showSecret ? "text" : "password"}
              value={form.passwordConfirm}
              onChange={(e) => setField("passwordConfirm", e.target.value)}
              placeholder="ulangi sandi"
              className={inputCls}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} htmlFor="reg-pin">PIN ({PIN_LENGTH} digit)</label>
            <input
              id="reg-pin"
              type={showSecret ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PIN_LENGTH}
              value={form.pin}
              onChange={(e) => setField("pin", digitsOnly(e.target.value))}
              placeholder="12345678"
              className={`${inputCls} tracking-[0.2em]`}
              required
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="reg-pin2">Konfirmasi PIN</label>
            <input
              id="reg-pin2"
              type={showSecret ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PIN_LENGTH}
              value={form.pinConfirm}
              onChange={(e) => setField("pinConfirm", digitsOnly(e.target.value))}
              placeholder="12345678"
              className={`${inputCls} tracking-[0.2em]`}
              required
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showSecret}
            onChange={(e) => setShowSecret(e.target.checked)}
            className="accent-blue-600"
          />
          Tampilkan sandi dan PIN
        </label>

        {showLegacyNote && (
          <p className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            Data lama di perangkat ini akan dipindahkan ke akun baru Anda.
          </p>
        )}

        <ErrorNote>{error}</ErrorNote>

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? <Spinner /> : <UserPlus size={16} />}
          {loading ? "Menyimpan..." : "Buat Akun & Masuk"}
        </button>

        {onBackToLogin && (
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={13} />
            Kembali ke Login
          </button>
        )}
      </form>
    </Shell>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState("password");
  const [pendingAccount, setPendingAccount] = useState(null);
  const accounts = Accounts.listAccounts();
  const showLegacyNote = accounts.length === 0 && Accounts.hasLegacyData();

  useEffect(() => {
    if (Accounts.isUnlocked()) navigate("/", { replace: true });
  }, [navigate]);

  if (Accounts.isUnlocked()) return null;

  const goHome = () => navigate("/", { replace: true });

  if (accounts.length === 0) {
    return <RegisterScreen onRegistered={goHome} showLegacyNote={showLegacyNote} />;
  }

  if (screen === "register") {
    return (
      <RegisterScreen
        onRegistered={goHome}
        onBackToLogin={() => setScreen("password")}
        showLegacyNote={false}
      />
    );
  }

  if (screen === "pin") {
    return (
      <PinScreen
        account={pendingAccount}
        onBack={() => { setPendingAccount(null); setScreen("password"); }}
        onUnlocked={goHome}
      />
    );
  }

  return (
    <PasswordScreen
      onVerified={(account) => { setPendingAccount(account); setScreen("pin"); }}
      onUsePinOnly={() => { setPendingAccount(null); setScreen("pin"); }}
      onRegister={() => setScreen("register")}
    />
  );
}
