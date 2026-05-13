import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, LogIn, Eye, EyeOff } from "lucide-react";

/**
 * Simple lock screen / login page.
 * Currently uses a PIN stored in localStorage.
 * If no PIN is set, any input is accepted (first-time setup).
 *
 * PIN key: "app_pin" in localStorage
 */
export default function LoginPage() {
  const navigate = useNavigate();

  const storedPin = localStorage.getItem("app_pin");
  const isFirstTime = !storedPin;

  const [pin, setPin]           = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [showPin, setShowPin]   = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (isFirstTime) {
      // ── First-time: set PIN ──
      if (pin.length < 4) {
        setError("PIN minimal 4 digit.");
        return;
      }
      if (pin !== pinConfirm) {
        setError("Konfirmasi PIN tidak cocok.");
        return;
      }
      localStorage.setItem("app_pin", pin);
      sessionStorage.setItem("app_unlocked", "1");
      navigate("/");
      return;
    }

    // ── Subsequent: verify PIN ──
    setLoading(true);
    setTimeout(() => {
      if (pin === storedPin) {
        sessionStorage.setItem("app_unlocked", "1");
        navigate("/");
      } else {
        setError("PIN salah. Coba lagi.");
        setPin("");
        setLoading(false);
      }
    }, 400); // small delay for UX feel
  };

  // Quick-access: skip PIN if no PIN was ever set (just click Enter)
  const handleSkip = () => {
    sessionStorage.setItem("app_unlocked", "1");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
            <DollarSign size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">KeuanganApp</h1>
          <p className="text-sm text-slate-400 mt-1">
            {isFirstTime ? "Buat PIN untuk melindungi data Anda" : "Masukkan PIN untuk melanjutkan"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* PIN input */}
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
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  placeholder="••••"
                  className="
                    w-full bg-[#141d2e] border border-[#1e2d45] rounded-xl
                    px-4 py-3 text-white text-sm tracking-widest
                    focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30
                    transition-colors pr-10
                  "
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm PIN (first time only) */}
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
                  className="
                    w-full bg-[#141d2e] border border-[#1e2d45] rounded-xl
                    px-4 py-3 text-white text-sm tracking-widest
                    focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30
                    transition-colors
                  "
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm
                py-3 rounded-xl flex items-center justify-center gap-2
                transition-colors duration-150 disabled:opacity-60
              "
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? "Memverifikasi..." : isFirstTime ? "Buat PIN & Masuk" : "Masuk"}
            </button>

            {/* Skip PIN option (first time) */}
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

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Data tersimpan lokal di perangkat ini
        </p>
      </div>
    </div>
  );
}
