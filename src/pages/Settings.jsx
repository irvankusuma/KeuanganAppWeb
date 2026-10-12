import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Camera,
  Save,
  Lock,
  LogOut,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import * as Accounts from "../services/AccountService";
import * as CloudAuth from "../services/CloudAuthService";
import { fileToAvatarDataUrl } from "../utils/avatar";
import { useToast } from "../context/ToastContext";
import useActiveAccount from "../hooks/useActiveAccount";
import Avatar from "../components/Avatar";
import ConfirmModal from "../components/ConfirmModal";

const cardCls = "bg-[#0e1523] border border-[#1e2d45] rounded-2xl p-5";
const inputCls =
  "w-full bg-[#141d2e] border border-[#1e2d45] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-colors";
const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-2.5 mb-4">
      <span className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-blue-400" />
      </span>
      <div>
        <h2 className="text-sm font-bold text-white leading-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
      {children}
    </p>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const account = useActiveAccount();
  const fileRef = useRef(null);

  const [profile, setProfile] = useState({ name: account?.name || "", email: account?.email || "" });
  const [avatar, setAvatar] = useState(account?.avatar || null);
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [confirmLock, setConfirmLock] = useState(false);

  if (!account) {
    return (
      <div className="text-center py-16 text-sm text-slate-400">
        Tidak ada akun aktif.{" "}
        <button onClick={() => navigate("/login")} className="text-blue-400 underline">
          Masuk kembali
        </button>
      </div>
    );
  }

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatar(dataUrl);
      const updated = await CloudAuth.updateProfile(CloudAuth.getCurrentUser(), { ...account, avatar: dataUrl });
      Accounts.updateProfile(account.id, updated);
      setProfile({ name: updated.name, email: updated.email });
      showToast("Foto profil diperbarui.", "success");
    } catch (err) {
      setProfileError(err.message);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    try {
      const updated = await CloudAuth.updateProfile(CloudAuth.getCurrentUser(), { name: profile.name, email: profile.email, avatar });
      Accounts.updateProfile(account.id, updated);
      setProfile({ name: updated.name, email: updated.email });
      showToast("Profil berhasil disimpan.", "success");
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    if (passwords.next !== passwords.confirm) {
      setPasswordError("Konfirmasi sandi baru tidak cocok.");
      return;
    }
    setSavingPassword(true);
    try {
      await CloudAuth.changePassword(CloudAuth.getCurrentUser(), passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      showToast("Sandi berhasil diganti.", "success");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLock = () => {
    setConfirmLock(false);
    Accounts.lock();
    CloudAuth.logout().finally(() => navigate("/login", { replace: true }));
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-2.5">
        <SettingsIcon size={20} className="text-blue-400" />
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">Pengaturan</h1>
          <p className="text-[11px] text-slate-500">Kelola profil dan keamanan akun Anda</p>
        </div>
      </div>

      {/* Profil */}
      <form onSubmit={saveProfile} className={`${cardCls} space-y-4`}>
        <SectionTitle icon={UserIcon} title="Profil cloud" subtitle="Nama dan foto profil akun cloud" />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group shrink-0"
            title="Ganti foto profil"
          >
            <Avatar src={avatar} name={profile.name} size={64} ring />
            <span className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{account.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{account.email}</p>
            <p className="text-[10px] text-slate-600 mt-1">Klik foto untuk mengganti</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
        </div>

        <div>
          <label className={labelCls} htmlFor="set-name">Nama</label>
          <input
            id="set-name"
            type="text"
            value={profile.name}
            onChange={(e) => { setProfile((p) => ({ ...p, name: e.target.value })); setProfileError(""); }}
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="set-email">Email akun</label>
          <input
            id="set-email"
            type="email"
            value={profile.email}
            readOnly
            className={inputCls}
          />
          <p className="text-[10px] text-slate-600 mt-1">Email login dikelola oleh Firebase Authentication.</p>
        </div>

        <FieldError>{profileError}</FieldError>

        <button
          type="submit"
          disabled={savingProfile}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          <Save size={15} />
          {savingProfile ? "Menyimpan..." : "Simpan Profil"}
        </button>
      </form>

      {/* Sandi */}
      <form onSubmit={savePassword} className={`${cardCls} space-y-3.5`}>
        <SectionTitle icon={Lock} title="Ganti Sandi" subtitle="Minimal 6 karakter" />

        <div>
          <label className={labelCls} htmlFor="pw-current">Sandi saat ini</label>
          <input
            id="pw-current"
            type={showPassword ? "text" : "password"}
            value={passwords.current}
            onChange={(e) => { setPasswords((p) => ({ ...p, current: e.target.value })); setPasswordError(""); }}
            className={inputCls}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} htmlFor="pw-next">Sandi baru</label>
            <input
              id="pw-next"
              type={showPassword ? "text" : "password"}
              value={passwords.next}
              onChange={(e) => { setPasswords((p) => ({ ...p, next: e.target.value })); setPasswordError(""); }}
              className={inputCls}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="pw-confirm">Ulangi sandi baru</label>
            <input
              id="pw-confirm"
              type={showPassword ? "text" : "password"}
              value={passwords.confirm}
              onChange={(e) => { setPasswords((p) => ({ ...p, confirm: e.target.value })); setPasswordError(""); }}
              className={inputCls}
              required
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="accent-blue-600"
          />
          Tampilkan sandi
        </label>

        <FieldError>{passwordError}</FieldError>

        <button
          type="submit"
          disabled={savingPassword}
          className="w-full bg-[#1e2d45] hover:bg-[#26374f] text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          <Lock size={15} />
          {savingPassword ? "Memproses..." : "Ganti Sandi"}
        </button>
      </form>

      {/* Sesi */}
      <div className={`${cardCls} space-y-3`}>
        <SectionTitle icon={ShieldCheck} title="Sesi cloud" subtitle="Akun Anda tersinkron dengan Firestore" />
        <p className="text-[11px] text-slate-500 leading-relaxed -mt-2 mb-1">
          Perubahan disimpan langsung ke database cloud dan diterima perangkat lain melalui sinkronisasi realtime.
        </p>
        <button
          type="button"
          onClick={() => setConfirmLock(true)}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut size={15} />
          Kunci &amp; Kembali ke Login
        </button>
      </div>

      <ConfirmModal
        visible={confirmLock}
        title="Kunci Aplikasi"
        message="Sesi cloud akan diakhiri. Anda perlu masuk kembali untuk membuka data. Lanjutkan?"
        confirmText="Kunci"
        icon={Lock}
        danger={false}
        onConfirm={handleLock}
        onCancel={() => setConfirmLock(false)}
      />
    </div>
  );
}
