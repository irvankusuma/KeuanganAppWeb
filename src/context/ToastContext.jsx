import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let _idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Track which toasts are animating out
  const exitingRef = useRef(new Set());

  const dismiss = useCallback((id) => {
    if (exitingRef.current.has(id)) return;
    exitingRef.current.add(id);

    // Play exit animation then remove
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      exitingRef.current.delete(id);
    }, 280);
  }, []);

  const showToast = useCallback(
    (message, type = "info", duration = 3500) => {
      const id = ++_idCounter;
      setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* ─── Toast Container & Item (co-located for simplicity) ─── */

const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd"/>
    </svg>
  ),
};

const STYLES = {
  success: {
    bar:  "bg-emerald-500",
    icon: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  error: {
    bar:  "bg-red-500",
    icon: "text-red-400",
    border: "border-red-500/20",
  },
  warning: {
    bar:  "bg-amber-500",
    icon: "text-amber-400",
    border: "border-amber-500/20",
  },
  info: {
    bar:  "bg-blue-500",
    icon: "text-blue-400",
    border: "border-blue-500/20",
  },
};

function ToastContainer({ toasts, dismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifikasi"
      className="fixed bottom-20 md:bottom-4 right-4 z-[200] flex flex-col gap-2 items-end pointer-events-none"
      style={{ maxWidth: "min(360px, calc(100vw - 32px))" }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, dismiss }) {
  const s = STYLES[toast.type] || STYLES.info;

  return (
    <div
      role="alert"
      className={`
        pointer-events-auto w-full
        flex items-start gap-3 p-3 pr-2
        bg-[#0e1523] border ${s.border}
        rounded-xl shadow-2xl shadow-black/40
        ${toast.exiting ? "toast-exit" : "toast-enter"}
      `}
    >
      {/* Accent bar */}
      <div className={`w-0.5 self-stretch rounded-full shrink-0 ${s.bar}`} />

      {/* Icon */}
      <span className={`mt-0.5 ${s.icon}`}>{ICONS[toast.type]}</span>

      {/* Message */}
      <p className="flex-1 text-sm text-slate-200 leading-snug py-0.5">
        {toast.message}
      </p>

      {/* Close button */}
      <button
        onClick={() => dismiss(toast.id)}
        className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors shrink-0"
        aria-label="Tutup notifikasi"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
        </svg>
      </button>
    </div>
  );
}
