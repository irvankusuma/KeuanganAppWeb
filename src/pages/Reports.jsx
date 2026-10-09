import { useState, useMemo } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronUp
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { getMonthlySummary, getTrendData, formatPieData } from "../services/AnalyticsService";
import { getCategoryByType } from "../utils/categories";
import { formatCurrency } from "../utils/format";
import { monthStr } from "../utils/dateUtils";

/** Build list of last 12 months as "YYYY-MM" strings (newest first). */
function getLast12Months() {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function formatMonthLabel(m, short = false) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('id-ID', {
    month: short ? 'short' : 'long', year: 'numeric'
  });
}

/** Custom tooltip for recharts */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

/** Custom PieChart tooltip */
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, emoji } = payload[0].payload;
  return (
    <div className="bg-[#0e1523] border border-[#1e2d45] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-bold">{emoji} {name}</p>
      <p className="text-slate-300">{formatCurrency(value)}</p>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, colorClass, subLabel }) {
  return (
    <div className={`bg-[#0c1220] border border-[#1e2d45] rounded-xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <Icon size={16} className={colorClass} />
      </div>
      <div className={`text-lg font-bold tracking-tight ${colorClass}`}>
        {formatCurrency(value)}
      </div>
      {subLabel && <div className="text-[10px] text-slate-600">{subLabel}</div>}
    </div>
  );
}

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(monthStr());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const months = getLast12Months();

  const summary = useMemo(() => getMonthlySummary(selectedMonth), [selectedMonth]);
  const trendData = useMemo(() => getTrendData(6), []);
  const pieData = useMemo(() => formatPieData(summary.expenseByCategory), [summary]);

  const trendChartData = trendData.map((t) => ({
    label: formatMonthLabel(t.month, true),
    Pemasukan: t.income,
    Pengeluaran: t.expense,
    Sisa: Math.max(t.net, 0),
  }));

  return (
    <div className="pb-24 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-5 shadow-xl text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-cyan-200 mb-1">Laporan Keuangan</div>
            <div className="text-xl font-bold">{formatMonthLabel(selectedMonth)}</div>
          </div>
          <div className="bg-white/20 p-2.5 rounded-xl"><BarChart3 size={22} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/20">
          <div>
            <div className="text-[10px] text-cyan-200">Pemasukan</div>
            <div className="text-sm font-bold mt-0.5 text-emerald-200">{formatCurrency(summary.income)}</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-200">Pengeluaran</div>
            <div className="text-sm font-bold mt-0.5 text-orange-200">{formatCurrency(summary.expense)}</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-200">Sisa</div>
            <div className={`text-sm font-bold mt-0.5 ${summary.net >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              {formatCurrency(summary.net)}
            </div>
          </div>
        </div>
      </div>

      {/* Month Picker */}
      <div className="relative">
        <button
          onClick={() => setShowMonthPicker(!showMonthPicker)}
          className="w-full flex items-center justify-between bg-[#0e1523] border border-[#1e2d45] rounded-xl px-4 py-3 text-sm font-medium text-white"
        >
          <span>{formatMonthLabel(selectedMonth)}</span>
          {showMonthPicker ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        {showMonthPicker && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0e1523] border border-[#1e2d45] rounded-xl shadow-2xl z-20 overflow-hidden">
            <div className="max-h-52 overflow-y-auto">
              {months.map((m) => (
                <button
                  key={m}
                  onClick={() => { setSelectedMonth(m); setShowMonthPicker(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    m === selectedMonth
                      ? 'bg-cyan-600/20 text-cyan-300 font-semibold'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {formatMonthLabel(m)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard title="Masuk"  value={summary.income}  icon={TrendingUp}   colorClass="text-emerald-400" />
        <SummaryCard title="Keluar" value={summary.expense} icon={TrendingDown} colorClass="text-orange-400" />
        <SummaryCard
          title="Net"
          value={summary.net}
          icon={Wallet}
          colorClass={summary.net >= 0 ? 'text-blue-400' : 'text-red-400'}
        />
      </div>

      {/* Expense Pie Chart */}
      {pieData.length > 0 ? (
        <div className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-4">Pengeluaran per Kategori</h3>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="w-full md:w-48 space-y-1.5 shrink-0">
              {pieData.map((entry) => {
                const pct = summary.expense > 0 ? ((entry.value / summary.expense) * 100).toFixed(1) : 0;
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs text-slate-400 truncate">{entry.emoji} {entry.name}</span>
                    </div>
                    <span className="text-xs font-bold text-white shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl p-8 text-center text-slate-500 text-sm">
          Tidak ada data pengeluaran di bulan ini
        </div>
      )}

      {/* Top 5 Expenses */}
      {summary.topExpenses.length > 0 && (
        <div className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e2d45] flex items-center gap-2">
            <TrendingDown size={16} className="text-orange-400" />
            <h3 className="text-sm font-bold text-white">Top 5 Pengeluaran</h3>
          </div>
          <div className="divide-y divide-[#1e2d45]">
            {summary.topExpenses.map((exp, i) => {
              const cat = getCategoryByType('expense', exp.kategori);
              return (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-[10px] font-bold text-slate-400 flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-lg shrink-0">{cat.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{exp.nama}</p>
                      <p className="text-[10px] text-slate-500">{cat.name} • {exp.tanggal}</p>
                    </div>
                  </div>
                  <span className="font-bold text-orange-400 text-sm shrink-0">
                    {formatCurrency(exp.jumlah)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6-Month Trend Bar Chart */}
      <div className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white mb-4">Tren 6 Bulan Terakhir</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={trendChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : `${(v/1e3).toFixed(0)}rb`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            <Bar dataKey="Pemasukan"   fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Pengeluaran" fill="#F97316" radius={[3, 3, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
