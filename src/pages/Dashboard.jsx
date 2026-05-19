import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DollarSign, Coins, TrendingUp, TrendingDown, ArrowUpRight, Target, Edit2, Check, Wallet, Search, X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Wrench, BookOpen, Receipt } from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import { SkeletonDashboard } from "../components/Skeleton";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [data, setData] = useState({
    hutang: [],
    piutang: [],
    pemasukan: [],
    pengeluaran: [],
    pembayaranHutang: [],
    pembayaranPiutang: [],
    catatan: [],
    perbaikan: [],
    tagihan: [],
    pembayaranTagihan: [],
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState("bulanan"); // 'mingguan', 'bulanan', 'tahunan'
  
  // State for Target Tabungan
  const [targetTabungan, setTargetTabungan] = useState(() => {
    return parseFloat(localStorage.getItem("@TargetTabungan")) || 10000000;
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const targetInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      setLoading(true);
      const hutang = LocalStorageService.readSheet(SHEETS.HUTANG);
      const piutang = LocalStorageService.readSheet(SHEETS.PIUTANG);
      const pemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
      const pengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
      const pembayaranHutang = LocalStorageService.readSheet(SHEETS.PEMBAYARAN_HUTANG);
      const pembayaranPiutang = LocalStorageService.readSheet(SHEETS.PEMBAYARAN_PIUTANG);
      const catatan = LocalStorageService.readSheet(SHEETS.CATATAN);
      const perbaikan = LocalStorageService.readSheet(SHEETS.PERBAIKAN);
      const tagihan = LocalStorageService.readSheet(SHEETS.TAGIHAN);
      const pembayaranTagihan = LocalStorageService.readSheet(SHEETS.PEMBAYARAN_TAGIHAN);

      setData({
        hutang,
        piutang,
        pemasukan,
        pengeluaran,
        pembayaranHutang,
        pembayaranPiutang,
        catatan,
        perbaikan,
        tagihan,
        pembayaranTagihan,
      });
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (num) => "Rp " + num.toLocaleString("id-ID");

  // Calculate totals (sisa and total)
  const totalHutang = data.hutang.reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const totalDibayarHutang = data.pembayaranHutang
    .filter(i => !i.type || i.type === "bayar")
    .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const totalPenambahanHutang = data.pembayaranHutang
    .filter(i => i.type === "tambah")
    .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const sisaHutang = Math.max(totalHutang + totalPenambahanHutang - totalDibayarHutang, 0);

  const totalPiutang = data.piutang.reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const totalDibayarPiutang = data.pembayaranPiutang
    .filter(i => !i.type || i.type === "bayar")
    .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const totalPenambahanPiutang = data.pembayaranPiutang
    .filter(i => i.type === "tambah")
    .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const sisaPiutang = Math.max(totalPiutang + totalPenambahanPiutang - totalDibayarPiutang, 0);

  const totalPemasukan = data.pemasukan.reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const totalPengeluaran = data.pengeluaran.reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);

  const saldoBersih = totalPemasukan + sisaPiutang - totalPengeluaran - sisaHutang;

  // Calculate new stats
  const currentMonthYear = new Date().toISOString().slice(0, 7);

  const pemasukanBulanIni = data.pemasukan
    .filter((i) => i.tanggal && i.tanggal.startsWith(currentMonthYear))
    .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);

  const pengeluaranBulanIni = data.pengeluaran
    .filter((i) => i.tanggal && i.tanggal.startsWith(currentMonthYear))
    .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
    
  const sisaUangBulanIni = pemasukanBulanIni - pengeluaranBulanIni;

  const pemasukanTerbaru = useMemo(() => {
    const sorted = [...data.pemasukan].sort((a,b) => new Date(b.tanggal||b.createdAt) - new Date(a.tanggal||a.createdAt));
    return sorted.length > 0 ? sorted[0] : null;
  }, [data.pemasukan]);

  // Target Tabungan Handlers
  const handleSaveTarget = () => {
    const val = parseFloat(targetInput.replace(/\D/g, ""));
    if (!isNaN(val) && val > 0) {
      setTargetTabungan(val);
      localStorage.setItem("@TargetTabungan", val.toString());
    }
    setIsEditingTarget(false);
  };
  
  const progressTabungan = targetTabungan > 0 ? Math.min((saldoBersih / targetTabungan) * 100, 100) : 0;

  // Data untuk grafik per periode
  const chartData = useMemo(() => {
    const allTransactions = [
      ...data.pemasukan.map((item) => ({ jenis: "pemasukan", jumlah: parseFloat(item.jumlah) || 0, tanggal: item.tanggal })),
      ...data.pengeluaran.map((item) => ({ jenis: "pengeluaran", jumlah: parseFloat(item.jumlah) || 0, tanggal: item.tanggal })),
      // Filter hutang/piutang agar tidak double count jika sudah di-sync ke pemasukan/pengeluaran
      ...data.hutang.map((item) => ({ jenis: "hutang", jumlah: parseFloat(item.jumlah) || 0, tanggal: item.tanggal })),
      ...data.piutang.map((item) => ({ jenis: "piutang", jumlah: parseFloat(item.jumlah) || 0, tanggal: item.tanggal })),
    ];

    const grouped = {};

    if (chartPeriod === "mingguan") {
      // 7 days from today
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "numeric" });
        grouped[dateStr] = { label, key: dateStr, pemasukan: 0, pengeluaran: 0, hutang: 0, piutang: 0 };
      }
      
      allTransactions.forEach(item => {
        if (grouped[item.tanggal]) {
          grouped[item.tanggal][item.jenis] += item.jumlah;
        }
      });
    } else if (chartPeriod === "tahunan") {
      allTransactions.forEach(item => {
        if (!item.tanggal) return;
        const year = new Date(item.tanggal).getFullYear().toString();
        if (!grouped[year]) {
          grouped[year] = { label: year, key: year, pemasukan: 0, pengeluaran: 0, hutang: 0, piutang: 0 };
        }
        grouped[year][item.jenis] += item.jumlah;
      });
    } else {
      // Bulanan (Default 6 months)
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const yearMonth = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        const label = d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
        grouped[yearMonth] = { label, key: yearMonth, pemasukan: 0, pengeluaran: 0, hutang: 0, piutang: 0 };
      }

      allTransactions.forEach(item => {
        if (!item.tanggal) return;
        const d = new Date(item.tanggal);
        const yearMonth = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        if (grouped[yearMonth]) {
          grouped[yearMonth][item.jenis] += item.jumlah;
        }
      });
    }

    return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
  }, [data, chartPeriod]);

  const chartTitle = useMemo(() => {
    switch(chartPeriod) {
      case "mingguan": return "Tren Transaksi 7 Hari Terakhir";
      case "tahunan": return "Tren Transaksi per Tahun";
      default: return "Tren Transaksi 6 Bulan Terakhir";
    }
  }, [chartPeriod]);

  // ─── 5 most recent transactions across all categories ───
  const recentTransactions = useMemo(() => {
    const all = [
      ...data.pemasukan.map((i) => ({ label: i.nama || i.sumber || "Pemasukan", amount: parseFloat(i.jumlah) || 0, date: i.tanggal || i.createdAt, type: "pemasukan" })),
      ...data.pengeluaran.map((i) => ({ label: i.kategori || i.nama || "Pengeluaran", amount: parseFloat(i.jumlah) || 0, date: i.tanggal || i.createdAt, type: "pengeluaran" })),
      ...data.hutang.map((i) => ({ label: i.nama || "Hutang", amount: parseFloat(i.jumlah) || 0, date: i.tanggal || i.createdAt, type: "hutang" })),
      ...data.piutang.map((i) => ({ label: i.namaOrang || i.nama || "Piutang", amount: parseFloat(i.jumlah) || 0, date: i.tanggal || i.createdAt, type: "piutang" })),
    ];
    return all
      .filter((i) => i.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [data]);

  // ─── Global Search Logic ───
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results = [];
    
    // Search in all modules
    data.pemasukan.forEach(i => {
      if ((i.nama||'').toLowerCase().includes(query) || (i.catatan||'').toLowerCase().includes(query)) {
        results.push({ ...i, type: 'pemasukan', label: i.nama, path: '/pemasukan' });
      }
    });
    data.pengeluaran.forEach(i => {
      if ((i.nama||'').toLowerCase().includes(query) || (i.catatan||'').toLowerCase().includes(query) || (i.kategori||'').toLowerCase().includes(query)) {
        results.push({ ...i, type: 'pengeluaran', label: i.nama, path: '/pengeluaran' });
      }
    });
    data.hutang.forEach(i => {
      if ((i.nama||'').toLowerCase().includes(query) || (i.catatan||'').toLowerCase().includes(query)) {
        results.push({ ...i, type: 'hutang', label: i.nama, path: '/hutang' });
      }
    });
    data.piutang.forEach(i => {
      if ((i.nama||'').toLowerCase().includes(query) || (i.catatan||'').toLowerCase().includes(query) || (i.namaOrang||'').toLowerCase().includes(query)) {
        results.push({ ...i, type: 'piutang', label: i.namaOrang || i.nama, path: '/piutang' });
      }
    });
    data.catatan.forEach(i => {
      if ((i.judul||'').toLowerCase().includes(query) || (i.isi||'').toLowerCase().includes(query)) {
        results.push({ ...i, type: 'catatan', label: i.judul || 'Catatan', path: '/catatan' });
      }
    });
    data.tagihan.forEach(i => {
      if ((i.nama||'').toLowerCase().includes(query) || (i.kategori||'').toLowerCase().includes(query)) {
        results.push({ ...i, type: 'tagihan', label: i.nama, path: '/tagihan' });
      }
    });
    
    setSearchResults(results.slice(0, 10));
  }, [searchQuery, data]);

  if (loading) {
    return <SkeletonDashboard />;
  }

  const TYPE_CONFIG = {
    pemasukan:  { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: TrendingUp,   sign: "+" },
    pengeluaran:{ color: "text-orange-400",  bg: "bg-orange-500/10",  icon: TrendingDown, sign: "-" },
    hutang:     { color: "text-red-400",     bg: "bg-red-500/10",     icon: DollarSign,   sign: "-" },
    piutang:    { color: "text-blue-400",    bg: "bg-blue-500/10",    icon: Coins,        sign: "+" },
    tagihan:    { color: "text-violet-400",  bg: "bg-violet-500/10",  icon: Receipt,      sign: "-" },
    catatan:    { color: "text-purple-400",  bg: "bg-purple-500/10",  icon: BookOpen,     sign: "" },
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ── Global Search Bar ── */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={18} className="text-slate-500 group-focus-within:text-blue-400 transition-colors" />
        </div>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value.trim()) setShowSearchModal(true);
          }}
          placeholder="Cari transaksi, hutang, piutang, atau catatan..."
          className="w-full bg-[#0e1523] border border-[#1e2d45] focus:border-blue-500/50 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all shadow-lg"
        />
        
        {showSearchModal && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0e1523] border border-[#1e2d45] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-2 bg-[#141d2e] border-b border-[#1e2d45] flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hasil Pencarian</span>
              <button onClick={() => setShowSearchModal(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((res, i) => (
                  <Link 
                    key={i}
                    to={res.path}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-[#1e2d45] last:border-0"
                  >
                    <div className={`w-8 h-8 rounded-lg ${TYPE_CONFIG[res.type]?.bg || 'bg-slate-500/10'} flex items-center justify-center shrink-0`}>
                      {(() => {
                        const Icon = TYPE_CONFIG[res.type]?.icon || Search;
                        return <Icon size={14} className={TYPE_CONFIG[res.type]?.color || 'text-slate-400'} />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{res.label}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{res.type}</p>
                    </div>
                    {res.jumlah && (
                      <span className="text-xs font-bold text-white shrink-0">{formatCurrency(parseFloat(res.jumlah))}</span>
                    )}
                  </Link>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  Tidak ditemukan hasil untuk "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Hero: Saldo Bersih ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 shadow-xl shadow-blue-900/30">
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -right-2 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-xs font-medium text-blue-200 mb-1">Saldo Bersih</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {formatCurrency(saldoBersih)}
          </p>
          <div className="mt-3 flex gap-5 text-xs text-blue-200">
            <span>Aset: <span className="text-white font-medium">{formatCurrency(totalPemasukan + sisaPiutang)}</span></span>
            <span>Kewajiban: <span className="text-white font-medium">{formatCurrency(totalPengeluaran + sisaHutang)}</span></span>
            <span className="ml-auto hidden sm:block">
              Rasio: <span className="text-white font-medium">
                {((totalPemasukan + sisaPiutang) / Math.max(totalPengeluaran + sisaHutang, 1)).toFixed(2)}×
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 6 Stat Cards (Ringkasan Pintar) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Total Uang Bulan Ini */}
        <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><Wallet size={16} className="text-emerald-400" /></div>
          </div>
          <p className="text-xs text-slate-400 mb-1">Uang Bulan Ini</p>
          <p className={`text-base font-bold leading-tight ${sisaUangBulanIni >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(sisaUangBulanIni)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Sisa pemasukan & pengeluaran</p>
        </div>

        {/* Pengeluaran Bulan Ini */}
        <div className="group bg-[#0e1523] border border-[#1e2d45] hover:border-orange-500/30 rounded-xl p-4 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-500/10 rounded-lg"><TrendingDown size={16} className="text-orange-400" /></div>
            <Link to="/pengeluaran" className="p-1 text-slate-600 hover:text-orange-400 transition-colors">
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <p className="text-xs text-slate-400 mb-1">Pengeluaran (Bulan Ini)</p>
          <p className="text-base font-bold text-orange-400 leading-tight">{formatCurrency(pengeluaranBulanIni)}</p>
          <button 
            onClick={() => navigate("/pengeluaran", { state: { autoAdd: true } })}
            className="mt-3 w-full py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 border border-orange-500/20 transition-all active:scale-[0.98]"
          >
            <Plus size={12} /> Tambah
          </button>
        </div>

        {/* Pemasukan Terbaru */}
        <div className="group bg-[#0e1523] border border-[#1e2d45] hover:border-emerald-500/30 rounded-xl p-4 transition-colors flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp size={16} className="text-emerald-400" /></div>
            <Link to="/pemasukan" className="p-1 text-slate-600 hover:text-emerald-400 transition-colors">
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <p className="text-xs text-slate-400 mb-1">Pemasukan Terbaru</p>
          <p className="text-base font-bold text-emerald-400 leading-tight">
            {pemasukanTerbaru ? formatCurrency(pemasukanTerbaru.jumlah) : "Rp 0"}
          </p>
          <button 
            onClick={() => navigate("/pemasukan", { state: { autoAdd: true } })}
            className="mt-auto pt-3 w-full">
            <div className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 border border-emerald-500/20 transition-all active:scale-[0.98]">
              <Plus size={12} /> Tambah
            </div>
          </button>
        </div>

        {/* Hutang Aktif */}
        <div className="group bg-[#0e1523] border border-[#1e2d45] hover:border-red-500/30 rounded-xl p-4 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-500/10 rounded-lg"><DollarSign size={16} className="text-red-400" /></div>
            <Link to="/hutang" className="p-1 text-slate-600 hover:text-red-400 transition-colors">
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <p className="text-xs text-slate-400 mb-1">Hutang Aktif</p>
          <p className="text-base font-bold text-red-400 leading-tight">{formatCurrency(sisaHutang)}</p>
          <button 
            onClick={() => navigate("/hutang", { state: { autoAdd: true } })}
            className="mt-3 w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 border border-red-500/20 transition-all active:scale-[0.98]"
          >
            <Plus size={12} /> Tambah
          </button>
        </div>

        {/* Piutang Aktif */}
        <div className="group bg-[#0e1523] border border-[#1e2d45] hover:border-blue-500/30 rounded-xl p-4 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Coins size={16} className="text-blue-400" /></div>
            <Link to="/piutang" className="p-1 text-slate-600 hover:text-blue-400 transition-colors">
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <p className="text-xs text-slate-400 mb-1">Piutang Aktif</p>
          <p className="text-base font-bold text-blue-400 leading-tight">{formatCurrency(sisaPiutang)}</p>
          <button 
            onClick={() => navigate("/piutang", { state: { autoAdd: true } })}
            className="mt-3 w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 border border-blue-500/20 transition-all active:scale-[0.98]"
          >
            <Plus size={12} /> Tambah
          </button>
        </div>

        {/* Tagihan Belum Bayar */}
        {(() => {
          const tagihanBelumBayar = data.tagihan.filter(t => !t.isPaid);
          const totalTagihanBelum = tagihanBelumBayar.reduce((s,t) => s+(parseFloat(t.nominal)||0), 0);
          return (
            <div className="group bg-[#0e1523] border border-[#1e2d45] hover:border-violet-500/30 rounded-xl p-4 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-violet-500/10 rounded-lg"><Receipt size={16} className="text-violet-400" /></div>
                <Link to="/tagihan" className="p-1 text-slate-600 hover:text-violet-400 transition-colors">
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <p className="text-xs text-slate-400 mb-1">Tagihan Belum Bayar</p>
              <p className="text-base font-bold text-violet-400 leading-tight">{formatCurrency(totalTagihanBelum)}</p>
              <button
                onClick={() => navigate("/tagihan")}
                className="mt-3 w-full py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 border border-violet-500/20 transition-all active:scale-[0.98]"
              >
                <Plus size={12} /> Tagihan
              </button>
            </div>
          );
        })()}

        {/* Target Tabungan */}
        <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4 flex flex-col justify-between relative group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg"><Target size={16} className="text-indigo-400" /></div>
            {!isEditingTarget && (
              <button onClick={() => { setTargetInput(targetTabungan.toString()); setIsEditingTarget(true); }} className="p-1 rounded text-slate-600 hover:text-indigo-400 transition-colors">
                <Edit2 size={13} />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-1">Target Tabungan</p>
          
          {isEditingTarget ? (
            <div className="flex items-center gap-1 mt-1">
              <input 
                ref={targetInputRef}
                autoFocus
                type="text"
                inputMode="numeric"
                className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-indigo-500"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveTarget(); }}
              />
              <button onClick={handleSaveTarget} className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <>
              <p className="text-base font-bold text-indigo-400 leading-tight truncate" title={formatCurrency(targetTabungan)}>
                {formatCurrency(targetTabungan)}
              </p>
              <div className="mt-2.5 w-full bg-[#1e2d45] rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressTabungan}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">{progressTabungan.toFixed(1)}% tercapai</p>
            </>
          )}
        </div>
      </div>

      {/* ── Chart (full width) ── */}
      <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
            {chartTitle}
          </h3>
          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3">
              {[["#10b981","Pemasukan"],["#f97316","Pengeluaran"],["#ef4444","Hutang"],["#3b82f6","Piutang"]].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{background:c}} />
                  <span className="text-xs text-slate-400">{l}</span>
                </div>
              ))}
            </div>
            {/* Period filter */}
            <div className="flex items-center gap-1 bg-[#141d2e] rounded-lg p-1">
              {[["mingguan","7H"],["bulanan","6B"],["tahunan","Thn"]].map(([val,short]) => (
                <button
                  key={val}
                  onClick={() => setChartPeriod(val)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                    chartPeriod === val
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {short}
                </button>
              ))}
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#334155"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#334155"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000000 ? "Rp " + (v / 1000000).toFixed(0) + "Jt" : "Rp " + (v/1000).toFixed(0) + "K")}
                />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: "#0e1523",
                    border: "1px solid #1e2d45",
                    borderRadius: "10px",
                    fontSize: "12px",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                  }}
                  labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="pemasukan"   name="Pemasukan"   fill="#10b981" radius={[4,4,0,0]} maxBarSize={20} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#f97316" radius={[4,4,0,0]} maxBarSize={20} />
                <Bar dataKey="hutang"      name="Hutang"      fill="#ef4444" radius={[4,4,0,0]} maxBarSize={20} />
                <Bar dataKey="piutang"     name="Piutang"     fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={20} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
            Belum ada data transaksi
          </div>
        )}
      </div>

      {/* ── Recent Transactions ── */}
      <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d45]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
            Transaksi Terbaru
          </h3>
          <span className="text-xs text-slate-500">{recentTransactions.length} terakhir</span>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-[#1e2d45]">
            {recentTransactions.map((tx, i) => {
              const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.pengeluaran;
              const Icon = cfg.icon;
              const isIncome = tx.type === "pemasukan" || tx.type === "piutang";
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate font-medium">{tx.label}</p>
                    <p className="text-xs text-slate-500">
                      {tx.date ? new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
                    {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-500 text-sm">
            Belum ada transaksi tercatat
          </div>
        )}

        </div>

      {/* ── Finance Calendar ── */}
      <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-500 rounded-full inline-block" />
            Kalender Keuangan
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-300 min-w-[100px] text-center capitalize">
              {calendarDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </span>
            <button 
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["S", "S", "R", "K", "J", "S", "M"].map((d, i) => (
            <div key={i} className="text-[10px] font-bold text-slate-500 text-center py-1">{d}</div>
          ))}
          {(() => {
            const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
            const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
            const days = [];
            
            // Adjust firstDay (Sunday is 0, we want Monday to be 0 or keep as is)
            // Let's keep Sunday as first column for simplicity if needed, but here it's S S R K J S M (Sun to Sat)
            
            for (let i = 0; i < firstDay; i++) {
              days.push(<div key={`empty-${i}`} className="h-8" />);
            }
            
            const today = new Date();
            const isCurrentMonth = today.getMonth() === calendarDate.getMonth() && today.getFullYear() === calendarDate.getFullYear();
            
            for (let d = 1; d <= daysInMonth; d++) {
              const dateStr = `${calendarDate.getFullYear()}-${(calendarDate.getMonth() + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
              const isToday = isCurrentMonth && today.getDate() === d;
              const isSelected = selectedDate === dateStr;
              
              // Find events for this day
              const events = [
                ...data.pemasukan.filter(i => i.tanggal === dateStr).map(() => 'bg-emerald-500'),
                ...data.pengeluaran.filter(i => i.tanggal === dateStr).map(() => 'bg-orange-500'),
                ...data.hutang.filter(i => i.tanggal === dateStr).map(() => 'bg-red-500'),
                ...data.piutang.filter(i => i.tanggal === dateStr).map(() => 'bg-blue-500'),
                ...data.perbaikan.filter(i => i.tanggal === dateStr).map(() => 'bg-indigo-500'),
                ...data.catatan.filter(i => i.tanggal === dateStr).map(() => 'bg-purple-500'),
                ...data.pembayaranTagihan.filter(i => i.tanggal === dateStr).map(() => 'bg-violet-500'),
              ].slice(0, 3);

              days.push(
                <div 
                  key={d} 
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-10 flex flex-col items-center justify-center rounded-lg border cursor-pointer transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/20' : 
                    isToday ? 'border-blue-500/50 bg-blue-500/5' : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected || isToday ? 'text-blue-400' : 'text-slate-300'}`}>{d}</span>
                  <div className="flex gap-0.5 mt-1">
                    {events.map((cls, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${cls}`} />
                    ))}
                  </div>
                </div>
              );
            }
            return days;
          })()}
        </div>
        
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-2 border-t border-[#1e2d45]/50 pt-3">
          {[
            { color: 'bg-emerald-500', label: 'Pemasukan' },
            { color: 'bg-orange-500', label: 'Pengeluaran' },
            { color: 'bg-red-500', label: 'Hutang' },
            { color: 'bg-blue-500', label: 'Piutang' },
            { color: 'bg-indigo-500', label: 'Perbaikan' },
            { color: 'bg-purple-500', label: 'Catatan' },
            { color: 'bg-violet-500', label: 'Tagihan' },
          ].map(leg => (
            <div key={leg.label} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${leg.color}`} />
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{leg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Activity History for Selected Date ── */}
      <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d45] bg-[#141d2e]/50">
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-blue-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Riwayat Aktivitas</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700/50 uppercase tracking-widest">
            {new Date(selectedDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          {(() => {
            const activities = [
              ...data.pemasukan.filter(i => i.tanggal === selectedDate).map(i => ({ ...i, category: 'Pemasukan', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', path: '/pemasukan', label: i.nama || i.sumber, amount: i.jumlah })),
              ...data.pengeluaran.filter(i => i.tanggal === selectedDate).map(i => ({ ...i, category: 'Pengeluaran', icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-500/10', path: '/pengeluaran', label: i.kategori || i.nama, amount: i.jumlah })),
              ...data.hutang.filter(i => i.tanggal === selectedDate).map(i => ({ ...i, category: 'Hutang', icon: DollarSign, color: 'text-red-400', bg: 'bg-red-500/10', path: '/hutang', label: i.nama, amount: i.jumlah })),
              ...data.piutang.filter(i => i.tanggal === selectedDate).map(i => ({ ...i, category: 'Piutang', icon: Coins, color: 'text-blue-400', bg: 'bg-blue-500/10', path: '/piutang', label: i.namaOrang || i.nama, amount: i.jumlah })),
              ...data.perbaikan.filter(i => i.tanggal === selectedDate).map(i => ({ ...i, category: 'Perbaikan', icon: Wrench, color: 'text-indigo-400', bg: 'bg-indigo-500/10', path: '/perbaikan', label: i.nama, amount: i.biaya })),
              ...data.catatan.filter(i => i.tanggal === selectedDate).map(i => ({ ...i, category: 'Catatan', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10', path: '/catatan', label: i.judul || 'Catatan Singkat' })),
              ...data.pembayaranTagihan.filter(i => i.tanggal === selectedDate).map(i => ({ ...i, category: 'Tagihan', icon: Receipt, color: 'text-violet-400', bg: 'bg-violet-500/10', path: '/tagihan', label: i.namaTagihan || 'Tagihan', amount: i.jumlah })),
            ].sort((a, b) => new Date(b.createdAt || b.tanggal) - new Date(a.createdAt || a.tanggal));

            if (activities.length === 0) {
              return (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <CalendarIcon size={32} className="opacity-10 mb-2" />
                  <p className="text-xs font-medium">Tidak ada aktivitas pada tanggal ini</p>
                </div>
              );
            }

            return (
              <div className="space-y-1">
                {activities.map((act, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(act.path)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.03] rounded-xl transition-all group border border-transparent hover:border-[#1e2d45]"
                  >
                    <div className={`w-9 h-9 rounded-xl ${act.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <act.icon size={16} className={act.color} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${act.color}`}>{act.category}</span>
                        <span className="text-[10px] text-slate-600">•</span>
                        <span className="text-[9px] text-slate-500 font-medium">
                          {act.createdAt ? new Date(act.createdAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">{act.label}</p>
                    </div>
                    {act.amount !== undefined && (
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${act.category === 'Pemasukan' || act.category === 'Piutang' ? 'text-emerald-400' : act.category === 'Catatan' ? 'text-purple-400' : 'text-orange-400'}`}>
                          {act.category === 'Pemasukan' || act.category === 'Piutang' ? '+' : act.category === 'Catatan' ? '' : '-'}{formatCurrency(parseFloat(act.amount))}
                        </p>
                      </div>
                    )}
                    <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors ml-1" />
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

    </div>
  );
}
