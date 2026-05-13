import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
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
} from "lucide-react";

// Pages
import Dashboard from "./pages/Dashboard";
import Hutang from "./pages/Hutang";
import Piutang from "./pages/Piutang";
import Pemasukan from "./pages/Pemasukan";
import Pengeluaran from "./pages/Pengeluaran";
import Perbaikan from "./pages/Perbaikan";
import Catatan from "./pages/catatan";
import LoginPage from "./pages/Login";

// Components
import ExportImportModal from "./components/ExportImportModal";
import ConfirmModal from "./components/ConfirmModal";

// ─── Shared nav config ───────────────────────────────────────
const NAV_ITEMS = [
  { path: "/",            icon: Home,         label: "Beranda"     },
  { path: "/hutang",      icon: DollarSign,   label: "Hutang"      },
  { path: "/piutang",     icon: Coins,        label: "Piutang"     },
  { path: "/perbaikan",   icon: Wrench,       label: "Perbaikan"   },
  { path: "/pemasukan",   icon: TrendingUp,   label: "Pemasukan"   },
  { path: "/pengeluaran", icon: TrendingDown, label: "Pengeluaran" },
  { path: "/catatan",     icon: BookOpen,     label: "Catatan"     },
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

function RealtimeClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Sinkronisasi dengan detik ke-0 untuk interval per menit agar tidak boros rerender
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

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const d = time;
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return (
    <div className="flex items-center text-[11px] font-medium text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 tracking-wide">
      {day} {month} {year}, {hours}.{minutes}
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

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = () => {
    sessionStorage.removeItem("app_unlocked");
    navigate("/login");
  };

  const currentPage = NAV_ITEMS.find((i) => i.path === location.pathname)?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200 flex">

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

        {/* ── Top bar (mobile only — shows hamburger + page title) ── */}
        <header className="md:hidden sticky top-0 z-30 bg-[#0c1220]/90 backdrop-blur-md border-b border-[#1e2d45]">
          <div className="h-14 px-4 flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-white">{currentPage}</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setShowExportModal(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
          <div className="px-4 pb-3 flex justify-between items-center">
            <RealtimeClock />
          </div>
        </header>

        {/* ── Desktop page header (breadcrumb style) ── */}
        <header className="hidden md:block sticky top-0 z-20 bg-[#0a0f1a]/80 backdrop-blur-md border-b border-[#1e2d45]/60">
          <div className="h-14 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>KeuanganApp</span>
              <ChevronRight size={12} />
              <span className="text-slate-300 font-medium">{currentPage}</span>
            </div>
            <RealtimeClock />
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 p-4 md:p-6 pb-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ══════════════════════════════════════
          GLOBAL MODALS
          ══════════════════════════════════════ */}
      <ExportImportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

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
                <Route path="/hutang"      element={<Hutang />}      />
                <Route path="/piutang"     element={<Piutang />}     />
                <Route path="/pemasukan"   element={<Pemasukan />}   />
                <Route path="/pengeluaran" element={<Pengeluaran />} />
                <Route path="/catatan"     element={<Catatan />}     />
                <Route path="/perbaikan"   element={<Perbaikan />}   />
              </Routes>
            </ProtectedLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
