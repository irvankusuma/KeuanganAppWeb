import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import * as Accounts from "../services/AccountService";
import * as CloudAuth from "../services/CloudAuthService";

const inputCls = "w-full bg-[#141d2e] border border-[#1e2d45] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-colors";

function Shell({ children, subtitle }) {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
            <Cloud size={27} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">KeuanganApp</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">{subtitle}</p>
        </div>
        <div className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl p-6 shadow-2xl">{children}</div>
        <p className="text-center text-xs text-slate-600 mt-6 flex items-center justify-center gap-1.5">
          <LockKeyhole size={12} /> Data transaksi tersimpan di database cloud akun Anda
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const finishingLogin = useRef(false);

  const finishLogin = async (user) => {
    if (finishingLogin.current) return;
    finishingLogin.current = true;
    try {
      const legacyAccount = Accounts.findLegacyAccountByEmail(user.email);
      const profile = await CloudAuth.ensureProfile(user, legacyAccount || {});
      const account = legacyAccount
        ? Accounts.linkCloudIdentity(legacyAccount.id, user.uid, profile)
        : Accounts.ensureCloudAccount(user.uid, profile);
      Accounts.activate(account.id);
      navigate("/", { replace: true });
    } finally {
      finishingLogin.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;
    CloudAuth.onAuthChange((user) => {
      if (!user || cancelled) return;
      finishLogin(user).catch((err) => {
        if (!cancelled) setError(CloudAuth.friendlyCloudError(err));
      });
    }).then((stop) => {
      unsubscribe = stop;
      if (cancelled) stop();
    }).catch((err) => {
      if (!cancelled) setError(CloudAuth.friendlyCloudError(err));
    });
    return () => { cancelled = true; unsubscribe?.(); };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (mode === "forgot") {
        await CloudAuth.sendPasswordReset(cleanEmail);
        setNotice("Tautan pemulihan sandi sudah dikirim. Periksa kotak masuk atau folder spam.");
        return;
      }

      if (mode === "register") {
        const user = await CloudAuth.register(cleanEmail, password);
        const profile = await CloudAuth.saveProfile(user, { name, email: cleanEmail });
        const account = Accounts.ensureCloudAccount(user.uid, profile);
        Accounts.activate(account.id);
        navigate("/", { replace: true });
        return;
      }

      let user;
      try {
        user = await CloudAuth.signIn(cleanEmail, password);
      } catch (authError) {
        // Existing offline-era accounts are upgraded to Firebase on first login.
        const legacyAccount = await Accounts.verifyPassword(cleanEmail, password);
        if (!legacyAccount || !["auth/user-not-found", "auth/invalid-credential", "auth/invalid-login-credentials"].includes(authError?.code)) {
          throw authError;
        }
        user = await CloudAuth.register(cleanEmail, password);
        await CloudAuth.saveProfile(user, legacyAccount);
      }
      await finishLogin(user);
    } catch (err) {
      setError(CloudAuth.friendlyCloudError(err));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "register"
    ? "Buat akun cloud"
    : mode === "forgot"
      ? "Pulihkan sandi"
      : "Masuk ke akun";

  return (
    <Shell subtitle={mode === "register" ? "Buat akun untuk menyimpan data Anda secara online" : "Masuk untuk membuka data cloud Anda di perangkat mana pun"}>
      <h2 className="text-sm font-bold text-white mb-4">{title}</h2>
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="cloud-name">Nama</label>
            <input id="cloud-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="name" required />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="cloud-email">Email</label>
          <input id="cloud-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className={inputCls} autoComplete="username" required />
        </div>
        {mode !== "forgot" && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="cloud-password">Sandi {mode === "register" && "(minimal 6 karakter)"}</label>
            <div className="relative">
              <input id="cloud-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-11`} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 6 : undefined} required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <p>{error}</p>
            {CloudAuth.getCurrentUser() && <button type="button" onClick={() => CloudAuth.logout().then(() => setError(""))} className="mt-2 text-xs text-slate-300 underline">Keluar dari akun cloud</button>}
          </div>
        )}
        {notice && <p role="status" className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{notice}</p>}
        <button type="submit" disabled={busy} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
          {busy ? <Loader2 size={16} className="animate-spin" /> : mode === "register" ? <UserRound size={16} /> : <Mail size={16} />}
          {busy ? "Menghubungkan ke cloud…" : mode === "register" ? "Daftar & Simpan Online" : mode === "forgot" ? "Kirim Tautan Pemulihan" : "Masuk & Sinkronkan"}
        </button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-xs">
        {mode === "login" && <button type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }} className="text-slate-500 hover:text-slate-300">Lupa sandi?</button>}
        <button type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); setNotice(""); }} className="text-blue-400 hover:text-blue-300 font-medium">
          {mode === "register" ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
        </button>
      </div>
    </Shell>
  );
}
