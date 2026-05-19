import { useEffect, useMemo, useState, useRef } from "react";
import {
  Plus, Pencil, Trash2, X, Receipt, History,
  Pin, Filter, Search, CheckCircle,
  ChevronDown, ChevronUp
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import NumericInput from "../components/NumericInput";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import CardActionMenu from "../components/CardActionMenu";
import ShareDialog from "../components/ShareDialog";

const KATEGORI = ["Listrik", "Air", "Pulsa/Data", "Wifi/Internet", "Langganan", "Lainnya"];

const emptyForm = {
  nama: "",
  nominal: "",
  kategori: "Listrik",
  catatan: ""
};

const fmtC = (n) => n ? "Rp " + Number(n).toLocaleString("id-ID") : "Rp 0";

const nextMonth = (ym) => {
  if (!ym) return new Date().toISOString().slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const fmtBulan = (ym) => {
  if (!ym) return "-";
  const [y, m] = ym.split("-");
  return new Date(y, m - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

export default function Tagihan() {
  const [tagihan, setTagihan] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // History modal states
  const [histModal, setHistModal] = useState(false);
  const [histEditMode, setHistEditMode] = useState(false);
  const [activeTagihan, setActiveTagihan] = useState(null);
  const [histForm, setHistForm] = useState({
    id: "",
    bulan: new Date().toISOString().slice(0, 7),
    jumlah: "",
    catatan: ""
  });

  const [historyId, setHistoryId] = useState(null);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterKat, setFilterKat] = useState("all");
  const [confirm, setConfirm] = useState({ visible: false, title: "", message: "", onConfirm: null });
  const [shareData, setShareData] = useState({ isOpen: false, cardRef: null, title: "", caption: "" });

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

  const syncHistoryToPengeluaran = (histItem, tagihanName) => {
    const pengeluarans = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
    const existing = pengeluarans.find(p => p.sourceRef === histItem.id.toString() && p.sourceType === "tagihan_bayar");
    
    const payload = {
      nama: `Tagihan: ${tagihanName}`,
      kategori: "Tagihan",
      jumlah: parseFloat(histItem.jumlah) || 0,
      tanggal: histItem.tanggal || new Date().toISOString().split("T")[0],
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nama) {
      showToast("Nama tagihan harus diisi", "error");
      return;
    }

    const payload = {
      nama: form.nama.trim(),
      nominal: parseFloat(form.nominal) || 0,
      kategori: form.kategori,
      catatan: form.catatan.trim()
    };

    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.TAGIHAN, editId, payload);
      // Update historical names
      const parentHistories = riwayat.filter(r => r.tagihanId === editId.toString());
      parentHistories.forEach(h => {
        const updatedH = LocalStorageService.updateRow(SHEETS.PEMBAYARAN_TAGIHAN, h.id, { namaTagihan: form.nama.trim() });
        syncHistoryToPengeluaran(updatedH, form.nama.trim());
      });
      showToast("Tagihan diperbarui", "success");
    } else {
      LocalStorageService.appendRow(SHEETS.TAGIHAN, payload);
      showToast("Kategori tagihan ditambahkan", "success");
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
      message: `Hapus tagihan "${item.nama}" beserta seluruh riwayat pembayarannya?`,
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

  const handlePin = (id) => {
    const r = LocalStorageService.togglePin(SHEETS.TAGIHAN, id);
    if (r.success) load();
    else showToast(r.message, "warning");
  };

  // History controls
  const openAddHist = (parentItem) => {
    setActiveTagihan(parentItem);
    setHistEditMode(false);
    
    // Find next month based on last payment or current month
    const parentHistories = riwayat.filter(r => r.tagihanId === parentItem.id.toString())
      .sort((a,b) => (b.bulan || "").localeCompare(a.bulan || ""));
    const lastMonth = parentHistories.length > 0 ? parentHistories[0].bulan : new Date().toISOString().slice(0, 7);
    
    setHistForm({
      id: "",
      bulan: parentHistories.length > 0 ? nextMonth(lastMonth) : new Date().toISOString().slice(0, 7),
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
      bulan: histItem.bulan || new Date().toISOString().slice(0, 7),
      jumlah: histItem.jumlah || "",
      catatan: histItem.catatan || ""
    });
    setHistModal(true);
  };

  const handleHistSubmit = (e) => {
    e.preventDefault();
    if (!histForm.jumlah || !histForm.bulan) {
      showToast("Bulan dan nominal pembayaran harus diisi", "error");
      return;
    }
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
        tanggal: new Date().toISOString().split("T")[0],
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
      message: `Hapus pembayaran bulan ${fmtBulan(histItem.bulan)} sebesar ${fmtC(histItem.jumlah)}? (Akan menghapus catatan pengeluaran terkait)`,
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
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return a.nama.localeCompare(b.nama);
      });
  }, [tagihan, search, filterKat]);

  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
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

  const renderCard = (item) => {
    const hist = getHistory(item.id);
    const histLines = hist.map(h => `${fmtBulan(h.bulan)} - ${fmtC(h.jumlah)}`).join("\n");
    const caption = `${item.nama}
${item.nominal > 0 ? fmtC(item.nominal) : item.kategori}

${item.catatan ? `Catatan:\n${item.catatan}\n` : ""}
${hist.length > 0 ? `Riwayat Pembayaran:\n${histLines}` : ""}`.trim();

    const totalTerbayar = hist.reduce((s, h) => s + (parseFloat(h.jumlah) || 0), 0);

    return (
      <div
        key={item.id}
        ref={el => cardRefs.current[item.id] = el}
        className="bg-[#0c1220] rounded-2xl p-5 border border-[#1e2d45] border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-white truncate">{item.nama}</h3>
              {item.isPinned && <Pin size={10} className="text-blue-400 fill-current shrink-0" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-slate-800 border border-slate-700/50 px-1.5 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wide">{item.kategori}</span>
              {item.nominal > 0 && <span className="text-[10px] text-slate-500">Estimasi: {fmtC(item.nominal)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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

        {/* Info */}
        <div className="flex items-center justify-between py-2 border-t border-b border-[#1e2d45]/50 mb-3 text-xs">
          <div>
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Total Pembayaran</div>
            <div className="text-sm font-bold text-emerald-400">{fmtC(totalTerbayar)}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Frekuensi</div>
            <div className="text-xs font-semibold text-slate-300">{hist.length}x Bayar</div>
          </div>
        </div>

        {item.catatan && <p className="text-xs text-slate-500 italic mb-3 leading-relaxed">{item.catatan}</p>}

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap no-export mt-auto pt-2">
          <button onClick={() => openAddHist(item)} className="btn-action-compact btn-action-emerald shrink-0">
            <Plus size={12} /><span>Tambah Histori</span>
          </button>
          <button onClick={() => setHistoryId(historyId === item.id ? null : item.id)} className={`btn-action-compact ${historyId === item.id ? 'btn-action-purple' : 'btn-action-indigo'} shrink-0`}>
            <History size={12} /><span>Riwayat{hist.length > 0 ? ` (${hist.length})` : ""}</span>
          </button>
          <button onClick={() => handleEdit(item)} className="btn-action-compact btn-action-blue shrink-0">
            <Pencil size={12} /><span>Edit</span>
          </button>
          <button onClick={() => handleDelete(item)} className="btn-action-compact btn-action-red shrink-0">
            <Trash2 size={12} /><span>Hapus</span>
          </button>
        </div>

        {/* History Area */}
        {((historyId === item.id) || (shareData.isOpen && shareData.cardRef?.current === cardRefs.current[item.id])) && (
          <div className="mt-4 bg-[#0a0f1a] rounded-xl p-3 border border-[#1e2d45] overflow-hidden">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2 pb-1 border-b border-[#1e2d45]/50 flex justify-between items-center">
              <span>Riwayat Pembayaran</span>
              <span className="text-slate-400 lowercase italic">{hist.length} entri</span>
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
              {hist.length > 0 ? hist.map((h) => (
                <div key={h.id} className="flex justify-between items-center py-1.5 border-b border-[#1e2d45]/20 last:border-0 text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="text-slate-200 font-bold text-xs truncate">{fmtBulan(h.bulan)}</div>
                    <div className="text-slate-500 text-[9px] flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span>{h.tanggal}</span>
                      {h.catatan && <span className="text-slate-600 truncate max-w-[120px]">({h.catatan})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-bold text-emerald-400 text-xs">{fmtC(h.jumlah)}</span>
                    <div className="flex items-center gap-1 no-export">
                      <button onClick={() => openEditHist(item, h)} className="p-1 hover:bg-[#141d2e] text-slate-500 hover:text-blue-400 rounded transition-colors" title="Edit Riwayat">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => handleDeleteHist(h)} className="p-1 hover:bg-[#141d2e] text-slate-500 hover:text-red-400 rounded transition-colors" title="Hapus Riwayat">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-[11px] text-slate-600 italic text-center py-4">Belum ada riwayat pembayaran.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-28 md:pb-6">
      {/* FAB */}
      <button onClick={() => setModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-40 transition-all hover:scale-110 active:scale-95"
        title="Tambah Layanan Tagihan">
        <Plus size={28} />
      </button>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-600/80 to-indigo-600/80 rounded-2xl p-4 border border-blue-500/20 text-white">
          <div className="text-[10px] text-blue-100 uppercase font-bold tracking-wider mb-1">Total Pembayaran (Semua)</div>
          <div className="text-2xl font-bold">{fmtC(stats.totalAllTime)}</div>
          <div className="text-xs text-blue-200 mt-1">{stats.totalCount} kategori tagihan dipantau</div>
        </div>
        <div className="bg-gradient-to-r from-emerald-600/80 to-teal-600/80 rounded-2xl p-4 border border-emerald-500/20 text-white">
          <div className="text-[10px] text-emerald-100 uppercase font-bold tracking-wider mb-1">Terbayar Bulan Ini</div>
          <div className="text-2xl font-bold">{fmtC(stats.paidThisMonth)}</div>
          <div className="text-xs text-emerald-200 mt-1">Otomatis tercatat ke Pengeluaran</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-3.5 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama layanan, kategori..." 
          className="w-full bg-[#0c1220] border border-[#1e2d45] rounded-xl pl-9 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none transition-colors" />
      </div>

      {/* Filter */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/40 transition-colors" onClick={() => setShowFilter(!showFilter)}>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-blue-400 shrink-0" />
            <span className="text-xs font-bold text-white uppercase tracking-tight">Filter Kategori</span>
            {filterKat !== "all" && (
              <span className="text-[10px] text-blue-400 font-semibold">• Aktif</span>
            )}
          </div>
          {showFilter ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
        {showFilter && (
          <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
            <div className="pt-3">
              <div className="flex flex-wrap gap-1.5">
                {["all", ...KATEGORI].map(c => (
                  <button key={c} onClick={() => setFilterKat(c)}
                    className={`px-3 py-1 text-xs rounded-full font-semibold transition-all ${filterKat === c ? "bg-blue-600 text-white" : "bg-slate-700/60 text-slate-300 hover:bg-slate-700"}`}>
                    {c === "all" ? "Semua" : c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card list */}
      <div className="card-grid-responsive">
        {filtered.length > 0 ? filtered.map(item => renderCard(item)) : (
          <div className="text-center py-14 bg-[#0c1220]/50 border border-dashed border-[#1e2d45] rounded-2xl col-span-full">
            <Receipt size={28} className="mx-auto text-slate-600 mb-2" />
            <p className="text-slate-400 text-sm font-medium">Belum ada layanan tagihan.</p>
            <p className="text-slate-500 text-xs mt-1">Buat layanan tagihan baru dengan tombol + di kanan bawah.</p>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit Parent */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4" onClick={resetForm}>
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-tight">{editMode ? "Edit Kategori Tagihan" : "Tambah Kategori Tagihan"}</h2>
              <button onClick={resetForm} className="p-1.5 hover:bg-slate-700 rounded-full transition-colors"><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Nama Layanan <span className="text-red-500">*</span></label>
                <input type="text" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} required
                  placeholder="Contoh: Listrik PLN, Tagihan Wifi, Air PDAM"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
              </div>
              <NumericInput label="Estimasi / Rata-rata Nominal (Opsional)" value={form.nominal} onChange={v => setForm({ ...form, nominal: v ? Number(v) : "" })} />
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Kategori</label>
                <select value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors">
                  {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Catatan / No. Pelanggan (opsional)</label>
                <textarea value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} rows={2}
                  placeholder="Contoh: No. Meteran, ID Pelanggan, Keterangan..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors resize-none" />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                {editMode ? "Simpan Perubahan" : "Buat Kategori Tagihan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Histori Pembayaran */}
      {histModal && activeTagihan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4" onClick={() => setHistModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-tight">{histEditMode ? "Edit Riwayat Pembayaran" : "Catat Pembayaran Tagihan"}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{activeTagihan.nama}</p>
              </div>
              <button onClick={() => setHistModal(false)} className="p-1.5 hover:bg-slate-700 rounded-full transition-colors"><X size={18} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleHistSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Bulan Pembayaran <span className="text-red-500">*</span></label>
                <input type="month" value={histForm.bulan} onChange={e => setHistForm({ ...histForm, bulan: e.target.value })} required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
              </div>
              <NumericInput label="Jumlah yang Dibayar" value={histForm.jumlah} onChange={v => setHistForm({ ...histForm, jumlah: v ? Number(v) : "" })} required />
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Keterangan / Catatan (opsional)</label>
                <textarea value={histForm.catatan} onChange={e => setHistForm({ ...histForm, catatan: e.target.value })} rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors resize-none"
                  placeholder="Keterangan tambahan untuk pembayaran ini..." />
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 text-[11px] text-blue-300 leading-relaxed">
                💡 Pencatatan histori ini akan otomatis tersinkronisasi sebagai <strong>Pengeluaran</strong>.
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]">
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
