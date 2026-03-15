import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Coins, TrendingUp, TrendingDown } from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
<<<<<<< HEAD
      const pembayaranHutang = LocalStorageService.readSheet(SHEETS.PEMBAYARAN_HUTANG);
      const pembayaranPiutang = LocalStorageService.readSheet(SHEETS.PEMBAYARAN_PIUTANG);
=======
      const pembayaranHutang = LocalStorageService.readSheet(
        SHEETS.PEMBAYARAN_HUTANG,
      );
      const pembayaranPiutang = LocalStorageService.readSheet(
        SHEETS.PEMBAYARAN_PIUTANG,
      );
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-400">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
      {/* Saldo Bersih */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-100 mb-1">Saldo Bersih</div>
            <div className="text-xl sm:text-2xl font-bold text-white">
              {formatCurrency(saldoBersih)}
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <DollarSign size={20} className="text-white" />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-blue-100">
          <div>Aset: {formatCurrency(totalPemasukan + sisaPiutang)}</div>
          <div>Kewajiban: {formatCurrency(totalPengeluaran + sisaHutang)}</div>
        </div>
      </div>

      {/* Baris dua kolom untuk 4 card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kolom Kiri: Hutang & Piutang */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-red-500/20 rounded-lg"><DollarSign size={16} className="text-red-500" /></div>
              <div>
                <div className="text-xs text-gray-400">Hutang</div>
                <div className="text-[10px] text-gray-500">{data.hutang.length} aktif</div>
              </div>
            </div>
            <div className="text-lg font-bold text-red-500 mb-1">{formatCurrency(sisaHutang)}</div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Total: {formatCurrency(totalHutang)}</span>
              <span>Dibayar: {formatCurrency(totalPembayaranHutang)}</span>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-500/20 rounded-lg"><Coins size={16} className="text-green-500" /></div>
              <div>
                <div className="text-xs text-gray-400">Piutang</div>
                <div className="text-[10px] text-gray-500">{data.piutang.length} aktif</div>
              </div>
            </div>
            <div className="text-lg font-bold text-green-500 mb-1">{formatCurrency(sisaPiutang)}</div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Total: {formatCurrency(totalPiutang)}</span>
              <span>Diterima: {formatCurrency(totalPembayaranPiutang)}</span>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Pemasukan & Pengeluaran */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg"><TrendingUp size={16} className="text-emerald-500" /></div>
              <div>
                <div className="text-xs text-gray-400">Pemasukan</div>
                <div className="text-[10px] text-gray-500">{data.pemasukan.length} transaksi</div>
              </div>
            </div>
            <div className="text-lg font-bold text-emerald-500 mb-1">{formatCurrency(totalPemasukan)}</div>
            <div className="text-[10px] text-gray-500">
              Rata²: {data.pemasukan.length ? formatCurrency(totalPemasukan / data.pemasukan.length) : "Rp 0"}
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-500/20 rounded-lg"><TrendingDown size={16} className="text-orange-500" /></div>
              <div>
                <div className="text-xs text-gray-400">Pengeluaran</div>
                <div className="text-[10px] text-gray-500">{data.pengeluaran.length} transaksi</div>
              </div>
            </div>
            <div className="text-lg font-bold text-orange-500 mb-1">{formatCurrency(totalPengeluaran)}</div>
            <div className="text-[10px] text-gray-500">
              Rata²: {data.pengeluaran.length ? formatCurrency(totalPengeluaran / data.pengeluaran.length) : "Rp 0"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ringkasan Cepat */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span> Ringkasan Cepat
          </h3>
          <div className="mb-3 p-2 rounded-lg bg-slate-900/70 border border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-gray-400">Catatan</div>
              <div className="text-xs text-white">{data.catatan.length} catatan tersimpan</div>
            </div>
            <Link to="/catatan" className="text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 px-2 py-1 rounded-md">
              Buka Catatan
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-slate-700 text-xs">
              <span className="text-gray-400">Total Aset Lancar</span>
              <span className="text-white font-medium">{formatCurrency(totalPemasukan + sisaPiutang)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-700 text-xs">
              <span className="text-gray-400">Total Kewajiban</span>
              <span className="text-white font-medium">{formatCurrency(totalPengeluaran + sisaHutang)}</span>
            </div>
            <div className="flex justify-between items-center py-1 text-xs">
              <span className="text-gray-400">Rasio Keuangan</span>
              <span className="text-white font-medium">
                {((totalPemasukan + sisaPiutang) / (totalPengeluaran + sisaHutang) || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Grafik Tren Transaksi */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex flex-col gap-3 mb-3">
            <h3 className="text-white text-sm font-medium flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span> {chartTitle}
            </h3>
            
            {/* Custom Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-[#10b981]"></div>
                <span className="text-[11px] text-gray-400">Pemasukan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-[#f97316]"></div>
                <span className="text-[11px] text-gray-400">Pengeluaran</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-[#ef4444]"></div>
                <span className="text-[11px] text-gray-400">Hutang</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-[#3b82f6]"></div>
                <span className="text-[11px] text-gray-400">Piutang</span>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setChartPeriod("mingguan")}
                className={`px-3 py-1 text-[10px] rounded-full transition-all ${
                  chartPeriod === "mingguan" ? "bg-blue-600 text-white shadow-lg" : "bg-slate-700 text-gray-300 hover:bg-slate-600 font-medium"
                }`}>
                Mingguan
              </button>
              <button
                onClick={() => setChartPeriod("bulanan")}
                className={`px-3 py-1 text-[10px] rounded-full transition-all ${
                  chartPeriod === "bulanan" ? "bg-blue-600 text-white shadow-lg" : "bg-slate-700 text-gray-300 hover:bg-slate-600 font-medium"
                }`}>
                Bulanan
              </button>
              <button
                onClick={() => setChartPeriod("tahunan")}
                className={`px-3 py-1 text-[10px] rounded-full transition-all ${
                  chartPeriod === "tahunan" ? "bg-blue-600 text-white shadow-lg" : "bg-slate-700 text-gray-300 hover:bg-slate-600 font-medium"
                }`}>
                Tahunan
              </button>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="h-72 w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#9ca3af" 
                    tick={{ fontSize: 11, fill: '#9ca3af' }} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    tick={{ fontSize: 11, fill: '#9ca3af' }} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => 'Rp ' + (v/1000000).toFixed(0) + 'Jt'} 
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                  />
                  <Bar dataKey="pemasukan" name="Pemasukan" fill="#10b981" radius={[3, 3, 0, 0]} barSize={12} />
                  <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#f97316" radius={[3, 3, 0, 0]} barSize={12} />
                  <Bar dataKey="hutang" name="Hutang" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={12} />
                  <Bar dataKey="piutang" name="Piutang" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={12} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500 text-xs italic">
              Tidak ada data untuk periode ini
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
