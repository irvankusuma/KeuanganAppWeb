import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Coins, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
  });
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState("bulanan"); // 'mingguan', 'bulanan', 'tahunan'

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

      setData({
        hutang,
        piutang,
        pemasukan,
        pengeluaran,
        pembayaranHutang,
        pembayaranPiutang,
        catatan,
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
  const totalPembayaranHutang = data.pembayaranHutang.reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const sisaHutang = totalHutang - totalPembayaranHutang;

  const totalPiutang = data.piutang.reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const totalPembayaranPiutang = data.pembayaranPiutang.reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const sisaPiutang = totalPiutang - totalPembayaranPiutang;

  const totalPemasukan = data.pemasukan.reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const totalPengeluaran = data.pengeluaran.reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);

  const saldoBersih = totalPemasukan + sisaPiutang - totalPengeluaran - sisaHutang;

  // Data untuk grafik per periode
  const chartData = useMemo(() => {
    const allTransactions = [
      ...data.pemasukan.map((item) => ({ jenis: "pemasukan", jumlah: parseFloat(item.jumlah) || 0, tanggal: item.tanggal })),
      ...data.pengeluaran.map((item) => ({ jenis: "pengeluaran", jumlah: parseFloat(item.jumlah) || 0, tanggal: item.tanggal })),
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

  if (loading) {
    return <SkeletonDashboard />;
  }

  const TYPE_CONFIG = {
    pemasukan:  { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: TrendingUp,   sign: "+" },
    pengeluaran:{ color: "text-orange-400",  bg: "bg-orange-500/10",  icon: TrendingDown, sign: "-" },
    hutang:     { color: "text-red-400",     bg: "bg-red-500/10",     icon: DollarSign,   sign: "-" },
    piutang:    { color: "text-blue-400",    bg: "bg-blue-500/10",    icon: Coins,        sign: "+" },
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

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

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Pemasukan */}
        <Link to="/pemasukan" className="group bg-[#0e1523] border border-[#1e2d45] hover:border-emerald-500/30 rounded-xl p-4 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp size={16} className="text-emerald-400" /></div>
            <ArrowUpRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400 mb-1">Pemasukan</p>
          <p className="text-base font-bold text-emerald-400 leading-tight">{formatCurrency(totalPemasukan)}</p>
          <p className="text-xs text-slate-500 mt-1">{data.pemasukan.filter(i => !i.parent_id).length} sumber</p>
        </Link>

        {/* Pengeluaran */}
        <Link to="/pengeluaran" className="group bg-[#0e1523] border border-[#1e2d45] hover:border-orange-500/30 rounded-xl p-4 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-500/10 rounded-lg"><TrendingDown size={16} className="text-orange-400" /></div>
            <ArrowUpRight size={14} className="text-slate-600 group-hover:text-orange-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400 mb-1">Pengeluaran</p>
          <p className="text-base font-bold text-orange-400 leading-tight">{formatCurrency(totalPengeluaran)}</p>
          <p className="text-xs text-slate-500 mt-1">{data.pengeluaran.length} transaksi</p>
        </Link>

        {/* Hutang */}
        <Link to="/hutang" className="group bg-[#0e1523] border border-[#1e2d45] hover:border-red-500/30 rounded-xl p-4 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-500/10 rounded-lg"><DollarSign size={16} className="text-red-400" /></div>
            <ArrowUpRight size={14} className="text-slate-600 group-hover:text-red-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400 mb-1">Hutang</p>
          <p className="text-base font-bold text-red-400 leading-tight">{formatCurrency(sisaHutang)}</p>
          <p className="text-xs text-slate-500 mt-1">{data.hutang.length} aktif · dibayar {formatCurrency(totalPembayaranHutang)}</p>
        </Link>

        {/* Piutang */}
        <Link to="/piutang" className="group bg-[#0e1523] border border-[#1e2d45] hover:border-blue-500/30 rounded-xl p-4 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Coins size={16} className="text-blue-400" /></div>
            <ArrowUpRight size={14} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400 mb-1">Piutang</p>
          <p className="text-base font-bold text-blue-400 leading-tight">{formatCurrency(sisaPiutang)}</p>
          <p className="text-xs text-slate-500 mt-1">{data.piutang.length} aktif · diterima {formatCurrency(totalPembayaranPiutang)}</p>
        </Link>
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

        {/* Catatan shortcut */}
        <div className="px-4 py-3 border-t border-[#1e2d45] flex items-center justify-between">
          <span className="text-xs text-slate-500">{data.catatan.length} catatan tersimpan</span>
          <Link to="/catatan" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Buka Catatan →
          </Link>
        </div>
      </div>
    </div>
  );
}
