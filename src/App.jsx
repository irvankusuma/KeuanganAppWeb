import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import {
  Home,
  DollarSign,
  Coins,
  TrendingUp,
  TrendingDown,
  Wrench,
  Download,
  LogOut,
  BookOpen,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Receipt,
  Wallet,
  Cloud,
} from "lucide-react";

// Pages — dimuat malas agar bundle awal tetap ringan
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Hutang = lazy(() => import("./pages/Hutang"));
const Piutang = lazy(() => import("./pages/Piutang"));
const Pemasukan = lazy(() => import("./pages/Pemasukan"));
const Pengeluaran = lazy(() => import("./pages/Pengeluaran"));
const Perbaikan = lazy(() => import("./pages/Perbaikan"));
const Catatan = lazy(() => import("./pages/catatan"));
const Tagihan = lazy(() => import("./pages/Tagihan"));
const Pendapatan = lazy(() => import("./pages/Pendapatan"));
const Backup = lazy(() => import("./pages/Backup"));
import LoginPage from "./pages/Login";
import { getCloudEngine } from "./hooks/useCloudSync";

// Components
const ExportImportModal = lazy(() => import("./components/ExportImportModal"));
import ConfirmModal from "./components/ConfirmModal";

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

// ─── Shared nav config ───────────────────────────────────────
const NAV_ITEMS = [
  { path: "/",            icon: Home,         label: "Beranda"     },
  { path: "/pendapatan",  icon: Wallet,        label: "Pendapatan"  },
  { path: "/hutang",      icon: DollarSign,   label: "Hutang"      },
  { path: "/piutang",     icon: Coins,        label: "Piutang"     },
  { path: "/tagihan",     icon: Receipt,      label: "Tagihan"     },
  { path: "/perbaikan",   icon: Wrench,       label: "Perbaikan"   },
  { path: "/pemasukan",   icon: TrendingUp,   label: "Pemasukan"   },
  { path: "/pengeluaran", icon: TrendingDown, label: "Pengeluaran" },
  { path: "/catatan",     icon: BookOpen,     label: "Catatan"     },
  { path: "/backup",      icon: Cloud,        label: "Backup Cloud" },
];

// ─── Sidebar nav link ─────────────────────────────────────────
function SideNavLink({ item, isActive, onClick, collapsed }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`
        group flex items-center px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-150 relative
        ${collapsed ? "justify-center" : "gap-3"}
        ${isActive
          ? "bg-blue-600/15 text-blue-400"
          : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"}
      `}
    >
      {/* Active indicator */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
      )}
      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {isActive && !collapsed && <ChevronRight size={14} className="ml-auto text-blue-400/60 shrink-0" />}
    </Link>
  );
}

// ─── Sidebar content (reused in desktop + mobile drawer) ──────
function SidebarContent({ onClose, onExport, onLogout, collapsed, onToggleCollapse, isMobile }) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center px-4 py-5 shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
            <DollarSign size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-none truncate">KeuanganApp</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Manajemen Keuangan</p>
            </div>
          )}
        </div>
        {/* Close button — mobile only */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-[#1e2d45] mb-2 shrink-0" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => (
          <SideNavLink
            key={item.path}
            item={item}
            isActive={location.pathname === item.path}
            onClick={onClose}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-[#1e2d45] mt-2 shrink-0" />

      {/* Bottom actions */}
      <div className="px-3 py-4 space-y-1 shrink-0">
        <button
          onClick={() => { onExport?.(); onClose?.(); }}
          title={collapsed ? "Ekspor / Impor" : undefined}
          className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] transition-colors ${collapsed ? "justify-center" : "gap-3"}`}
        >
          <Download size={18} strokeWidth={1.8} className="shrink-0" />
          {!collapsed && <span>Ekspor / Impor</span>}
        </button>
        <button
          onClick={() => { onLogout?.(); onClose?.(); }}
          title={collapsed ? "Keluar" : undefined}
          className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ${collapsed ? "justify-center" : "gap-3"}`}
        >
          <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>

      {/* Desktop Collapse Toggle */}
      {!isMobile && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-6 bg-[#0c1220] border border-[#1e2d45] text-slate-400 hover:text-white p-1 rounded-full shadow-lg z-10 transition-transform"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}
    </div>
  );
}

// ─── Realtime Clock (format baru: Rabu 25 Mei 2026 (11:20)) ──
function RealtimeClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000;
    let interval;
    const timeout = setTimeout(() => {
      setTime(new Date());
      interval = setInterval(() => setTime(new Date()), 60000);
    }, msUntilNextMinute);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const d = time;
  const dayName = days[d.getDay()];
  const date = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return (
    <div className="flex items-center text-[10px] font-semibold text-slate-400 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] tracking-tight whitespace-nowrap select-none">
      <span className="hidden sm:inline">{dayName}&nbsp;</span>
      <span>{date} {month} {year}</span>
      <span className="text-slate-500 mx-1">•</span>
      <span className="text-blue-400 font-bold">{hours}:{minutes}</span>
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────
function Layout({ children }) {
  const location  = useLocation();
  const navigate  = useNavigate();

  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [showExportModal,  setShowExportModal]  = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Swipe gesture state
  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);
  const swipeActive = useRef(false);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // ─── Swipe gesture handlers (mobile only) ─────────────────
  const handleTouchStart = useCallback((e) => {
    // Only handle single-touch events
    if (e.touches.length !== 1) return;
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swipeActive.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (swipeStartX.current === null) return;
    const deltaX = e.touches[0].clientX - swipeStartX.current;
    const deltaY = Math.abs(e.touches[0].clientY - (swipeStartY.current || 0));

    // Ignore if mostly vertical scroll
    if (deltaY > Math.abs(deltaX) && !swipeActive.current) return;

    // Open: swipe right from left edge (startX < 30) when sidebar closed
    if (!mobileOpen && swipeStartX.current < 30 && deltaX > 10) {
      swipeActive.current = true;
      e.preventDefault();
    }

    // Close: swipe left when sidebar open
    if (mobileOpen && deltaX < -10) {
      swipeActive.current = true;
    }
  }, [mobileOpen]);

  const handleTouchEnd = useCallback((e) => {
    if (swipeStartX.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - swipeStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - (swipeStartY.current || 0));

    // Only trigger if horizontal is dominant
    if (deltaY < Math.abs(deltaX)) {
      if (!mobileOpen && swipeStartX.current < 40 && deltaX > 60) {
        // Open sidebar
        setMobileOpen(true);
      } else if (mobileOpen && deltaX < -60) {
        // Close sidebar
        setMobileOpen(false);
      }
    }

    swipeStartX.current = null;
    swipeStartY.current = null;
    swipeActive.current = false;
  }, [mobileOpen]);

  const handleLogout = () => {
    sessionStorage.removeItem("app_unlocked");
    navigate("/login");
  };

  const currentPage = NAV_ITEMS.find((i) => i.path === location.pathname)?.label ?? "Dashboard";

  return (
    <div
      className="min-h-screen bg-[#0a0f1a] text-slate-200 flex"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >

      {/* ══════════════════════════════════════
          DESKTOP SIDEBAR (fixed)
          ══════════════════════════════════════ */}
      <aside 
        className={`hidden md:flex flex-col fixed top-0 left-0 h-screen transition-all duration-300 ease-in-out bg-[#0c1220] border-r border-[#1e2d45] z-30 ${desktopCollapsed ? "w-[80px]" : "w-[240px]"}`}
      >
        <SidebarContent
          onExport={() => setShowExportModal(true)}
          onLogout={() => setShowLogoutConfirm(true)}
          collapsed={desktopCollapsed}
          onToggleCollapse={() => setDesktopCollapsed(!desktopCollapsed)}
          isMobile={false}
        />
      </aside>

      {/* ══════════════════════════════════════
          MOBILE DRAWER
          ══════════════════════════════════════ */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Drawer panel */}
      <aside
        className={`
          md:hidden fixed top-0 left-0 h-screen w-[260px]
          bg-[#0c1220] border-r border-[#1e2d45] z-50
          sidebar-transition
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent
          onClose={() => setMobileOpen(false)}
          onExport={() => setShowExportModal(true)}
          onLogout={() => setShowLogoutConfirm(true)}
          collapsed={false}
          isMobile={true}
        />
      </aside>

      {/* ══════════════════════════════════════
          CONTENT AREA
          ══════════════════════════════════════ */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${desktopCollapsed ? "md:ml-[80px]" : "md:ml-[240px]"}`}>

        {/* ── Top bar mobile ── */}
        <header className="md:hidden sticky top-0 z-30 bg-[#0c1220]/90 backdrop-blur-md border-b border-[#1e2d45]">
          <div className="h-14 px-3 flex items-center justify-between gap-2">
            {/* Left: Menu + Page title */}
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 -ml-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors shrink-0"
                aria-label="Buka menu"
              >
                <Menu size={20} />
              </button>
              <span className="text-xs font-bold text-white truncate">{currentPage}</span>
            </div>
            
            {/* Right: Download + Clock */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowExportModal(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                title="Unduhan"
              >
                <Download size={17} />
              </button>
              <RealtimeClock />
            </div>
          </div>
        </header>

        {/* ── Desktop page header ── */}
        <header className="hidden md:block sticky top-0 z-20 bg-[#0a0f1a]/85 backdrop-blur-md border-b border-[#1e2d45]/60">
          <div className="h-14 px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
              <span>KeuanganApp</span>
              <ChevronRight size={12} className="shrink-0" />
              <span className="text-slate-300 font-medium truncate">{currentPage}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowExportModal(true)}
                className="py-1.5 px-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors flex items-center gap-1.5 text-xs font-semibold border border-[#1e2d45] bg-[#0c1220]/50"
                title="Unduhan (Ekspor / Impor)"
              >
                <Download size={14} />
                <span>Unduhan</span>
              </button>
              <RealtimeClock />
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-8 max-w-5xl w-full mx-auto relative">
          <Suspense fallback={<PageFallback />}>{children}</Suspense>
        </main>
      </div>




      {/* ══════════════════════════════════════
          GLOBAL MODALS
          ══════════════════════════════════════ */}
      {showExportModal && (
        <Suspense fallback={null}>
          <ExportImportModal
            visible
            onClose={() => setShowExportModal(false)}
          />
        </Suspense>
      )}

      <ConfirmModal
        visible={showLogoutConfirm}
        title="Keluar Aplikasi"
        message="Sesi akan diakhiri. Data tetap aman tersimpan di perangkat ini."
        confirmText="Keluar"
        icon={LogOut}
        danger={false}
        onConfirm={() => { setShowLogoutConfirm(false); handleLogout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}

// ─── Route guard ──────────────────────────────────────────────
function ProtectedLayout({ children }) {
  const unlocked = sessionStorage.getItem("app_unlocked");
  if (!unlocked) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

// ─── App root ─────────────────────────────────────────────────
export default function App() {
  getCloudEngine();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedLayout>
              <Routes>
                <Route path="/"            element={<Dashboard />}   />
                <Route path="/pendapatan"  element={<Pendapatan />}  />
                <Route path="/hutang"      element={<Hutang />}      />
                <Route path="/piutang"     element={<Piutang />}     />
                <Route path="/tagihan"     element={<Tagihan />}     />
                <Route path="/pemasukan"   element={<Pemasukan />}   />
                <Route path="/pengeluaran" element={<Pengeluaran />} />
                <Route path="/catatan"     element={<Catatan />}     />
                <Route path="/perbaikan"   element={<Perbaikan />}   />
                <Route path="/backup"      element={<Backup />}      />
              </Routes>
            </ProtectedLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
