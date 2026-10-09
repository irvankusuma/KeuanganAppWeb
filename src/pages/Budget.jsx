import { useState, useEffect, useMemo } from "react";
import {
  PiggyBank, Plus, Pencil, Trash2, X, AlertTriangle, CheckCircle, TrendingUp, ChevronDown, ChevronUp
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import NumericInput from "../components/NumericInput";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import { EXPENSE_CATEGORIES, getCategoryByType } from "../utils/categories";
import { formatCurrency } from "../utils/format";
import { monthStr } from "../utils/dateUtils";

/**
 * Compute spent amount for a given category in a given month.
 */
function calcSpent(categoryId, month) {
  const pengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
  return pengeluaran
    .filter((item) => item.kategori === categoryId && item.tanggal?.startsWith(month))
    .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
}

/**
 * Build the last 12 months list (newest first) as "YYYY-MM" strings.
 */
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

function formatMonthLabel(m) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(monthStr());
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ categoryId: '', limit: '' });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null });
  const { showToast } = useToast();
  const months = getLast12Months();

  useEffect(() => { loadBudgets(); }, []);

  const loadBudgets = () => {
    setBudgets(LocalStorageService.readSheet(SHEETS.BUDGETS));
  };

  // Enrich categories with budget + spent data for the selected month
  const categoryData = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => {
      const budget = budgets.find(
        (b) => b.categoryId === cat.id && b.month === selectedMonth
      );
      const spent = calcSpent(cat.id, selectedMonth);
      const limit = budget?.limit ? parseFloat(budget.limit) : null;
      const percentage = limit ? Math.min((spent / limit) * 100, 999) : 0;
      return {
        ...cat,
        budgetId: budget?.id || null,
        spent,
        limit,
        percentage,
        isOverBudget: limit ? spent > limit : false,
        isWarning: limit ? spent > limit * 0.8 && spent <= limit : false,
      };
    });
  }, [budgets, selectedMonth]);

  const totalBudgeted = useMemo(() =>
    categoryData.reduce((s, c) => s + (c.limit || 0), 0), [categoryData]);

  const totalSpent = useMemo(() =>
    categoryData.reduce((s, c) => s + c.spent, 0), [categoryData]);

  const openAdd = (cat) => {
    setEditId(null);
    setFormData({ categoryId: cat.id, limit: '' });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditId(cat.budgetId);
    setFormData({ categoryId: cat.id, limit: String(cat.limit) });
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const limit = parseFloat(formData.limit);
    if (!limit || limit <= 0) { showToast('Limit harus lebih dari 0', 'error'); return; }

    if (editId) {
      LocalStorageService.updateRow(SHEETS.BUDGETS, editId, { limit });
    } else {
      LocalStorageService.appendRow(SHEETS.BUDGETS, {
        categoryId: formData.categoryId,
        month: selectedMonth,
        limit,
        type: 'expense',
      });
    }
    setShowModal(false);
    loadBudgets();
    showToast(editId ? 'Budget diperbarui' : 'Budget ditambahkan', 'success');
  };

  const handleDelete = (cat) => {
    setConfirmModal({
      visible: true,
      title: 'Hapus Budget',
      message: `Hapus budget untuk "${cat.name}"?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.BUDGETS, cat.budgetId);
        loadBudgets();
        setConfirmModal((p) => ({ ...p, visible: false }));
        showToast('Budget dihapus', 'success');
      },
    });
  };

  const getBarColor = (cat) => {
    if (cat.isOverBudget) return 'bg-red-500';
    if (cat.isWarning) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getStatusIcon = (cat) => {
    if (!cat.limit) return null;
    if (cat.isOverBudget) return <AlertTriangle size={14} className="text-red-400 shrink-0" />;
    if (cat.isWarning)    return <AlertTriangle size={14} className="text-yellow-400 shrink-0" />;
    return <CheckCircle size={14} className="text-emerald-400 shrink-0" />;
  };

  return (
    <div className="pb-24 space-y-4">
      {/* Header summary card */}
      <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 shadow-xl shadow-purple-900/20 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-purple-200 mb-1">Budget Bulan Ini</div>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(totalBudgeted)}</div>
          </div>
          <div className="bg-white/20 p-2.5 rounded-xl">
            <PiggyBank size={22} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/20">
          <div>
            <div className="text-xs text-purple-200">Terpakai</div>
            <div className={`text-sm font-semibold mt-0.5 ${totalSpent > totalBudgeted && totalBudgeted > 0 ? 'text-red-200' : ''}`}>
              {formatCurrency(totalSpent)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-purple-200">Sisa Budget</div>
            <div className={`text-sm font-semibold mt-0.5 ${totalBudgeted - totalSpent < 0 ? 'text-red-200' : 'text-green-200'}`}>
              {formatCurrency(Math.max(totalBudgeted - totalSpent, 0))}
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
                      ? 'bg-violet-600/20 text-violet-300 font-semibold'
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

      {/* Category list */}
      <div className="space-y-3">
        {categoryData.map((cat) => (
          <div
            key={cat.id}
            className="bg-[#0c1220] border border-[#1e2d45] rounded-xl p-4 transition-all hover:border-slate-600"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{cat.emoji}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white">{cat.name}</span>
                    {getStatusIcon(cat)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Terpakai: <span className="text-slate-300 font-medium">{formatCurrency(cat.spent)}</span>
                    {cat.limit && (
                      <> / <span className="text-slate-400">{formatCurrency(cat.limit)}</span></>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {cat.budgetId ? (
                  <>
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Edit budget"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Hapus budget"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => openAdd(cat)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 text-xs font-semibold transition-colors"
                  >
                    <Plus size={12} /> Set Budget
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {cat.limit ? (
              <div className="space-y-1">
                <div className="h-2 bg-[#1e2d45] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(cat)}`}
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-semibold ${
                    cat.isOverBudget ? 'text-red-400' : cat.isWarning ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>
                    {cat.percentage.toFixed(0)}%
                    {cat.isOverBudget && ' — Melebihi budget!'}
                    {cat.isWarning && ' — Hampir habis'}
                  </span>
                  {cat.isOverBudget && (
                    <span className="text-[10px] text-red-400 font-semibold">
                      Lebih {formatCurrency(cat.spent - cat.limit)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-2 bg-[#1e2d45] rounded-full" />
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-3" onClick={() => setShowModal(false)}>
          <div className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-base font-bold text-white">
                {editId ? 'Edit Budget' : 'Set Budget'} — {getCategoryByType('expense', formData.categoryId)?.name}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-700">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4 pb-8">
              <div>
                <p className="text-xs text-slate-400 mb-1">Bulan: <strong className="text-slate-200">{formatMonthLabel(selectedMonth)}</strong></p>
              </div>
              <NumericInput
                label="Limit Budget (Rp)"
                value={formData.limit}
                onChange={(val) => setFormData({ ...formData, limit: val })}
                required
              />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
                {editId ? 'Perbarui Budget' : 'Simpan Budget'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p) => ({ ...p, visible: false }))}
      />
    </div>
  );
}
