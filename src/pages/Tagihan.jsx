import { useEffect, useMemo, useState, useRef } from "react";
import {
  Plus, Pencil, Trash2, X, Receipt,
  Pin, Filter, Search, Calendar, Check
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import { todayStr, monthStr } from "../utils/dateUtils";
import NumericInput from "../components/NumericInput";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import CardActionMenu from "../components/CardActionMenu";
import ShareDialog from "../components/ShareDialog";
import { formatCurrency as fmtC } from "../utils/format";
import { makeTogglePin, pinnedFirst } from "../utils/pinUtils";

const KATEGORI = ["Listrik", "Air", "Pulsa/Data", "Wifi/Internet", "Langganan", "Lainnya"];

const emptyForm = {
  nama: "",
  nominal: "",
  kategori: "Listrik",
  catatan: ""
};

const emptyHistForm = {
  id: "",
  bulan: monthStr(),
  jumlah: "",
  catatan: ""
};

const nextMonth = (ym) => {
  if (!ym) return monthStr();
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const fmtBulan = (ym) => {
  if (!ym) return "-";
  const [y, m] = ym.split("-");
  return new Date(y, m - 1).toLocaleDateString("id-ID", { month: "short", year: "numeric" });
};

export default function Tagihan() {
  const [tagihan, setTagihan]   = useState([]);
  const [riwayat, setRiwayat]   = useState([]);
  
  // Category Modal
  const [modal, setModal]       = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(emptyForm);

  // History Modal
  const [histModal, setHistModal]       = useState(false);
  const [histEditMode, setHistEditMode] = useState(false);
  const [activeTagihan, setActiveTagihan] = useState(null);
  const [histForm, setHistForm]         = useState(emptyHistForm);

  // Search & Filter
  const [search, setSearch]             = useState("");
  const [showFilter, setShowFilter]     = useState(false);
  const [filterKat, setFilterKat]       = useState("all");

  const [confirm, setConfirm]           = useState({ visible: false, title: "", message: "", onConfirm: null });
  const [shareData, setShareData]       = useState({ isOpen: false, cardRef: null, title: "", caption: "" });

  const cardRefs = useRef({});
  const { showToast } = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    setTagihan(LocalStorageService.readSheet(SHEETS.TAGIHAN));
    setRiwayat(LocalStorageService.readSheet(SHEETS.PEMBAYARAN_TAGIHAN));
  };

  const resetForm = () => {
    setModal(false);
    setEditMode(false);
    setEditId(null);
    setForm(emptyForm);
  };

  // ─── Sync helpers to Pengeluaran ────────────────────────────
  const syncHistoryToPengeluaran = (histItem, tagihanName) => {
    const pengeluarans = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
    const existing = pengeluarans.find(p => p.sourceRef === histItem.id.toString() && p.sourceType === "tagihan_bayar");
    
    const payload = {
      nama: `Tagihan: ${tagihanName}`,
      kategori: "Tagihan",
      jumlah: parseFloat(histItem.jumlah) || 0,
      tanggal: histItem.tanggal || todayStr(),
      catatan: histItem.catatan || `Pembayaran ${tagihanName} ${fmtBulan(histItem.bulan)}`,
      sourceRef: histItem.id.toString(),
      sourceType: "tagihan_bayar"
    };

    if (existing) {
      LocalStorageService.updateRow(SHEETS.PENGELUARAN, existing.id, payload);
    } else {
      LocalStorageService.appendRow(SHEETS.PENGELUARAN, payload);
    }
  };

  const deleteHistoryPengeluaran = (histId) => {
    const pengeluarans = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
    const existing = pengeluarans.find(p => p.sourceRef === histId.toString() && p.sourceType === "tagihan_bayar");
    if (existing) {
      LocalStorageService.deleteRow(SHEETS.PENGELUARAN, existing.id);
    }
  };

  // ─── Handlers: Parent Tagihan Category ─────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nama.trim()) { showToast("Nama tagihan harus diisi", "error"); return; }

    const payload = {
      nama: form.nama.trim(),
      nominal: parseFloat(form.nominal) || 0,
      kategori: form.kategori,
      catatan: form.catatan.trim()
    };

    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.TAGIHAN, editId, payload);
      // Sync names of all historical records in Pengeluaran
      const parentHistories = riwayat.filter(r => r.tagihanId === editId.toString());
      parentHistories.forEach(h => {
        const updatedH = LocalStorageService.updateRow(SHEETS.PEMBAYARAN_TAGIHAN, h.id, { namaTagihan: form.nama.trim() });
        syncHistoryToPengeluaran(updatedH, form.nama.trim());
      });
      showToast("Tagihan diperbarui", "success");
    } else {
      LocalStorageService.appendRow(SHEETS.TAGIHAN, payload);
      showToast("Kategori tagihan berhasil ditambahkan", "success");
    }
    resetForm();
    load();
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setEditId(item.id);
    setForm({
      nama: item.nama,
      nominal: item.nominal || "",
      kategori: item.kategori || "Listrik",
      catatan: item.catatan || ""
    });
    setModal(true);
  };

  const handleDelete = (item) => {
    setConfirm({
      visible: true,
      title: "Hapus Tagihan",
      message: `Hapus tagihan "${item.nama}" beserta seluruh riwayat pembayarannya? Data terkait di Pengeluaran juga akan terhapus.`,
      onConfirm: () => {
        const parentHistories = riwayat.filter(r => r.tagihanId === item.id.toString());
        parentHistories.forEach(h => {
          deleteHistoryPengeluaran(h.id);
          LocalStorageService.deleteRow(SHEETS.PEMBAYARAN_TAGIHAN, h.id);
        });
        LocalStorageService.deleteRow(SHEETS.TAGIHAN, item.id);
        load();
        showToast("Tagihan berhasil dihapus", "success");
        setConfirm(p => ({ ...p, visible: false }));
      }
    });
  };

  const handlePin = makeTogglePin(SHEETS.TAGIHAN, load, showToast);

  // ─── Handlers: History Pembayaran ──────────────────────────
  const openAddHist = (parentItem) => {
    setActiveTagihan(parentItem);
    setHistEditMode(false);
    
    // Auto-calculate next month payment
    const parentHistories = riwayat.filter(r => r.tagihanId === parentItem.id.toString())
      .sort((a,b) => (b.bulan || "").localeCompare(a.bulan || ""));
    const lastMonth = parentHistories.length > 0 ? parentHistories[0].bulan : monthStr();
    
    setHistForm({
      id: "",
      bulan: parentHistories.length > 0 ? nextMonth(lastMonth) : monthStr(),
      jumlah: parentItem.nominal || "",
      catatan: ""
    });
    setHistModal(true);
  };

  const openEditHist = (parentItem, histItem) => {
    setActiveTagihan(parentItem);
    setHistEditMode(true);
    setHistForm({
      id: histItem.id,
      bulan: histItem.bulan || monthStr(),
      jumlah: histItem.jumlah || "",
      catatan: histItem.catatan || ""
    });
    setHistModal(true);
  };

  const handleHistSubmit = (e) => {
    e.preventDefault();
    if (!histForm.jumlah || !histForm.bulan) { showToast("Bulan dan nominal pembayaran harus diisi", "error"); return; }
    
    const amt = parseFloat(histForm.jumlah) || 0;

    if (histEditMode && histForm.id) {
      const updatedH = LocalStorageService.updateRow(SHEETS.PEMBAYARAN_TAGIHAN, histForm.id, {
        bulan: histForm.bulan,
        jumlah: amt,
        catatan: histForm.catatan.trim()
      });
      syncHistoryToPengeluaran(updatedH, activeTagihan.nama);
      showToast("Riwayat pembayaran diperbarui", "success");
    } else {
      const newH = LocalStorageService.appendRow(SHEETS.PEMBAYARAN_TAGIHAN, {
        tagihanId: activeTagihan.id.toString(),
        namaTagihan: activeTagihan.nama,
        bulan: histForm.bulan,
        jumlah: amt,
        tanggal: todayStr(),
        catatan: histForm.catatan.trim()
      });
      syncHistoryToPengeluaran(newH, activeTagihan.nama);
      showToast("Pembayaran berhasil dicatat", "success");
    }
    setHistModal(false);
    load();
  };

  const handleDeleteHist = (histItem) => {
    setConfirm({
      visible: true,
      title: "Hapus Riwayat Pembayaran",
      message: `Hapus pembayaran bulan ${fmtBulan(histItem.bulan)} sebesar ${fmtC(histItem.jumlah)}? (Akan menghapus pengeluaran terkait)`,
      onConfirm: () => {
        deleteHistoryPengeluaran(histItem.id);
        LocalStorageService.deleteRow(SHEETS.PEMBAYARAN_TAGIHAN, histItem.id);
        load();
        showToast("Riwayat pembayaran dihapus", "success");
        setConfirm(p => ({ ...p, visible: false }));
      }
    });
  };

  const getHistory = (tagihanId) =>
    riwayat.filter(r => r.tagihanId === tagihanId.toString())
      .sort((a, b) => (b.bulan || "").localeCompare(a.bulan || ""));

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return [...tagihan]
      .filter(item => {
        if (kw && !item.nama.toLowerCase().includes(kw) && !(item.catatan || "").toLowerCase().includes(kw) && !(item.kategori || "").toLowerCase().includes(kw)) return false;
        if (filterKat !== "all" && item.kategori !== filterKat) return false;
        return true;
      })
      .sort((a, b) => {
        return pinnedFirst(a, b) || a.nama.localeCompare(b.nama);
      });
  }, [tagihan, search, filterKat]);

  const stats = useMemo(() => {
    const thisMonth = monthStr();
    const paidThisMonth = riwayat
      .filter(r => r.bulan === thisMonth)
      .reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0);
    const totalAllTime = riwayat.reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0);
    return {
      totalCount: tagihan.length,
      totalAllTime,
      paidThisMonth
    };
  }, [tagihan, riwayat]);

  // ─── Render Card ──────────────────────────────────────────
  const renderCard = (item) => {
    const hist = getHistory(item.id);
    const histLines = hist.map(h => `${fmtBulan(h.bulan)} - ${fmtC(h.jumlah)}`).join("\n");
    const caption = `${item.nama} [${item.kategori}]
Estimasi: ${item.nominal > 0 ? fmtC(item.nominal) : "-"}
Total Dibayar: ${fmtC(hist.reduce((s, h) => s + (parseFloat(h.jumlah) || 0), 0))}

${item.catatan ? `Catatan:\n${item.catatan}\n` : ""}
${hist.length > 0 ? `Riwayat Pembayaran:\n${histLines}` : ""}`.trim();

    const totalTerbayar = hist.reduce((s, h) => s + (parseFloat(h.jumlah) || 0), 0);
    const lastPayment = hist.length > 0 ? hist[0] : null;

    return (
      <div
        key={item.id}
        ref={el => cardRefs.current[item.id] = el}
        className="bg-[#0c1220] rounded-2xl p-3 border border-[#1e2d45] border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-start gap-1.5 mb-2 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-xs font-bold text-white truncate">{item.nama}</h3>
              {item.isPinned && <Pin size={9} className="text-blue-400 fill-current shrink-0 animate-pulse" />}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] bg-slate-800 border border-slate-700/50 px-1.5 py-0.5 rounded text-slate-400 font-extrabold uppercase tracking-wider">{item.kategori}</span>
              {item.catatan && <span className="text-[9px] text-slate-500 truncate max-w-[120px] italic">{item.catatan}</span>}
            </div>
          </div>
          <div className="shrink-0">
            <CardActionMenu
              item={item}
              onTogglePin={handlePin}
              onShare={(ref, t, cap) => setShareData({ isOpen: true, cardRef: ref, title: t, caption: cap })}
              cardRef={{ get current() { return cardRefs.current[item.id]; } }}
              title={`Tagihan: ${item.nama}`}
              caption={caption}
              dataString={`${item.nama} - Estimasi ${fmtC(item.nominal)}`}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 py-1.5 border-t border-b border-[#1e2d45]/40 mb-2 shrink-0 text-left">
          <div className="min-w-0">
            <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider mb-0.5">Total Dibayar</div>
            <div className="text-xs font-extrabold text-emerald-400 truncate tabular-nums">{fmtC(totalTerbayar)}</div>
          </div>
          <div className="min-w-0 border-l border-[#1e2d45]/30 pl-2">
            <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider mb-0.5">Terakhir</div>
            {lastPayment ? (
              <div className="truncate">
                <span className="text-[10px] font-bold text-slate-300 tabular-nums">{fmtC(lastPayment.jumlah)}</span>
                <span className="text-[8px] text-slate-500 block leading-none">{fmtBulan(lastPayment.bulan)}</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-600 italic">-</span>
            )}
          </div>
          <div className="min-w-0 border-l border-[#1e2d45]/30 pl-2">
            <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider mb-0.5">Estimasi</div>
            <div className="text-[10px] font-bold text-slate-400 truncate tabular-nums">{item.nominal > 0 ? fmtC(item.nominal) : "-"}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 no-export mb-2 shrink-0">
          <button onClick={() => openAddHist(item)} className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 text-[9px] font-bold transition-all active:scale-95">
            <Plus size={10} /><span>Catat Bayar</span>
          </button>
          <button onClick={() => handleEdit(item)} className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50 text-[9px] font-bold transition-all active:scale-95" title="Edit Tagihan">
            <Pencil size={10} />
          </button>
          <button onClick={() => handleDelete(item)} className="py-1 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 text-[9px] font-bold transition-all active:scale-95" title="Hapus Tagihan">
            <Trash2 size={10} />
          </button>
        </div>

        {/* History — selalu tampil inline */}
        <div className="bg-[#0a0f1a] rounded-xl border border-[#1e2d45]/60 overflow-hidden flex-1 flex flex-col min-h-[100px]">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#1e2d45]/40 shrink-0 bg-slate-900/50">
            <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wider">Riwayat Pembayaran</span>
            <span className="text-[8px] text-slate-600 italic font-semibold">{hist.length} entri</span>
          </div>
          {hist.length > 0 ? (
            <div className="divide-y divide-[#1e2d45]/20 max-h-[140px] overflow-y-auto custom-scrollbar flex-1">
              {hist.map((h) => (
                <div key={h.id} className="flex justify-between items-center px-2.5 py-1.5 hover:bg-white/[0.01] transition-all group">
                  <div className="min-w-0 flex-1 pr-1.5">
                    <div className="text-[10px] text-slate-300 font-medium truncate flex items-center gap-1">
                      <Calendar size={8} className="text-slate-600 shrink-0" />
                      <span>{fmtBulan(h.bulan)}</span>
                    </div>
                    {h.catatan && (
                      <div className="text-[8px] text-slate-600 truncate max-w-[150px] mt-0.5 leading-none italic">{h.catatan}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-bold text-emerald-400 text-[10px] tabular-nums">{fmtC(h.jumlah)}</span>
                    <div className="flex items-center gap-1 no-export opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditHist(item, h)}
                        className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-blue-400 rounded transition-colors"
                        title="Edit Riwayat"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteHist(h)}
                        className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded transition-colors"
                        title="Hapus Riwayat"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center flex-1">
              <p className="text-[9px] text-slate-600 italic">Belum ada riwayat.</p>
              <button
                onClick={() => openAddHist(item)}
                className="mt-1 text-[9px] text-blue-400 hover:underline font-semibold"
              >
                Catat Pembayaran
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 pb-24 md:pb-6">
      {/* FAB */}
      <button onClick={() => setModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-40 transition-all hover:scale-110 active:scale-95"
        title="Tambah Layanan Tagihan">
        <Plus size={24} />
      </button>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 gap-2 text-left">
        <div className="bg-[#0c1220] border border-[#1e2d45] rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider mb-0.5">Total Pembayaran (Semua)</div>
          <div className="text-lg font-extrabold text-blue-400 tracking-tight tabular-nums">{fmtC(stats.totalAllTime)}</div>
          <div className="text-[9px] text-slate-500 mt-0.5">{stats.totalCount} kategori tagihan dipantau</div>
        </div>
        <div className="bg-[#0c1220] border border-[#1e2d45] rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider mb-0.5">Terbayar Bulan Ini</div>
          <div className="text-lg font-extrabold text-emerald-400 tracking-tight tabular-nums">{fmtC(stats.paidThisMonth)}</div>
          <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
            <Check size={8} className="text-emerald-400" />
            Auto sync ke Pengeluaran
          </div>
        </div>
      </div>

      {/* Compact Search & Filter */}
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama layanan, kategori..." 
            className="w-full bg-[#0c1220] border border-[#1e2d45] rounded-xl pl-8 pr-3 py-2 text-[11px] text-white placeholder-slate-600 focus:border-blue-500 outline-none transition-colors" />
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`px-3 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all ${
            showFilter || filterKat !== "all"
              ? "bg-blue-600/10 text-blue-400 border-blue-500/30"
              : "bg-[#0c1220] text-slate-400 border-[#1e2d45] hover:text-slate-200"
          }`}
        >
          <Filter size={12} />
          <span>Filter</span>
        </button>
      </div>

      {/* Compact Filter Panel */}
      {showFilter && (
        <div className="bg-[#0c1220] border border-[#1e2d45] rounded-xl p-3 space-y-2 text-left animate-in fade-in duration-200">
          <div>
            <div className="text-[8px] text-slate-500 uppercase font-extrabold mb-1">Kategori</div>
            <div className="flex flex-wrap gap-1">
              {["all", ...KATEGORI].map(c => (
                <button key={c} onClick={() => setFilterKat(c)}
                  className={`px-2 py-0.5 text-[9px] rounded-md font-bold transition-all ${filterKat === c ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                  {c === "all" ? "Semua" : c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.length > 0 ? filtered.map(item => renderCard(item)) : (
          <div className="text-center py-10 bg-[#0c1220]/30 border border-dashed border-[#1e2d45] rounded-xl col-span-full">
            <Receipt size={20} className="mx-auto text-slate-600 mb-1" />
            <p className="text-slate-400 text-xs font-semibold">Belum ada layanan tagihan.</p>
            <p className="text-slate-500 text-[10px] mt-0.5">Buat kategori tagihan baru dengan tombol + di kanan bawah.</p>
          </div>
        )}
      </div>

      {/* Modal: Tambah/Edit Parent */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" onClick={resetForm}>
          <div className="bg-[#0c1220] border border-[#1e2d45] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 text-left" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#1e2d45] flex justify-between items-center shrink-0">
              <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">{editMode ? "Edit Kategori Tagihan" : "Tambah Kategori Tagihan"}</h2>
              <button onClick={resetForm} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><X size={14} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase block mb-1">Nama Layanan <span className="text-red-500">*</span></label>
                <input type="text" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} required
                  placeholder="Contoh: Listrik PLN, Tagihan Wifi, Air PDAM"
                  className="w-full bg-slate-900 border border-[#1e2d45] rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
              </div>
              <NumericInput label="Estimasi / Rata-rata Nominal (Opsional)" value={form.nominal} onChange={v => setForm({ ...form, nominal: v ? Number(v) : "" })} />
              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase block mb-1">Kategori</label>
                <div className="flex flex-wrap gap-1">
                  {KATEGORI.map(k => (
                    <button key={k} type="button" onClick={() => setForm({ ...form, kategori: k })}
                      className={`px-2.5 py-1 text-[10px] rounded-lg font-bold border transition-all ${form.kategori === k ? "bg-blue-600 text-white border-blue-500 shadow-md" : "bg-slate-800 text-slate-400 border-slate-700/50 hover:border-slate-600"}`}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase block mb-1">Catatan / No. Pelanggan (opsional)</label>
                <input type="text" value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })}
                  placeholder="Contoh: No. Meteran, ID Pelanggan"
                  className="w-full bg-slate-900 border border-[#1e2d45] rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition-all active:scale-[0.98] mt-2">
                {editMode ? "Simpan Perubahan" : "Buat Kategori Tagihan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah/Edit Histori Pembayaran */}
      {histModal && activeTagihan && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" onClick={() => setHistModal(false)}>
          <div className="bg-[#0c1220] border border-[#1e2d45] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 text-left" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#1e2d45] flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">{histEditMode ? "Edit Riwayat Pembayaran" : "Catat Pembayaran Tagihan"}</h2>
                <p className="text-[9px] text-slate-400 leading-none mt-0.5">Tagihan: {activeTagihan.nama}</p>
              </div>
              <button onClick={() => setHistModal(false)} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><X size={14} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleHistSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase block mb-1">Bulan Pembayaran <span className="text-red-500">*</span></label>
                <input type="month" value={histForm.bulan} onChange={e => setHistForm({ ...histForm, bulan: e.target.value })} required
                  className="w-full bg-slate-900 border border-[#1e2d45] rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none"
                  style={{ colorScheme: "dark" }} />
              </div>
              <NumericInput label="Jumlah yang Dibayar" value={histForm.jumlah} onChange={v => setHistForm({ ...histForm, jumlah: v ? Number(v) : "" })} required />
              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase block mb-1">Keterangan / Catatan (opsional)</label>
                <input type="text" value={histForm.catatan} onChange={e => setHistForm({ ...histForm, catatan: e.target.value })}
                  className="w-full bg-slate-900 border border-[#1e2d45] rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                  placeholder="Keterangan tambahan untuk pembayaran..." />
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5 text-[10px] text-blue-300">
                💡 Pembayaran tagihan ini akan otomatis tersinkronkan sebagai <strong>Pengeluaran</strong>.
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-all active:scale-[0.98] mt-1">
                {histEditMode ? "Simpan Perubahan" : "Konfirmasi Pembayaran"}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal visible={confirm.visible} title={confirm.title} message={confirm.message}
        onConfirm={confirm.onConfirm} onCancel={() => setConfirm(p => ({ ...p, visible: false }))} />

      <ShareDialog isOpen={shareData.isOpen} onClose={() => setShareData(p => ({ ...p, isOpen: false }))}
        cardRef={shareData.cardRef} title={shareData.title} caption={shareData.caption} />
    </div>
  );
}
