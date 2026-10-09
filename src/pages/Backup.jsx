import { useEffect, useState } from "react";
import { Cloud, UploadCloud, DownloadCloud, LogOut, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import * as CloudSync from "../services/CloudSyncService";
import useCloudSync from "../hooks/useCloudSync";
import { useToast } from "../context/ToastContext";
import { inputCls, labelCls } from "../utils/formStyles";

const fmtTime = (ms) =>
  ms
    ? new Date(ms).toLocaleString("id-ID", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "belum pernah";

function SetupGuide() {
  const steps = [
    ["Buka console.firebase.google.com", "Login dengan akun Google Anda, klik \"Add project\" / \"Tambah project\", beri nama bebas (mis. keuanganapp), lalu Create."],
    ["Tambahkan aplikasi Web", "Di halaman project, klik ikon </> (Web), isi nama aplikasi, klik Register app. Firebase akan menampilkan objek firebaseConfig."],
    ["Salin config ke aplikasi ini", "Buka file src/firebaseConfig.js di folder proyek, ganti semua nilai ISI_... dengan nilai dari langkah 2, simpan, lalu jalankan ulang npm run dev."],
    ["Aktifkan login email", "Di sidebar Firebase Console pilih Authentication → Get started → tab Sign-in method → aktifkan Email/Password."],
    ["Buat database", "Pilih Firestore Database → Create database → pilih lokasi singaporeasia → mulai dengan Production mode, lalu tempel aturan keamanan di bawah ini di tab Rules."],
  ];
  const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /backups/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}`;
  return (
    <div className="space-y-4">
      <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-amber-400">
          <ShieldCheck size={18} />
          <h2 className="font-bold text-sm">Backup cloud belum dikonfigurasi</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Saat ini data Anda hanya tersimpan di perangkat ini. Ikuti 5 langkah berikut (sekali saja, ±10 menit)
          agar data otomatis tersalin ke server Firebase milik Anda sendiri — aman walau HP hilang atau di-reset.
        </p>
      </div>
      {steps.map(([title, desc], i) => (
        <div key={i} className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4 flex gap-3">
          <div className="shrink-0 w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-xs font-bold">
            {i + 1}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
      <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-100 mb-2">Aturan keamanan Firestore (langkah 5)</h3>
        <pre className="text-[11px] text-emerald-300 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre">{rules}</pre>
        <p className="text-[11px] text-slate-500 mt-2">
          Aturan ini memastikan hanya Anda (pemilik akun) yang bisa membaca & menulis backup Anda.
        </p>
      </div>
    </div>
  );
}

function AuthForm() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await CloudSync.login(email.trim(), password);
      else await CloudSync.register(email.trim(), password);
      showToast(mode === "login" ? "Berhasil masuk. Sinkronisasi aktif." : "Akun dibuat. Sinkronisasi aktif.", "success");
    } catch (err) {
      setError(CloudSync.friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-5 max-w-md space-y-4">
      <div className="flex items-center gap-2 text-blue-400">
        <Cloud size={18} />
        <h2 className="font-bold text-sm text-slate-100">Masuk ke Backup Cloud</h2>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Gunakan email yang sama di semua perangkat Anda. Di perangkat baru (mis. setelah HP hilang),
        cukup masuk dengan email ini dan data akan pulih otomatis.
      </p>
      <div className="grid grid-cols-2 gap-1 p-1 bg-black/30 rounded-lg">
        {[["login", "Masuk"], ["register", "Daftar"]].map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(""); }}
            className={`py-1.5 rounded-md text-xs font-bold transition-colors ${mode === m ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="nama@email.com" />
        </div>
        <div>
          <label className={labelCls}>Password (min. 6 karakter)</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••" />
        </div>
        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
          {busy && <Loader2 size={15} className="animate-spin" />}
          {mode === "login" ? "Masuk & Aktifkan Backup" : "Daftar & Aktifkan Backup"}
        </button>
      </form>
    </div>
  );
}

export default function Backup() {
  const { user, syncing, lastPushMs, push } = useCloudSync();
  const [cloudMs, setCloudMs] = useState(0);
  const [busy, setBusy] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) { setCloudMs(0); return; }
    CloudSync.fetchCloud()
      .then((c) => setCloudMs(c?.updatedAtMs || 0))
      .catch(() => setCloudMs(0));
  }, [user, lastPushMs]);

  const doPush = async () => {
    setBusy("push");
    try {
      const ms = await CloudSync.pushToCloud();
      setCloudMs(ms);
      showToast("Data berhasil dikirim ke cloud.", "success");
    } catch (err) {
      showToast(CloudSync.friendlyAuthError(err), "error");
    } finally {
      setBusy("");
    }
  };

  const doRestore = async () => {
    if (!window.confirm("Data di perangkat ini akan DITIMPA dengan data dari cloud. Lanjutkan?")) return;
    setBusy("restore");
    try {
      const cloud = await CloudSync.restoreFromCloud();
      if (!cloud) showToast("Belum ada backup di cloud.", "warning");
      else window.location.reload();
    } catch (err) {
      showToast(CloudSync.friendlyAuthError(err), "error");
      setBusy("");
    }
  };

  const doLogout = async () => {
    setBusy("logout");
    await CloudSync.logout();
    showToast("Keluar dari akun cloud. Data lokal tetap aman.", "success");
  };

  return (
    <div className="space-y-4 pb-24">
      {!CloudSync.isFirebaseConfigured ? (
        <SetupGuide />
      ) : !user ? (
        <AuthForm />
      ) : (
        <div className="space-y-4 max-w-md">
          <div className="bg-[#0e1523] border border-emerald-500/30 rounded-xl p-5 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck size={18} />
              <h2 className="font-bold text-sm">Backup cloud AKTIF</h2>
            </div>
            <p className="text-xs text-slate-400">Akun: <span className="text-slate-200 font-semibold">{user.email}</span></p>
            <p className="text-xs text-slate-400">Setiap perubahan otomatis dikirim ±3 detik kemudian. Data dari perangkat lain masuk otomatis tiap ±1 menit.</p>
          </div>

          <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-400">Sync terakhir (perangkat ini)</span><span className="text-slate-200">{fmtTime(lastPushMs)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Backup terbaru di cloud</span><span className="text-slate-200">{fmtTime(cloudMs)}</span></div>
            {syncing && <p className="text-blue-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Mengirim perubahan…</p>}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button onClick={doPush} disabled={!!busy} className="btn-action-compact btn-action-blue !flex-none py-2.5">
              {busy === "push" ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              Kirim ke Cloud Sekarang
            </button>
            <button onClick={doRestore} disabled={!!busy} className="btn-action-compact btn-action-emerald !flex-none py-2.5">
              {busy === "restore" ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
              Pulihkan dari Cloud
            </button>
            <button onClick={doLogout} disabled={!!busy} className="btn-action-compact btn-action-red !flex-none py-2.5">
              <LogOut size={14} />
              Keluar dari Akun Cloud
            </button>
          </div>

          <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4 flex gap-2.5">
            <RefreshCw size={14} className="text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sinkronisasi berjalan dua arah otomatis selama Anda masuk. Tombol di atas hanya untuk memaksa
              kirim/ambil saat itu juga. Di perangkat baru: buka menu Backup Cloud, masuk dengan email yang sama —
              data langsung terisi sendiri.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
