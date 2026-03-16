import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { useState } from "react";
import {
  Home,
  DollarSign,
  Coins,
  TrendingUp,
  TrendingDown,
  Wrench,
  Download,
} from "lucide-react";

// Pages
import Dashboard from "./pages/Dashboard";
import Hutang from "./pages/Hutang";
import Piutang from "./pages/Piutang";
import Pemasukan from "./pages/Pemasukan";
import Pengeluaran from "./pages/Pengeluaran";
import Perbaikan from "./pages/Perbaikan";
import Catatan from "./pages/catatan";

// Components
import ExportImportModal from "./components/ExportImportModal";

function Layout({ children }) {
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);

  const navItems = [
    { path: "/", icon: Home, label: "Beranda" },
    { path: "/hutang", icon: DollarSign, label: "Hutang" },
    { path: "/piutang", icon: Coins, label: "Piutang" },
    { path: "/pemasukan", icon: TrendingUp, label: "Pemasukan" },
    { path: "/pengeluaran", icon: TrendingDown, label: "Pengeluaran" },
    { path: "/perbaikan", icon: Wrench, label: "Perbaikan" },
  ];

  const mobileNavItems = navItems;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="container mx-auto px-3 h-14 flex items-center justify-between">
          <Link to="/catatan" className="hover:text-blue-400 transition-colors">
            <h1 className="text-lg font-bold">📘 Catatan</h1>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Export/Import">
            <Download size={20} />
          </button>
        </div>
      </header>

      {/* Desktop Navigation - lebih kecil */}
      <nav className="hidden md:block bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-3">
          <div className="flex gap-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
                    isActive
                      ? "border-blue-500 text-blue-500"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}>
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content - padding lebih kecil */}
      <main className="container mx-auto px-2 sm:px-3 py-4 pb-28 md:pb-4">
        {children}
      </main>

      {/* Mobile Bottom Navigation - lebih kecil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-40">
        <div className="grid grid-cols-6 h-14">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center transition-colors ${
                  isActive ? "text-blue-500" : "text-gray-400"
                }`}>
                <Icon size={18} />
                <span className="text-[9px] mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Export/Import Modal */}
      <ExportImportModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/hutang" element={<Hutang />} />
          <Route path="/piutang" element={<Piutang />} />
          <Route path="/pemasukan" element={<Pemasukan />} />
          <Route path="/pengeluaran" element={<Pengeluaran />} />
          <Route path="/catatan" element={<Catatan />} />
          <Route path="/perbaikan" element={<Perbaikan />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
