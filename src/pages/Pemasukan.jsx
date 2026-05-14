import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus, Pencil, Trash2, X, Calculator, TrendingUp,
  Filter, ChevronDown, ChevronUp, History,
  ArrowDownCircle, ArrowUpCircle, MoreHorizontal, Pin
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";
import { SkeletonListPage } from "../components/Skeleton";
import NumericInput from "../components/NumericInput";
import { useToast } from "../context/ToastContext";

export default function Pemasukan() {
  const [pemasukan, setPemasukan] = useState([]);
  const [pengeluaran, setPengeluaran] = useState([]);

  // Modal utama tambah/edit root pemasukan
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    nama: "", jumlah: "",
    tanggal: new Date().toISOString().split("T")[0],
    catatan: "",
  });

  // Modal tambah sub-saldo (per item)
  const [showTambahSubModal, setShowTambahSubModal] = useState(false);
  const [editSubMode, setEditSubMode] = useState(false);
  const [editSubId, setEditSubId] = useState(null);
  const [subForm, setSubForm] = useState({
    parentId: "", tanggal: new Date().toISOString().split("T")[0],
    jumlah: "", catatan: "",
  });

  // Modal keluar (per item)
  const [showKeluarModal, setShowKeluarModal] = useState(false);
  const [editKeluarMode, setEditKeluarMode] = useState(false);
  const [editKeluarId, setEditKeluarId] = useState(null);
  const [keluarParentId, setKeluarParentId] = useState(null);
  const [keluarParentNama, setKeluarParentNama] = useState("");
  const [keluarForm, setKeluarForm] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    jumlah: "", catatan: "",
  });

  // History panel
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  // Filter bulan
  const [filterBulan, setFilterBulan] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Dropdown menu per card
  const [activeMenu, setActiveMenu] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    visible: false, title: "", message: "", onConfirm: null,
  });

  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  useEffect(() => {
    loadData();
    if (location.state?.autoAdd) {
      setModalVisible(true);
    }
  }, [location.state]);

  const loadData = () => {
    setLoading(false);
    setPemasukan(LocalStorageService.readSheet(SHEETS.PEMASUKAN));
    setPengeluaran(LocalStorageService.readSheet(SHEETS.PENGELUARAN));
  };

  // ===== FORMAT HELPERS =====
  const fmtC = (num) => "Rp " + (Number(num) || 0).toLocaleString("id-ID");
  const fmtN = (num) => num ? Number(num).toLocaleString("id-ID") : "";
  const parseN = (str) => Number(String(str || "").replace(/\./g, "")) || 0;

  // ===== DATA RELATIONS =====
  const rootItems = pemasukan.filter((i) => !i.parent_id);

  const getSubTambah = (itemId) =>
    pemasukan
      .filter((i) => i.parent_id?.toString() === itemId?.toString())
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  const getKeluarList = (itemId) =>
    pengeluaran
      .filter((p) =>
        p.sourceRef?.toString() === itemId?.toString() &&
        p.sourceType === "pemasukan_keluar"
      )
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  const getSaldoAktif = (item) => {
    const root = parseFloat(item.jumlah) || 0;
    const subTotal = getSubTambah(item.id).reduce((s, i) => s + (parseFloat(i.jumlah) || 0), 0);
    const keluarTotal = getKeluarList(item.id).reduce((s, i) => s + (parseFloat(i.jumlah) || 0), 0);
    return root + subTotal - keluarTotal;
  };

  // ===== TOTALS =====
  const totalPemasukan = pemasukan.reduce((s, i) => s + (parseFloat(i.jumlah) || 0), 0);
  const totalPengeluaran = pengeluaran.reduce((s, i) => s + (parseFloat(i.jumlah) || 0), 0);
  const sisaSaldo = totalPemasukan - totalPengeluaran;

  // ===== FILTER =====
  const getMonthYear = (d) => { const dt = new Date(d); return `${dt.getMonth() + 1}-${dt.getFullYear()}`; };
  const uniqueBulan = [...new Set(rootItems.map((i) => getMonthYear(i.tanggal)))].sort((a, b) => {
    const [mA, yA] = a.split("-").map(Number);
    const [mB, yB] = b.split("-").map(Number);
    return yA !== yB ? yB - yA : mB - mA;
  });
  const filteredRoots = rootItems.filter((i) => filterBulan === "all" || getMonthYear(i.tanggal) === filterBulan);
  const sortedRoots = [...filteredRoots].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return new Date(b.tanggal) - new Date(a.tanggal);
  });

  const handleTogglePin = (id) => {
    const result = LocalStorageService.togglePin(SHEETS.PEMASUKAN, id);
    if (result.success) {
      loadData();
    } else {
      showToast(result.message, "warning");
    }
  };

  const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white";
  const labelCls = "block text-xs text-gray-400 mb-1";

  // ===== HANDLERS: ROOT PEMASUKAN =====
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama || !formData.jumlah) { alert("Nama dan saldo harus diisi!"); return; }
    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.PEMASUKAN, editId, formData);
    } else {
      LocalStorageService.appendRow(SHEETS.PEMASUKAN, formData);
    }
    resetForm(); loadData();
  };

  const handleEdit = (item) => {
    setEditMode(true); setEditId(item.id);
    setFormData({ nama: item.nama, jumlah: item.jumlah, tanggal: item.tanggal, catatan: item.catatan || "" });
    setModalVisible(true);
  };

  const handleDelete = (item) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Pemasukan",
      message: `Hapus "${item.nama}"? Semua data terkait ikut terhapus.`,
      onConfirm: () => {
        getSubTambah(item.id).forEach((s) => LocalStorageService.deleteRow(SHEETS.PEMASUKAN, s.id));
        getKeluarList(item.id).forEach((k) => LocalStorageService.deleteRow(SHEETS.PENGELUARAN, k.id));
        LocalStorageService.deleteRow(SHEETS.PEMASUKAN, item.id);
        loadData();
        setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  const resetForm = () => {
    setModalVisible(false); setEditMode(false); setEditId(null);
    setFormData({ nama: "", jumlah: "", tanggal: new Date().toISOString().split("T")[0], catatan: "" });
  };

  // ===== HANDLERS: SUB-TAMBAH =====
  const handleOpenSub = (item) => {
    setEditSubMode(false); setEditSubId(null);
    setSubForm({ parentId: item.id, tanggal: new Date().toISOString().split("T")[0], jumlah: "", catatan: "" });
    setShowTambahSubModal(true);
  };

  const handleEditSub = (subItem) => {
    setEditSubMode(true); setEditSubId(subItem.id);
    setSubForm({ parentId: subItem.parent_id, tanggal: subItem.tanggal, jumlah: subItem.jumlah, catatan: subItem.catatan || "" });
    setShowTambahSubModal(true);
  };

  const handleSubmitSub = (e) => {
    e.preventDefault();
    const jumlahNum = parseFloat(subForm.jumlah) || 0;
    if (!jumlahNum) { alert("Saldo harus diisi!"); return; }
    const data = { parent_id: subForm.parentId, jumlah: jumlahNum, tanggal: subForm.tanggal, catatan: subForm.catatan || "" };
    if (editSubMode && editSubId) {
      LocalStorageService.updateRow(SHEETS.PEMASUKAN, editSubId, data);
    } else {
      LocalStorageService.appendRow(SHEETS.PEMASUKAN, data);
    }
    setShowTambahSubModal(false); loadData();
  };

  const handleDeleteSub = (subItem) => {
    setConfirmModal({
      visible: true, title: "Hapus Tambah Saldo",
      message: `Hapus tambahan saldo ${fmtC(subItem.jumlah)}?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.PEMASUKAN, subItem.id);
        loadData(); setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  // ===== HANDLERS: KELUAR =====
  const handleOpenKeluar = (item) => {
    setEditKeluarMode(false); setEditKeluarId(null);
    setKeluarParentId(item.id); setKeluarParentNama(item.nama);
    setKeluarForm({ tanggal: new Date().toISOString().split("T")[0], jumlah: "", catatan: "" });
    setShowKeluarModal(true);
  };

  const handleEditKeluar = (kItem, parentItem) => {
    setEditKeluarMode(true); setEditKeluarId(kItem.id);
    setKeluarParentId(parentItem.id); setKeluarParentNama(parentItem.nama);
    setKeluarForm({ tanggal: kItem.tanggal, jumlah: kItem.jumlah, catatan: kItem.catatan || "" });
    setShowKeluarModal(true);
  };

  const handleSubmitKeluar = (e) => {
    e.preventDefault();
    const jumlahNum = parseFloat(keluarForm.jumlah) || 0;
    if (!jumlahNum) { alert("Saldo harus diisi!"); return; }
    const data = {
      nama: `Keluar: ${keluarParentNama}`,
      kategori: "Keluar Pemasukan",
      jumlah: jumlahNum,
      tanggal: keluarForm.tanggal,
      catatan: keluarForm.catatan || "",
      sourceRef: keluarParentId,
      sourceType: "pemasukan_keluar",
    };
    if (editKeluarMode && editKeluarId) {
      LocalStorageService.updateRow(SHEETS.PENGELUARAN, editKeluarId, data);
    } else {
      LocalStorageService.appendRow(SHEETS.PENGELUARAN, data);
    }
    setShowKeluarModal(false); loadData();
  };

  const handleDeleteKeluar = (kItem) => {
    setConfirmModal({
      visible: true, title: "Hapus Keluar",
      message: `Hapus saldo keluar ${fmtC(kItem.jumlah)}?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.PENGELUARAN, kItem.id);
        loadData(); setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  // ===== RENDER =====
  if (loading) return <SkeletonListPage count={4} />;

  return (
    <div>
      {/* Ringkasan */}
      <div className="mb-4 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 shadow-xl shadow-emerald-900/20 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-emerald-100 mb-1">Total Pemasukan</div>
            <div className="text-2xl font-bold tracking-tight">{fmtC(totalPemasukan)}</div>
          </div>
          <div className="bg-white/20 p-2.5 rounded-xl"><TrendingUp size={22} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/20">
          <div>
            <div className="text-xs text-emerald-100">Total Pengeluaran</div>
            <div className="text-sm font-semibold mt-0.5">{fmtC(totalPengeluaran)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-emerald-100">Sisa Saldo</div>
            <div className={`text-sm font-semibold mt-0.5 ${sisaSaldo < 0 ? "text-red-200" : "text-green-200"}`}>{fmtC(sisaSaldo)}</div>
          </div>
        </div>
      </div>

      {/* Filter Bulan */}
      <div className="mb-4 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-emerald-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${filterBulan !== "all" ? "bg-emerald-600/30 text-emerald-300" : "text-gray-500"}`}>
              {filterBulan === "all" ? "Semua pemasukan" : (() => {
                const [m, y] = filterBulan.split("-");
                return new Date(y, m - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
              })()}
            </span>
          </div>
          <span className="text-gray-400">{showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
        </div>
        {showFilters && (
          <div className="p-3 pt-0 border-t border-slate-700">
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                onClick={() => setFilterBulan("all")}
                className={`px-2.5 py-1 text-xs rounded-full ${filterBulan === "all" ? "bg-emerald-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
              >Semua</button>
              {uniqueBulan.map((bulan) => {
                const [m, y] = bulan.split("-");
                const label = new Date(y, m - 1).toLocaleDateString("id-ID", { month: "short" });
                return (
                  <button key={bulan} onClick={() => setFilterBulan(bulan)}
                    className={`px-2.5 py-1 text-xs rounded-full ${filterBulan === bulan ? "bg-emerald-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
                  >{label} {y}</button>
                );
              })}
            </div>
            {filterBulan !== "all" && (
              <button onClick={() => setFilterBulan("all")} className="w-full mt-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 rounded-lg flex items-center justify-center gap-1">
                <X size={12} /> Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Daftar */}
      <div className="space-y-2">
        {sortedRoots.length > 0 ? (
          sortedRoots.map((item) => {
            const subTambah    = getSubTambah(item.id);
            const keluarList   = getKeluarList(item.id);
            const saldoAktif   = getSaldoAktif(item);
            const showHistory  = activeHistoryId === item.id;
            const historyCount = subTambah.length + keluarList.length;
            const menuOpen     = activeMenu === item.id;

            return (
              <div
                key={item.id}
                className="bg-[#0e1523] border border-[#1e2d45] rounded-xl border-l-4 border-l-emerald-500 p-4"
              >
                {/* Row 1: nama + jumlah awal */}
                <div className="flex justify-between items-start gap-3 mb-1">
                  <h3 className="text-sm font-semibold text-white truncate flex-1">{item.nama}</h3>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-emerald-400">{fmtC(item.jumlah)}</span>
                    <button 
                      onClick={() => handleTogglePin(item.id)}
                      className={`p-1 rounded-full transition-all ${item.isPinned ? "bg-blue-500/20 text-blue-400" : "text-slate-600 hover:bg-white/5 hover:text-slate-400"}`}
                      title={item.isPinned ? "Lepas Pin" : "Pin Item"}
                    >
                      <Pin size={14} className={item.isPinned ? "fill-current" : ""} />
                    </button>
                  </div>
                </div>

                {/* Row 2: tanggal + saldo aktif */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                  <span>
                    {new Date(item.tanggal).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                  {saldoAktif !== (parseFloat(item.jumlah) || 0) && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="text-slate-400">Aktif:</span>
                      <span className={`font-semibold ${saldoAktif < 0 ? "text-red-400" : "text-teal-400"}`}>
                        {fmtC(saldoAktif)}
                      </span>
                    </>
                  )}
                  {historyCount > 0 && (
                    <span className="ml-auto text-emerald-400/80 text-xs">{historyCount} entri</span>
                  )}
                </div>

                {item.catatan && (
                  <p className="text-xs text-slate-500 italic mb-3 truncate">{item.catatan}</p>
                )}

                {/* ── Action buttons: 3 main + overflow menu ── */}
                <div className="flex items-center gap-2">
                  {/* Riwayat */}
                  <button
                    onClick={() => setActiveHistoryId(showHistory ? null : item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      showHistory
                        ? "bg-violet-600/30 text-violet-300"
                        : "bg-[#141d2e] text-slate-400 hover:text-violet-400 hover:bg-violet-600/15"
                    }`}
                  >
                    <History size={13} />
                    Riwayat {historyCount > 0 && `(${historyCount})`}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141d2e] text-slate-400 hover:text-blue-400 hover:bg-blue-600/15 transition-colors"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>

                  {/* Overflow menu (⋯) */}
                  <div className="ml-auto relative">
                    <button
                      onClick={() => setActiveMenu(menuOpen ? null : item.id)}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        menuOpen
                          ? "bg-white/10 text-slate-200"
                          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {menuOpen && (
                      <>
                        {/* Click-away overlay */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenu(null)}
                        />
                        {/* Dropdown */}
                        <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-[#0e1523] border border-[#1e2d45] rounded-xl shadow-2xl shadow-black/50 z-20 overflow-hidden">
                          <button
                            onClick={() => { handleOpenSub(item); setActiveMenu(null); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-emerald-300 hover:bg-emerald-600/10 transition-colors"
                          >
                            <ArrowUpCircle size={14} />
                            Tambah Saldo
                          </button>
                          <button
                            onClick={() => { handleOpenKeluar(item); setActiveMenu(null); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-orange-300 hover:bg-orange-600/10 transition-colors"
                          >
                            <ArrowDownCircle size={14} />
                            Keluar Saldo
                          </button>
                          <div className="h-px bg-[#1e2d45]" />
                          <button
                            onClick={() => { handleDelete(item); setActiveMenu(null); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                          >
                            <Trash2 size={14} />
                            Hapus
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── History panel ── */}
                {showHistory && (
                  <div className="mt-3 bg-[#0a0f1a] rounded-xl border border-[#1e2d45] p-3">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Riwayat</p>
                    {historyCount > 0 ? (
                      <div className="space-y-2">
                        {subTambah.map((s) => (
                          <div key={s.id} className="flex items-start justify-between gap-2 pb-2 border-b border-[#1e2d45] last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-medium shrink-0 flex items-center gap-1">
                                <ArrowUpCircle size={10} /> Masuk
                              </span>
                              <span className="text-xs text-slate-400 truncate">
                                {new Date(s.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-semibold text-emerald-400">{fmtC(s.jumlah)}</span>
                              <button onClick={() => handleEditSub(s)} className="p-1 rounded text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={11} /></button>
                              <button onClick={() => handleDeleteSub(s)} className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={11} /></button>
                            </div>
                          </div>
                        ))}
                        {keluarList.map((k) => (
                          <div key={k.id} className="flex items-start justify-between gap-2 pb-2 border-b border-[#1e2d45] last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-400 text-[10px] font-medium shrink-0 flex items-center gap-1">
                                <ArrowDownCircle size={10} /> Keluar
                              </span>
                              <span className="text-xs text-slate-400 truncate">
                                {new Date(k.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-semibold text-orange-400">-{fmtC(k.jumlah)}</span>
                              <button onClick={() => handleEditKeluar(k, item)} className="p-1 rounded text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={11} /></button>
                              <button onClick={() => handleDeleteKeluar(k)} className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={11} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 italic text-center py-2">Belum ada riwayat</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-14 text-slate-500 text-sm bg-[#0e1523] border border-[#1e2d45] rounded-xl">
            {filterBulan !== "all" ? "Tidak ada pemasukan di bulan ini" : "Belum ada pemasukan"}
          </div>
        )}

      {/* ========== MODAL TAMBAH/EDIT ROOT ========== */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-3" onClick={resetForm}>
          <div className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">{editMode ? "Edit" : "Tambah"} Pemasukan</h2>
              <button onClick={resetForm} className="p-1.5 hover:bg-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-8">
              <div>
                <label className={labelCls}>Nama Pemasukan <span className="text-red-400">*</span></label>
                <input type="text" value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className={inputCls} placeholder="Contoh: Gaji Bulanan" required />
              </div>
              <div>
                <label className={labelCls}>Tanggal</label>
                <input type="date" value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className={inputCls} style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <NumericInput
                  label="Saldo"
                  value={formData.jumlah}
                  onChange={(val) => setFormData({ ...formData, jumlah: val ? Number(val) : "" })}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Catatan</label>
                <textarea value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className={inputCls} rows="2" placeholder="Opsional" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2">
                {editMode ? "Update" : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL TAMBAH SUB-SALDO ========== */}
      {showTambahSubModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3" onClick={() => setShowTambahSubModal(false)}>
          <div className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">{editSubMode ? "Edit" : "Tambah"} Saldo Masuk</h2>
              <button onClick={() => setShowTambahSubModal(false)} className="p-1.5 hover:bg-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitSub} className="p-3 space-y-3 pb-8">
              <div>
                <label className={labelCls}>Tanggal</label>
                <input type="date" value={subForm.tanggal}
                  onChange={(e) => setSubForm({ ...subForm, tanggal: e.target.value })}
                  className={inputCls} style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <NumericInput
                  label="Saldo"
                  value={subForm.jumlah}
                  onChange={(val) => setSubForm({ ...subForm, jumlah: val ? Number(val) : "" })}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Catatan</label>
                <textarea value={subForm.catatan}
                  onChange={(e) => setSubForm({ ...subForm, catatan: e.target.value })}
                  className={inputCls} rows="2" placeholder="Opsional" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2">
                {editSubMode ? "Update" : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL KELUAR ========== */}
      {showKeluarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3" onClick={() => setShowKeluarModal(false)}>
          <div className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-bold">{editKeluarMode ? "Edit" : "Tambah"} Keluar</h2>
                <div className="text-xs text-gray-400 truncate max-w-[240px]">dari: {keluarParentNama}</div>
              </div>
              <button onClick={() => setShowKeluarModal(false)} className="p-1.5 hover:bg-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitKeluar} className="p-3 space-y-3 pb-8">
              <div>
                <label className={labelCls}>Tanggal</label>
                <input type="date" value={keluarForm.tanggal}
                  onChange={(e) => setKeluarForm({ ...keluarForm, tanggal: e.target.value })}
                  className={inputCls} style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <NumericInput
                  label="Saldo Keluar"
                  value={keluarForm.jumlah}
                  onChange={(val) => setKeluarForm({ ...keluarForm, jumlah: val ? Number(val) : "" })}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Catatan</label>
                <textarea value={keluarForm.catatan}
                  onChange={(e) => setKeluarForm({ ...keluarForm, catatan: e.target.value })}
                  className={inputCls} rows="2" placeholder="Opsional" />
              </div>
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2">
                {editKeluarMode ? "Update" : "Simpan"}
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
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
      />
    </div>
  );
}
