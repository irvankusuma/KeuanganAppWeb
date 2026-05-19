import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  XCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  ChevronDown,
  ChevronUp,
  History,
  Pin,
  TrendingUp,
  MoreHorizontal,
  Wrench,
  Filter
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";
import NumericInput from "../components/NumericInput";
import { useToast } from "../context/ToastContext";
import CardActionMenu from "../components/CardActionMenu";
import ShareDialog from "../components/ShareDialog";

export default function Perbaikan() {
  const [perbaikan, setPerbaikan] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [showLunasHistory, setShowLunasHistory] = useState(false);
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    nama: "",
    tanggal: new Date().toISOString().split("T")[0],
    km_saat_ini: "",
    km_tambahan: "",
    biaya: "",
    catatan: "",
  });

  // Tambah Servis modal
  const [showTambahModal, setShowTambahModal] = useState(false);
  const [editTambahMode, setEditTambahMode] = useState(false);
  const [editTambahId, setEditTambahId] = useState(null);
  const [tambahForm, setTambahForm] = useState({
    parentId: "",
    nama: "",
    tanggal: new Date().toISOString().split("T")[0],
    km_rekomendasi_sebelumnya: 0,
    km_saat_ini: "",
    km_ditentukan: "",
    biaya: "",
    catatan: "",
  });

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [shareData, setShareData] = useState({ isOpen: false, cardRef: null, title: '', caption: '' });
  const cardRefs = useRef({});

  const location = useLocation();

  useEffect(() => {
    loadData();
    if (location.state?.autoAdd) {
      setModalVisible(true);
    }
  }, [location.state]);
  const loadData = () =>
    setPerbaikan(LocalStorageService.readSheet(SHEETS.PERBAIKAN));

  const parseN = (val) => parseFloat(val) || 0;
  const fmtN = (num) => (num || num === 0 ? Number(num).toLocaleString("id-ID") : "");
  const fmtC = (num) => {
    if (!num) return "Rp 0";
    return "Rp " + Number(num).toLocaleString("id-ID");
  };

  // Auto-calc KM Berikutnya di form utama
  const getKmBerikutnya = () => {
    const a = parseN(formData.km_saat_ini),
      b = parseN(formData.km_tambahan);
    return a ? fmtN(a + b) : "";
  };

  // Auto-calc KM Berikutnya di form tambah servis (readonly)
  const getTambahKmBerikutnya = () => {
    const a = parseN(tambahForm.km_saat_ini),
      b = parseN(tambahForm.km_ditentukan);
    return a && b ? fmtN(a + b) : a ? fmtN(a) : "";
  };

  const getTambahKmSelisih = () => {
    const current = parseN(tambahForm.km_saat_ini);
    const prev = tambahForm.km_rekomendasi_sebelumnya;
    if (!current && current !== 0) return "0";
    const res = current - prev;
    return res > 0 ? `+${fmtN(res)}` : fmtN(res);
  };

  // Helper: cari entri pengeluaran berdasarkan sourceRef (ID perbaikan/histori)
  const findPengeluaranByRef = (refId) => {
    const allPengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
    return allPengeluaran.find(
      (p) => p.sourceRef?.toString() === refId?.toString() && p.sourceType === "perbaikan"
    );
  };

  // Helper: sync pengeluaran terkait saat edit biaya
  const syncPengeluaranEdit = (refId, nama, biayaBaru, tanggal, catatan) => {
    const existing = findPengeluaranByRef(refId);
    if (existing) {
      if (biayaBaru > 0) {
        // Update jumlah di pengeluaran yang sudah ada
        LocalStorageService.updateRow(SHEETS.PENGELUARAN, existing.id, {
          nama: `Perbaikan: ${nama}`,
          kategori: "Perbaikan",
          jumlah: biayaBaru,
          tanggal,
          catatan: catatan || "",
          sourceRef: refId,
          sourceType: "perbaikan",
        });
      } else {
        // Biaya jadi 0 → hapus entri pengeluaran
        LocalStorageService.deleteRow(SHEETS.PENGELUARAN, existing.id);
      }
    } else if (biayaBaru > 0) {
      // Belum ada entry → buat baru
      LocalStorageService.appendRow(SHEETS.PENGELUARAN, {
        nama: `Perbaikan: ${nama}`,
        kategori: "Perbaikan",
        jumlah: biayaBaru,
        tanggal,
        catatan: catatan || "",
        sourceRef: refId,
        sourceType: "perbaikan",
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const a = parseN(formData.km_saat_ini),
      b = parseN(formData.km_tambahan);
    if (!formData.nama || !a) {
      alert("Nama dan KM saat ini harus diisi!");
      return;
    }
    const data = {
      ...formData,
      km_saat_ini: a,
      km_tambahan: b,
      km_berikutnya: a + b,
      biaya: formData.biaya ? parseN(formData.biaya) : 0,
    };
    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.PERBAIKAN, editId, data);
      // Sync pengeluaran: update/hapus/buat sesuai biaya baru
      syncPengeluaranEdit(editId, data.nama, data.biaya, data.tanggal, data.catatan);
    } else {
      const saved = LocalStorageService.appendRow(SHEETS.PERBAIKAN, data);
      if (data.biaya > 0)
        LocalStorageService.appendRow(SHEETS.PENGELUARAN, {
          nama: `Perbaikan: ${data.nama}`,
          kategori: "Perbaikan",
          jumlah: data.biaya,
          tanggal: data.tanggal,
          catatan: data.catatan || "",
          sourceRef: saved.id,
          sourceType: "perbaikan",
        });
    }
    resetForm();
    loadData();
  };

  const handleOpenTambah = (item) => {
    // Ambil data terbaru (histori terbaru atau item sendiri) untuk km_rekomendasi_sebelumnya
    const latest = getLatestRecord(item);
    const kmRek =
      latest.km_berikutnya || latest.km_saat_ini + (latest.km_tambahan || 0);
    setEditTambahMode(false);
    setEditTambahId(null);
    setTambahForm({
      parentId: item.id,
      nama: item.nama,
      tanggal: new Date().toISOString().split("T")[0],
      km_rekomendasi_sebelumnya: kmRek,
      km_saat_ini: "",
      km_ditentukan: "",
      biaya: "",
      catatan: "",
    });
    setShowTambahModal(true);
  };

  const handleEditHistory = (histItem, parentItem) => {
    setEditTambahMode(true);
    setEditTambahId(histItem.id);
    setTambahForm({
      parentId: histItem.parent_id || parentItem.id,
      nama: histItem.nama,
      tanggal: histItem.tanggal,
      km_rekomendasi_sebelumnya: histItem.km_rekomendasi_sebelumnya || 0,
      km_saat_ini: fmtN(histItem.km_saat_ini),
      km_ditentukan: fmtN(histItem.km_tambahan),
      biaya: histItem.biaya || "",
      catatan: histItem.catatan || "",
    });
    setShowTambahModal(true);
  };

  const handleSubmitTambah = (e) => {
    e.preventDefault();
    const kmSaatIni = parseN(tambahForm.km_saat_ini);
    const kmDitentukan = parseN(tambahForm.km_ditentukan);
    // KM Berikutnya = KM Saat Ini + KM Ditentukan (auto)
    const kmBerikutnya = kmSaatIni + kmDitentukan;
    const biaya = tambahForm.biaya ? parseN(tambahForm.biaya) : 0;
    if (!kmSaatIni) {
      alert("KM Saat Ini harus diisi!");
      return;
    }
    const data = {
      nama: tambahForm.nama,
      tanggal: tambahForm.tanggal,
      km_saat_ini: kmSaatIni,
      km_tambahan: kmDitentukan,
      km_berikutnya: kmBerikutnya,
      km_rekomendasi_sebelumnya: tambahForm.km_rekomendasi_sebelumnya,
      parent_id: tambahForm.parentId,
      biaya,
      catatan: tambahForm.catatan || "",
    };
    if (editTambahMode && editTambahId) {
      LocalStorageService.updateRow(SHEETS.PERBAIKAN, editTambahId, data);
      // Sync pengeluaran terkait: update/hapus/buat sesuai biaya baru
      syncPengeluaranEdit(editTambahId, data.nama, biaya, data.tanggal, data.catatan);
    } else {
      const saved = LocalStorageService.appendRow(SHEETS.PERBAIKAN, data);
      // Otomatis masuk pengeluaran jika ada biaya, simpan sourceRef
      if (biaya > 0)
        LocalStorageService.appendRow(SHEETS.PENGELUARAN, {
          nama: `Perbaikan: ${data.nama}`,
          kategori: "Perbaikan",
          jumlah: biaya,
          tanggal: data.tanggal,
          catatan: data.catatan || "",
          sourceRef: saved.id,
          sourceType: "perbaikan",
        });
    }
    setShowTambahModal(false);
    loadData();
  };

  const handleDeleteHistory = (histItem) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Histori",
      message: `Hapus histori servis tanggal ${histItem.tanggal}?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.PERBAIKAN, histItem.id);
        // Hapus pengeluaran terkait jika ada
        const existingPengeluaran = findPengeluaranByRef(histItem.id);
        if (existingPengeluaran) {
          LocalStorageService.deleteRow(SHEETS.PENGELUARAN, existingPengeluaran.id);
        }
        loadData();
        setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setEditId(item.id);
    const d = {
      nama: item.nama,
      tanggal: item.tanggal,
      km_saat_ini: fmtN(item.km_saat_ini),
      km_tambahan: item.km_tambahan ? fmtN(item.km_tambahan) : "",
      biaya: item.biaya || "",
      catatan: item.catatan || "",
    };
    setFormData(d);
    setModalVisible(true);
  };

  const handleDelete = (item) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Perbaikan",
      message: `Apakah "${item.nama}" mau dihapus?`,
      onConfirm: () => {
        // 1. Hapus histori servis (anak)
        const history = getHistory(item.id);
        history.forEach((h) => {
          LocalStorageService.deleteRow(SHEETS.PERBAIKAN, h.id);
          const exp = findPengeluaranByRef(h.id);
          if (exp) LocalStorageService.deleteRow(SHEETS.PENGELUARAN, exp.id);
        });

        // 2. Hapus pengeluaran terkait item utama (jika ada biaya di awal)
        const rootExp = findPengeluaranByRef(item.id);
        if (rootExp)
          LocalStorageService.deleteRow(SHEETS.PENGELUARAN, rootExp.id);

        // 3. Hapus item utama
        LocalStorageService.deleteRow(SHEETS.PERBAIKAN, item.id);
        loadData();
        setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  const handleToggleSelesai = (item) => {
    const newStatus = item.status === "selesai" ? "aktif" : "selesai";
    LocalStorageService.updateRow(SHEETS.PERBAIKAN, item.id, { ...item, status: newStatus });
    loadData();
  };

  const handleTogglePin = (id) => {
    const result = LocalStorageService.togglePin(SHEETS.PERBAIKAN, id);
    if (result.success) {
      loadData();
    } else {
      showToast(result.message, "warning");
    }
  };

  const resetForm = () => {
    setModalVisible(false);
    setEditMode(false);
    setEditId(null);
    setFormData({
      nama: "",
      tanggal: new Date().toISOString().split("T")[0],
      km_saat_ini: "",
      km_tambahan: "",
      biaya: "",
      catatan: "",
    });
  };

  const getSisaKM = (item) => {
    const kmB =
      item.km_berikutnya || item.km_saat_ini + (item.km_tambahan || 0);
    return kmB - item.km_saat_ini;
  };
  const getStatus = (item) => {
    const s = getSisaKM(item);
    if (s <= 0) return "overdue";
    if (s <= 500) return "due";
    return "upcoming";
  };

  // Root items (tidak punya parent_id)
  const rootItems = perbaikan.filter((i) => !i.parent_id);
  // Anak (histori) per root item
  const getHistory = (itemId) =>
    perbaikan
      .filter((i) => i.parent_id?.toString() === itemId?.toString())
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  // Data terbaru untuk card (anak terbaru atau item sendiri)
  const getLatestRecord = (item) => {
    const hist = getHistory(item.id);
    return hist.length > 0 ? hist[0] : item;
  };

  const filteredRoots = rootItems.filter((i) => {
    const latest = getLatestRecord(i);
    if (filterStatus === "all") return true;
    return getStatus(latest) === filterStatus;
  });
  const sortedData = [...filteredRoots].sort(
    (a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      const aDate = new Date(getLatestRecord(a).tanggal || a.createdAt || 0);
      const bDate = new Date(getLatestRecord(b).tanggal || b.createdAt || 0);
      return bDate - aDate;
    }
  );

  const activeRoots = sortedData.filter((i) => i.status !== "selesai");
  const selesaiRoots = sortedData.filter((i) => i.status === "selesai");

  const countStatus = {
    all: rootItems.length,
    upcoming: rootItems.filter(
      (i) => getStatus(getLatestRecord(i)) === "upcoming",
    ).length,
    due: rootItems.filter((i) => getStatus(getLatestRecord(i)) === "due")
      .length,
    overdue: rootItems.filter(
      (i) => getStatus(getLatestRecord(i)) === "overdue",
    ).length,
  };

  const statusCfg = {
    upcoming: {
      border: "border-l-green-500",
      badge: "bg-green-500/10 text-green-400",
      text: "Aman",
      km: "text-green-400",
    },
    due: {
      border: "border-l-yellow-500",
      badge: "bg-yellow-500/10 text-yellow-400",
      text: "Segera",
      km: "text-yellow-400",
    },
    overdue: {
      border: "border-l-red-500",
      badge: "bg-red-500/10 text-red-400",
      text: "Lewat",
      km: "text-red-400",
    },
  };

  const inputCls =
    "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white";
  const readonlyCls =
    "w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-2.5 text-sm cursor-not-allowed";
  const labelCls = "block text-xs text-gray-400 mb-1";

  return (
    <div className="pb-24">
      <button
        onClick={() => setModalVisible(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-40 transition-all hover:scale-110 active:scale-95"
        title="Tambah Servis/Perbaikan"
      >
        <Plus size={28} />
      </button>

      <div className="mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-purple-100 mb-1">Total Perbaikan</div>
            <div className="text-2xl font-bold text-white">
              {rootItems.length} item
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <Wrench size={24} className="text-white" />
          </div>
        </div>
        <div className="mt-2 flex gap-3 text-xs text-purple-100">
          <span>Aman: {countStatus.upcoming}</span>
          <span>Segera: {countStatus.due}</span>
          <span>Lewat: {countStatus.overdue}</span>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-purple-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${filterStatus !== "all" ? "bg-purple-600/30 text-purple-300" : "text-gray-500"}`}
            >
              {filterStatus === "all"
                ? "Semua perbaikan"
                : `Status: ${statusCfg[filterStatus]?.text}`}
            </span>
          </div>
          <span className="text-gray-400">
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </div>
        {showFilters && (
          <div className="p-3 pt-0 border-t border-slate-700">
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { id: "all", label: "Semua", color: "bg-purple-600" },
                { id: "upcoming", label: "Aman", color: "bg-green-600" },
                { id: "due", label: "Segera", color: "bg-yellow-600" },
                { id: "overdue", label: "Lewat", color: "bg-red-600" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1 ${filterStatus === f.id ? `${f.color} text-white` : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
                >
                  {f.label}{" "}
                  <span className="text-[10px] bg-white/20 px-1 rounded-full">
                    {countStatus[f.id]}
                  </span>
                </button>
              ))}
            </div>
            {filterStatus !== "all" && (
              <button
                onClick={() => setFilterStatus("all")}
                className="w-full mt-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 rounded-lg flex items-center justify-center gap-1"
              >
                <X size={12} /> Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Daftar */}
      <div className="card-grid-responsive">
        {activeRoots.length > 0 ? (
          activeRoots.map((item, i) => {
            const latest = getLatestRecord(item);
            const kmB = latest.km_berikutnya || latest.km_saat_ini + (latest.km_tambahan || 0);
            const sisa = kmB - latest.km_saat_ini;
            const status = getStatus(latest);
            const cfg = statusCfg[status];
            const history = getHistory(item.id);
            const showHistory = activeHistoryId === item.id;
            return (
              <div
                key={item.id}
                ref={el => cardRefs.current[item.id] = el}
                className={`bg-[#0c1220] rounded-xl p-3 md:p-4 border border-[#1e2d45] border-l-4 ${cfg.border} shadow-sm hover:shadow-md transition-all group`}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-white tracking-tight truncate">
                        {item.nama}
                      </h3>
                      {item.isPinned && <Pin size={10} className="text-blue-400 fill-current" />}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider text-slate-400 border border-slate-700/50">
                        {item.tipe}
                      </span>
                      <span>•</span>
                      <span className="truncate">Update: {new Date(latest.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${cfg.badge} border border-current opacity-80`}>
                      {cfg.text}
                    </div>
                    <CardActionMenu 
                      item={item}
                      onTogglePin={handleTogglePin}
                      onShare={(ref, t, cap) => setShareData({ isOpen: true, cardRef: ref, title: t, caption: cap })}
                      cardRef={{ current: cardRefs.current[item.id] }}
                      title={`Perbaikan: ${item.nama}`}
                      caption={`*PERBAIKAN / SERVIS RENCANA KEUANGAN*\nNama Item: ${item.nama}\nTipe/Kategori: ${item.tipe}\nSisa Jarak Rekomendasi: ${sisa > 0 ? fmtN(sisa) : `−${fmtN(Math.abs(sisa))}`} km\nKM Terakhir: ${fmtN(latest.km_saat_ini)} km\nKM Target Berikutnya: ${fmtN(kmB)} km\nBiaya Servis Terakhir: ${latest.biaya > 0 ? fmtC(latest.biaya) : "Rp 0"}\nStatus Rekomendasi: ${cfg.text.toUpperCase()}\nTanggal Terakhir: ${new Date(latest.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}\n${item.catatan ? `Catatan: ${item.catatan}\n` : ""}\n---\nDikelola secara profesional dengan KeuanganApp`}
                      dataString={`${item.nama} - Sisa Jarak: ${fmtN(sisa)} km - Terakhir: ${new Date(latest.tanggal).toLocaleDateString("id-ID")}`}
                    />
                  </div>
                </div>

                {/* Nominal/KM Row */}
                <div className="flex items-center justify-between py-2 border-t border-b border-[#1e2d45]/50 my-2">
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Sisa Jarak</div>
                    <div className={`text-base font-bold tracking-tight leading-none ${cfg.km}`}>
                      {sisa > 0 ? fmtN(sisa) : `−${fmtN(Math.abs(sisa))}`} <span className="text-[10px] font-medium opacity-70">km</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Biaya Terakhir</div>
                    <div className="text-xs font-semibold text-orange-400">
                      {latest.biaya > 0 ? fmtC(latest.biaya) : "Rp 0"}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar no-export mt-1">
                  {[
                    { icon: Plus, label: "Tambah", color: "purple", onClick: () => handleOpenTambah(item) },
                    { icon: History, label: "Histori", count: history.length, color: "indigo", onClick: () => setActiveHistoryId(showHistory ? null : item.id) },
                    { icon: CheckCircle, label: "Selesai", color: "emerald", onClick: () => handleToggleSelesai(item) },
                    { icon: Pencil, label: "Edit", color: "blue", onClick: () => handleEdit(item) },
                    { icon: Trash2, label: "Hapus", color: "red", onClick: () => handleDelete(item) },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      onClick={btn.onClick}
                      className={`btn-action-compact btn-action-${btn.color} shrink-0`}
                    >
                      <btn.icon size={12} />
                      <span>{btn.label}{btn.count > 0 ? ` (${btn.count})` : ""}</span>
                    </button>
                  ))}
                </div>

                {/* History panel */}
                {showHistory && (
                  <div className="mt-4 bg-[#0a0f1a] rounded-xl border border-[#1e2d45] p-3 no-export">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                      Riwayat Servis
                    </div>
                    {history.length > 0 ? (
                      history.map((h) => {
                        const hKmB = h.km_berikutnya || h.km_saat_ini + (h.km_tambahan || 0);
                        const hSisa = hKmB - h.km_saat_ini;
                        const hStatus = getStatus(h);
                        const hCfg = statusCfg[hStatus];
                        return (
                          <div key={h.id} className="border-b border-[#1e2d45] pb-2.5 mb-2.5 last:border-0 last:mb-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-300 font-medium">
                                {new Date(h.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${hCfg.badge}`}>
                                {hCfg.text}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                              <span>KM: {fmtN(h.km_saat_ini)}</span>
                              <span className="text-slate-600">→</span>
                              <span className="text-blue-400">{fmtN(hKmB)}</span>
                              <span className="text-slate-600">|</span>
                              <span className={`font-medium ${hCfg.km}`}>
                                {hSisa > 0 ? fmtN(hSisa) : `−${fmtN(Math.abs(hSisa))}`} km
                              </span>
                              {h.biaya > 0 && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-orange-400 font-medium">{fmtC(h.biaya)}</span>
                                </>
                              )}
                            </div>
                            {h.catatan && <div className="text-xs text-slate-500 italic mb-2">"{h.catatan}"</div>}
                            <div className="flex gap-3">
                              <button onClick={() => handleEditHistory(h, item)} className="text-blue-400 hover:text-blue-300 font-medium text-xs">Edit</button>
                              <button onClick={() => handleDeleteHistory(h)} className="text-red-400 hover:text-red-300 font-medium text-xs">Hapus</button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-slate-500 italic py-2">Belum ada riwayat servis</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-[#0c1220]/50 border border-dashed border-[#1e2d45] rounded-2xl">
            <p className="text-slate-500 text-sm">
              {filterStatus !== "all" ? "Tidak ada perbaikan dengan status ini" : "Belum ada data perbaikan"}
            </p>
          </div>
        )}
      </div>

        {selesaiRoots.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#1e2d45]">
            <button 
              onClick={() => setShowLunasHistory(!showLunasHistory)} 
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors w-full"
            >
              {showLunasHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Riwayat Perbaikan Selesai ({selesaiRoots.length})
            </button>
            {showLunasHistory && (
              <div className="mt-4 space-y-4 opacity-70 hover:opacity-100 transition-opacity">
                {selesaiRoots.map((item, i) => {
                  const latest = getLatestRecord(item);
                  return (
                    <div key={`selesai-${i}`} className="bg-[#0c1220] rounded-xl border border-[#1e2d45] border-l-4 border-l-slate-600 p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-bold text-slate-300 line-through tracking-tight">
                            {item.nama}
                          </h3>
                          <span className="text-xs text-slate-500 font-medium">
                            Diselesaikan pada {new Date(latest.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleToggleSelesai(item)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all border border-slate-700"
                        >
                          <CheckCircle size={14} /> Aktifkan Lagi
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* Modal Tambah/Edit Data Utama */}
      {modalVisible && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3"
          onClick={resetForm}
        >
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">
                {editMode ? "Edit" : "Tambah"} Perbaikan
              </h2>
              <button
                onClick={resetForm}
                className="p-1.5 hover:bg-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-8">
              <div>
                <label className={labelCls}>
                  Nama Item <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  className={inputCls}
                  placeholder="Contoh: Ganti Oli"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>
                  Tanggal <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal: e.target.value })
                  }
                  className={inputCls}
                  style={{ colorScheme: "dark" }}
                  required
                />
              </div>
              <div>
                <NumericInput
                  label="KM Saat Ini"
                  value={formData.km_saat_ini}
                  onChange={(val) => setFormData({ ...formData, km_saat_ini: val })}
                  required
                />
              </div>
              <div>
                <NumericInput
                  label="+ KM Rekomendasi (Interval)"
                  value={formData.km_tambahan}
                  onChange={(val) => setFormData({ ...formData, km_tambahan: val })}
                />
              </div>
              <div>
                <label className={labelCls}>KM Berikutnya (otomatis)</label>
                <input
                  type="text"
                  value={getKmBerikutnya()}
                  readOnly
                  className={`${readonlyCls} text-blue-400`}
                  placeholder="Otomatis dihitung"
                />
              </div>
              <div>
                <NumericInput
                  label="Biaya (Opsional)"
                  value={formData.biaya}
                  onChange={(val) => setFormData({ ...formData, biaya: val })}
                />
                <p className="text-[9px] text-gray-500 mt-0.5">
                  Otomatis tercatat di Pengeluaran
                </p>
              </div>
              <div>
                <label className={labelCls}>Catatan (Opsional)</label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData({ ...formData, catatan: e.target.value })
                  }
                  className={inputCls}
                  rows="2"
                  placeholder="Merek, bengkel, dll..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium text-sm"
              >
                {editMode ? "Update" : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Servis */}
      {showTambahModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3"
          onClick={() => setShowTambahModal(false)}
        >
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">
                {editTambahMode ? "Edit" : "Tambah"} Servis
              </h2>
              <button
                onClick={() => setShowTambahModal(false)}
                className="p-1.5 hover:bg-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitTambah} className="p-3 space-y-3 pb-8 text-white">
              {/* Baris 1: Nama & Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nama Item</label>
                  <input type="text" value={tambahForm.nama} readOnly className={`${readonlyCls} text-gray-300 font-medium`} />
                </div>
                <div>
                  <label className={labelCls}>Tanggal Servis <span className="text-red-400">*</span></label>
                  <input type="date" value={tambahForm.tanggal} onChange={(e) => setTambahForm({ ...tambahForm, tanggal: e.target.value })} className={inputCls} style={{ colorScheme: "dark" }} required />
                </div>
              </div>

              {/* Baris 2: KM Rekomendasi & Selisih KM */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>KM Rekomendasi</label>
                  <input type="text" value={fmtN(tambahForm.km_rekomendasi_sebelumnya)} readOnly className={`${readonlyCls} text-blue-400 font-bold`} />
                  <p className="text-[9px] text-gray-500 mt-0.5 truncate">Target sebelumnya</p>
                </div>
                <div>
                  <label className={labelCls}>Selisih KM</label>
                  <input type="text" value={getTambahKmSelisih()} readOnly className={`${readonlyCls} font-bold ${parseN(getTambahKmSelisih()) >= 0 ? "text-green-400" : "text-red-400"}`} />
                  <p className="text-[9px] text-gray-500 mt-0.5 truncate">Hasil: Sekarang − Target</p>
                </div>
              </div>

              {/* Baris 3: KM Saat Ini & KM Ditentukan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <NumericInput
                    label="KM Saat Ini"
                    value={tambahForm.km_saat_ini}
                    onChange={(val) => setTambahForm({ ...tambahForm, km_saat_ini: val })}
                    required
                  />
                </div>
                <div>
                  <NumericInput
                    label="KM Ditentukan (Interval)"
                    value={tambahForm.km_ditentukan}
                    onChange={(val) => setTambahForm({ ...tambahForm, km_ditentukan: val })}
                  />
                </div>
              </div>

              {/* Baris 4: KM Berikutnya & Biaya */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>KM Berikutnya (Target)</label>
                  <input type="text" value={getTambahKmBerikutnya()} readOnly className={`${readonlyCls} text-blue-400 font-bold`} placeholder="Auto" />
                </div>
                <div>
                  <NumericInput
                    label="Biaya Operasional"
                    value={tambahForm.biaya}
                    onChange={(val) => setTambahForm({ ...tambahForm, biaya: val })}
                  />
                </div>
              </div>

              {/* Baris 5: Catatan */}
              <div>
                <label className={labelCls}>Catatan (Opsional)</label>
                <textarea value={tambahForm.catatan} onChange={(e) => setTambahForm({ ...tambahForm, catatan: e.target.value })} className={inputCls} rows="2" placeholder="Merek oli, bengkel, dll..." />
              </div>

              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-bold text-sm shadow-lg transition">
                {editTambahMode ? "Update Record Servis" : "Simpan Record Servis"}
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
      <ShareDialog 
        isOpen={shareData.isOpen}
        onClose={() => setShareData({ ...shareData, isOpen: false })}
        cardRef={shareData.cardRef}
        title={shareData.title}
        caption={shareData.caption}
      />
    </div>
  );
}
