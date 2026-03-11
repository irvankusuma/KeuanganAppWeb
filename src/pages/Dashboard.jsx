import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Coins, TrendingUp, TrendingDown } from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import {
  BarChart,
  Bar,
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
      const pembayaranHutang = LocalStorageService.readSheet(
        SHEETS.PEMBAYARAN_HUTANG,
      );
      const pembayaranPiutang = LocalStorageService.readSheet(
        SHEETS.PEMBAYARAN_PIUTANG,
      );
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

  // Calculate totals
  const totalHutang = data.hutang.reduce(
    (sum, item) => sum + (parseFloat(item.jumlah) || 0),
    0,
  );
  const totalPembayaranHutang = data.pembayaranHutang.reduce(
    (sum, item) => sum + (parseFloat(item.jumlah) || 0),
    0,
  );
  const sisaHutang = totalHutang - totalPembayaranHutang;

  const totalPiutang = data.piutang.reduce(
    (sum, item) => sum + (parseFloat(item.jumlah) || 0),
    0,
  );
  const totalPembayaranPiutang = data.pembayaranPiutang.reduce(
    (sum, item) => sum + (parseFloat(item.jumlah) || 0),
    0,
  );
  const sisaPiutang = totalPiutang - totalPembayaranPiutang;

  const totalPemasukan = data.pemasukan.reduce(
    (sum, item) => sum + (parseFloat(item.jumlah) || 0),
    0,
  );
  const totalPengeluaran = data.pengeluaran.reduce(
    (sum, item) => sum + (parseFloat(item.jumlah) || 0),
    0,
  );

  const saldoBersih =
    totalPemasukan + sisaPiutang - totalPengeluaran - sisaHutang;

  // Data untuk grafik per bulan
  const chartData = useMemo(() => {
    const allTransactions = [
      ...data.pemasukan.map((item) => ({
        ...item,
        jenis: "pemasukan",
        jumlah: parseFloat(item.jumlah) || 0,
        tanggal: item.tanggal,
      })),
      ...data.pengeluaran.map((item) => ({
        ...item,
        jenis: "pengeluaran",
        jumlah: parseFloat(item.jumlah) || 0,
        tanggal: item.tanggal,
      })),
      ...data.hutang.map((item) => ({
        ...item,
        jenis: "hutang",
        jumlah: parseFloat(item.jumlah) || 0,
        tanggal: item.tanggal,
      })),
      ...data.piutang.map((item) => ({
        ...item,
        jenis: "piutang",
        jumlah: parseFloat(item.jumlah) || 0,
        tanggal: item.tanggal,
      })),
    ];

    const grouped = {};
    allTransactions.forEach((item) => {
      if (!item.tanggal) return;
      const date = new Date(item.tanggal);
      if (isNaN(date.getTime())) return;
      const month = date.toLocaleDateString("id-ID", {
        month: "short",
        year: "numeric",
      });
      if (!grouped[month]) {
        grouped[month] = {
          bulan: month,
          pemasukan: 0,
          pengeluaran: 0,
          hutang: 0,
          piutang: 0,
        };
      }
      grouped[month][item.jenis] += item.jumlah;
    });

    const sorted = Object.values(grouped).sort((a, b) => {
      const dateA = new Date(a.bulan + " 1, 2024");
      const dateB = new Date(b.bulan + " 1, 2024");
      return dateA - dateB;
    });

    return sorted.slice(-6);
  }, [data]);

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
          {/* Hutang Card */}
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-red-500/20 rounded-lg">
                <DollarSign size={16} className="text-red-500" />
              </div>
              <div>
                <div className="text-xs text-gray-400">Hutang</div>
                <div className="text-[10px] text-gray-500">
                  {data.hutang.length} aktif
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-red-500 mb-1">
              {formatCurrency(sisaHutang)}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Total: {formatCurrency(totalHutang)}</span>
              <span>Dibayar: {formatCurrency(totalPembayaranHutang)}</span>
            </div>
          </div>

          {/* Piutang Card */}
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-500/20 rounded-lg">
                <Coins size={16} className="text-green-500" />
              </div>
              <div>
                <div className="text-xs text-gray-400">Piutang</div>
                <div className="text-[10px] text-gray-500">
                  {data.piutang.length} aktif
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-green-500 mb-1">
              {formatCurrency(sisaPiutang)}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Total: {formatCurrency(totalPiutang)}</span>
              <span>Diterima: {formatCurrency(totalPembayaranPiutang)}</span>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Pemasukan & Pengeluaran */}
        <div className="space-y-4">
          {/* Pemasukan Card */}
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-gray-400">Pemasukan</div>
                <div className="text-[10px] text-gray-500">
                  {data.pemasukan.length} transaksi
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-emerald-500 mb-1">
              {formatCurrency(totalPemasukan)}
            </div>
            <div className="text-[10px] text-gray-500">
              Rata²:{" "}
              {data.pemasukan.length
                ? formatCurrency(totalPemasukan / data.pemasukan.length)
                : "Rp 0"}
            </div>
          </div>

          {/* Pengeluaran Card */}
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-500/20 rounded-lg">
                <TrendingDown size={16} className="text-orange-500" />
              </div>
              <div>
                <div className="text-xs text-gray-400">Pengeluaran</div>
                <div className="text-[10px] text-gray-500">
                  {data.pengeluaran.length} transaksi
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-orange-500 mb-1">
              {formatCurrency(totalPengeluaran)}
            </div>
            <div className="text-[10px] text-gray-500">
              Rata²:{" "}
              {data.pengeluaran.length
                ? formatCurrency(totalPengeluaran / data.pengeluaran.length)
                : "Rp 0"}
            </div>
          </div>
        </div>
      </div>

      {/* Baris dua kolom untuk Ringkasan Cepat dan Grafik */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ringkasan Cepat */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
            Ringkasan Cepat
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
              <span className="text-white font-medium">
                {formatCurrency(totalPemasukan + sisaPiutang)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-700 text-xs">
              <span className="text-gray-400">Total Kewajiban</span>
              <span className="text-white font-medium">
                {formatCurrency(totalPengeluaran + sisaHutang)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 text-xs">
              <span className="text-gray-400">Rasio Keuangan</span>
              <span className="text-white font-medium">
                {(
                  (totalPemasukan + sisaPiutang) /
                  (totalPengeluaran + sisaHutang || 1)
                ).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Grafik Tren Transaksi per Bulan */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
            Tren Transaksi per Bulan
          </h3>
          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="bulan"
                    stroke="#9ca3af"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", color: "#9ca3af" }}
                  />
                  <Bar dataKey="pemasukan" fill="#10b981" name="Pemasukan" />
                  <Bar
                    dataKey="pengeluaran"
                    fill="#f97316"
                    name="Pengeluaran"
                  />
                  <Bar dataKey="hutang" fill="#ef4444" name="Hutang" />
                  <Bar dataKey="piutang" fill="#3b82f6" name="Piutang" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">
              Belum ada data transaksi per bulan
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
