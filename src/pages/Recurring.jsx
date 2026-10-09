import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, X, RepeatIcon, TrendingUp, TrendingDown,
  Play, Pause, Calendar, RefreshCw
} from "lucide-react";
import RecurringTransactionService from "../services/RecurringTransactionService";
import NumericInput from "../components/NumericInput";
import ConfirmModal from "../components/ConfirmModal";
import CategoryPicker from "../components/CategoryPicker";
import { useToast } from "../context/ToastContext";
import { formatCurrency } from "../utils/format";
import { todayStr } from "../utils/dateUtils";
import { getCategoryByType } from "../utils/categories";

const FREQUENCY_OPTIONS = [
  { value: 'daily',   label: 'Setiap Hari' },
  { value: 'weekly',  label: 'Setiap Minggu' },
  { value: 'monthly', label: 'Setiap Bulan' },
  { value: 'yearly',  label: 'Setiap Tahun' },
];

const INITIAL_FORM = {
  name: '',
  amount: '',
  kategori: '',
  type: 'expense',
  frequency: 'monthly',
  startDate: todayStr(),
  catatan: '',
};

export default function Recurring() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null });
  const { showToast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setItems(RecurringTransactionService.getAll());
  };

  const openAdd = () => {
    setEditId(null);
    setFormData({ ...INITIAL_FORM, startDate: todayStr() });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setFormData({
      name: item.name,
      amount: String(item.amount),
      kategori: item.kategori || '',
      type: item.type,
      frequency: item.frequency || 'monthly',
      startDate: item.startDate || todayStr(),
      catatan: item.catatan || '',
    });
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { showToast('Nama harus diisi', 'error'); return; }
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) { showToast('Jumlah harus lebih dari 0', 'error'); return; }
    if (!formData.kategori) { showToast('Pilih kategori', 'error'); return; }

    const payload = {
      name: formData.name.trim(),
      amount,
      kategori: formData.kategori,
      type: formData.type,
      frequency: formData.frequency,
      startDate: formData.startDate,
      catatan: formData.catatan,
    };

    if (editId) {
      const nextDue = RecurringTransactionService.calculateNextDueDate(
        formData.startDate, formData.frequency
      );
      RecurringTransactionService.updateRecurring(editId, { ...payload, nextDueDate: nextDue });
    } else {
      RecurringTransactionService.createRecurring(payload);
    }

    setShowModal(false);
    loadData();
    showToast(editId ? 'Diperbarui' : 'Transaksi rutin ditambahkan', 'success');
  };

  const handleToggleActive = (item) => {
    if (item.isActive) {
      RecurringTransactionService.deactivateRecurring(item.id);
    } else {
      RecurringTransactionService.activateRecurring(item.id);
    }
    loadData();
  };

  const handleDelete = (item) => {
    setConfirmModal({
      visible: true,
      title: 'Hapus Transaksi Rutin',
      message: `Hapus "${item.name}"? Transaksi yang sudah dibuat tidak ikut terhapus.`,
      onConfirm: () => {
        RecurringTransactionService.deleteRecurring(item.id);
        loadData();
        setConfirmModal((p) => ({ ...p, visible: false }));
        showToast('Dihapus', 'success');
      },
    });
  };

  const handleRunNow = (item) => {
    try {
      RecurringTransactionService.executeRecurring(item);
      loadData();
      showToast(`"${item.name}" berhasil dieksekusi`, 'success');
    } catch (err) {
      showToast('Gagal mengeksekusi', 'error');
    }
  };

  const getTypeColor = (type) => type === 'income'
    ? 'border-l-emerald-500 text-emerald-400'
    : 'border-l-orange-500 text-orange-400';

  const formatNextDue = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const today = new Date();
    const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
    const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    if (diff < 0) return <span className="text-red-400">{label} (terlambat)</span>;
    if (diff === 0) return <span className="text-yellow-400">Hari ini</span>;
    if (diff <= 7) return <span className="text-yellow-300">{label} ({diff} hari lagi)</span>;
    return <span className="text-slate-400">{label}</span>;
  };

  const activeItems = items.filter((i) => i.isActive);
  const pausedItems = items.filter((i) => !i.isActive);

  return (
    <div className="pb-24 space-y-4">
      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-40 transition-all hover:scale-110 active:scale-95"
        title="Tambah Transaksi Rutin"
      >
        <Plus size={28} />
      </button>

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 shadow-xl text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-blue-200 mb-1">Transaksi Rutin</div>
            <div className="text-2xl font-bold">{activeItems.length} Aktif</div>
          </div>
          <div className="bg-white/20 p-2.5 rounded-xl"><RepeatIcon size={22} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/20">
          <div>
            <div className="text-xs text-blue-200">Pemasukan Rutin</div>
            <div className="text-sm font-semibold mt-0.5">
              {formatCurrency(activeItems.filter(i => i.type === 'income').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}
              <span className="text-xs text-blue-200 ml-1">/bulan</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-200">Pengeluaran Rutin</div>
            <div className="text-sm font-semibold mt-0.5">
              {formatCurrency(activeItems.filter(i => i.type === 'expense').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}
              <span className="text-xs text-blue-200 ml-1">/bulan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active list */}
      {activeItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Aktif</p>
          {activeItems.map((item) => {
            const cat = getCategoryByType(item.type === 'income' ? 'income' : 'expense', item.kategori);
            return (
              <div
                key={item.id}
                className={`bg-[#0c1220] border border-[#1e2d45] border-l-4 rounded-xl p-4 ${getTypeColor(item.type)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{cat.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.type === 'income'
                          ? <TrendingUp size={12} className="text-emerald-400 shrink-0" />
                          : <TrendingDown size={12} className="text-orange-400 shrink-0" />}
                        <span className="text-sm font-bold text-white truncate">{item.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{RecurringTransactionService.frequencyLabel(item.frequency)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatNextDue(item.nextDueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${item.type === 'income' ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {formatCurrency(item.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar">
                  {[
                    { icon: RefreshCw, label: 'Jalankan', color: 'blue', onClick: () => handleRunNow(item) },
                    { icon: Pencil,    label: 'Edit',      color: 'blue', onClick: () => openEdit(item) },
                    { icon: Pause,     label: 'Jeda',      color: 'yellow', onClick: () => handleToggleActive(item) },
                    { icon: Trash2,    label: 'Hapus',     color: 'red', onClick: () => handleDelete(item) },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      onClick={btn.onClick}
                      className={`btn-action-compact btn-action-${btn.color} shrink-0`}
                    >
                      <btn.icon size={12} />
                      <span>{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paused list */}
      {pausedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Dijeda</p>
          {pausedItems.map((item) => {
            const cat = getCategoryByType(item.type === 'income' ? 'income' : 'expense', item.kategori);
            return (
              <div
                key={item.id}
                className="bg-[#0c1220] border border-[#1e2d45] border-l-4 border-l-slate-600 rounded-xl p-4 opacity-60"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0 grayscale">{cat.emoji}</span>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-slate-400 truncate block">{item.name}</span>
                      <span className="text-xs text-slate-600">{RecurringTransactionService.frequencyLabel(item.frequency)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleToggleActive(item)} className="btn-action-compact btn-action-emerald shrink-0">
                      <Play size={12} /><span>Aktifkan</span>
                    </button>
                    <button onClick={() => handleDelete(item)} className="btn-action-compact btn-action-red shrink-0">
                      <Trash2 size={12} /><span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-14 text-slate-500 text-sm bg-[#0e1523] border border-[#1e2d45] rounded-xl">
          Belum ada transaksi rutin — tekan + untuk menambahkan
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-3" onClick={() => setShowModal(false)}>
          <div className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center z-10">
              <h2 className="text-base font-bold text-white">{editId ? 'Edit' : 'Tambah'} Transaksi Rutin</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4 pb-8">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-black/30 rounded-xl">
                {[['expense', '📤 Pengeluaran'], ['income', '📥 Pemasukan']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: val, kategori: '' })}
                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                      formData.type === val ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Name */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Nama *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  placeholder="Contoh: Gaji Bulanan"
                  required
                />
              </div>

              {/* Category */}
              <CategoryPicker
                value={formData.kategori}
                onChange={(id) => setFormData({ ...formData, kategori: id })}
                type={formData.type === 'income' ? 'income' : 'expense'}
              />

              {/* Amount */}
              <NumericInput
                label="Jumlah *"
                value={formData.amount}
                onChange={(val) => setFormData({ ...formData, amount: val })}
                required
              />

              {/* Frequency */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Frekuensi</label>
                <div className="grid grid-cols-2 gap-2">
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, frequency: opt.value })}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors border ${
                        formData.frequency === opt.value
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Tanggal Mulai</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Catatan</label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  rows="2"
                  placeholder="Opsional"
                />
              </div>

              <button type="submit" className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
                {editId ? 'Perbarui' : 'Tambahkan'}
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
