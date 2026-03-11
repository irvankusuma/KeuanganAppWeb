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
@@ -266,50 +270,59 @@ export default function Dashboard() {
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
