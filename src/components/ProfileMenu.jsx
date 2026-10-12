import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, Lock, ChevronDown } from "lucide-react";
import useActiveAccount from "../hooks/useActiveAccount";
import * as Accounts from "../services/AccountService";
import Avatar from "./Avatar";
import ConfirmModal from "./ConfirmModal";

export default function ProfileMenu({ collapsed = false, align = "left", onNavigate }) {
  const account = useActiveAccount();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onEscape = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (!account) return null;

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  const goSettings = () => {
    close();
    navigate("/settings");
  };

  const handleLock = () => {
    setConfirmLock(false);
    Accounts.lock();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? account.name : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`w-full flex items-center rounded-xl border border-transparent hover:border-[#1e2d45] hover:bg-white/[0.04] transition-colors text-left ${
          collapsed ? "justify-center p-1.5" : "gap-2.5 px-2 py-2"
        }`}
      >
        <Avatar src={account.avatar} name={account.name} size={collapsed ? 32 : 36} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white leading-none truncate">
                {account.name}
              </span>
              <span className="block text-[10px] text-slate-500 mt-1 truncate">{account.email}</span>
            </span>
            <ChevronDown
              size={14}
              className={`text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-2 w-56 bg-[#0e1523] border border-[#1e2d45] rounded-xl shadow-2xl shadow-black/50 z-[60] overflow-hidden ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[#1e2d45]">
            <Avatar src={account.avatar} name={account.name} size={38} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{account.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{account.email}</p>
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={goSettings}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <SettingsIcon size={15} className="text-slate-400" />
            Pengaturan
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); setConfirmLock(true); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-[#1e2d45]"
          >
            <Lock size={15} className="text-slate-400" />
            Kunci &amp; ganti akun
          </button>
        </div>
      )}

      <ConfirmModal
        visible={confirmLock}
        title="Kunci Aplikasi"
        message="Anda harus memasukkan PIN lagi untuk membuka data. Lanjutkan?"
        confirmText="Kunci"
        icon={Lock}
        danger={false}
        onConfirm={handleLock}
        onCancel={() => setConfirmLock(false)}
      />
    </div>
  );
}
