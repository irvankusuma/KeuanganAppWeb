import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Calculator,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Wallet,
  History,
  Pin,
  MoreHorizontal
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";
import NumericInput from "../components/NumericInput";
import { useToast } from "../context/ToastContext";
import CardActionMenu from "../components/CardActionMenu";
import ShareDialog from "../components/ShareDialog";

export default function Piutang() {
  const [piutang, setPiutang] = useState([]);
  const [pembayaranPiutang, setPembayaranPiutang] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    namaOrang: "",
    jumlah: "",
    tanggal: new Date().toISOString().split("T")[0],
    jatuhTempo: new Date().toISOString().split("T")[0],
    catatan: "",
  });
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [showLunasHistory, setShowLunasHistory] = useState(false);
  const { showToast } = useToast();
  const [payFormData, setPayFormData] = useState({
    piutangId: "",
    namaOrang: "",
    jumlah: "",
    tanggal: new Date().toISOString().split("T")[0],
    catatan: "",
  });
  const [showEditPayModal, setShowEditPayModal] = useState(false);
  const [editPayData, setEditPayData] = useState({
    id: "",
    piutangId: "",
    namaOrang: "",
    jumlah: "",
    tanggal: "",
    catatan: "",
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    piutangId: "",
    namaOrang: "",
    jumlah: "",
    tanggal: new Date().toISOString().split("T")[0],
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

  const loadData = () => {
    const data = LocalStorageService.readSheet(SHEETS.PIUTANG);
    const pembayaran = LocalStorageService.readSheet(SHEETS.PEMBAYARAN_PIUTANG);
    setPiutang(data);
    setPembayaranPiutang(pembayaran);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.namaOrang || !formData.jumlah) {
      alert("Nama dan jumlah harus diisi!");
      return;
    }
    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.PIUTANG, editId, formData);
    } else {
      LocalStorageService.appendRow(SHEETS.PIUTANG, formData);
    }
    resetForm();
    loadData();
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setEditId(item.id);
    setFormData({
      namaOrang: item.namaOrang,
      jumlah: item.jumlah,
      tanggal: item.tanggal,
      jatuhTempo: item.jatuhTempo,
      catatan: item.catatan || "",
    });
    setModalVisible(true);
  };

  const handleDelete = (item) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Piutang",
      message: `Apakah piutang "${item.namaOrang}" mau dihapus? Semua riwayat juga akan dihapus.`,
      onConfirm: () => {
        // Hapus history dan sync data
        const historyPiutang = pembayaranPiutang.filter(p => p.piutangId?.toString() === item.id?.toString());
        historyPiutang.forEach(hist => {
          LocalStorageService.deleteRow(SHEETS.PEMBAYARAN_PIUTANG, hist.id);
          if (hist.type === "tambah") {
            const allPengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
            const pExisting = allPengeluaran.find(p => p.sourceRef?.toString() === hist.id?.toString() && p.sourceType === "piutang_tambah");
            if (pExisting) LocalStorageService.deleteRow(SHEETS.PENGELUARAN, pExisting.id);
          } else {
            const allPemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
            const pExisting = allPemasukan.find(p => p.sourceRef?.toString() === hist.id?.toString() && p.sourceType === "piutang_bayar");
            if (pExisting) LocalStorageService.deleteRow(SHEETS.PEMASUKAN, pExisting.id);
          }
        });

        LocalStorageService.deleteRow(SHEETS.PIUTANG, item.id);
        loadData();
        setConfirmModal({ ...confirmModal, visible: false });
      },
    });
  };

  const resetForm = () => {
    setModalVisible(false);
    setEditMode(false);
    setEditId(null);
    setFormData({
      namaOrang: "",
      jumlah: "",
      tanggal: new Date().toISOString().split("T")[0],
      jatuhTempo: new Date().toISOString().split("T")[0],
      catatan: "",
    });
  };

  const formatCurrency = (num) => {
    if (!num) return "Rp 0";
    return "Rp " + Number(num).toLocaleString("id-ID");
  };

  const getTotalDiterima = (piutangId) =>
    pembayaranPiutang
      .filter(
        (item) =>
          item.piutangId?.toString() === piutangId?.toString() &&
          (!item.type || item.type === "bayar"),
      )
      .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const getTotalPenambahan = (piutangId) =>
    pembayaranPiutang
      .filter(
        (item) =>
          item.piutangId?.toString() === piutangId?.toString() &&
          item.type === "tambah",
      )
      .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);

  const getSisa = (item) => {
    const t = parseFloat(item.jumlah) || 0;
    const p = getTotalPenambahan(item.id);
    const d = getTotalDiterima(item.id);
    return Math.max(t + p - d, 0);
  };

  const getDueStatus = (item) => {
    if (getSisa(item) <= 0) return "lunas";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(item.jatuhTempo);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today) return "overdue";
    if (dueDate.getTime() === today.getTime()) return "due";
    return "upcoming";
  };

  const handleTogglePin = (id) => {
    const result = LocalStorageService.togglePin(SHEETS.PIUTANG, id);
    if (result.success) {
      loadData();
    } else {
      showToast(result.message, "warning");
    }
  };

  const sortedData = [...piutang]
    .filter((item) => {
      if (filterStatus === "all") return true;
      const status = getDueStatus(item);
      return status === filterStatus;
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.tanggal || b.createdAt || 0) - new Date(a.tanggal || a.createdAt || 0);
    });

  const activePiutang = sortedData.filter((item) => getDueStatus(item) !== "lunas");
  const lunasPiutang = sortedData.filter((item) => getDueStatus(item) === "lunas");

  const renderPiutangCard = (item) => {
    const total = parseFloat(item.jumlah) || 0;
    const totalPenambahan = getTotalPenambahan(item.id);
    const totalDiterima = getTotalDiterima(item.id);
    const sisa = Math.max(total + totalPenambahan - totalDiterima, 0);
    const historyPembayaran = getHistoryPiutang(item.id);
    const status = getDueStatus(item);
    
    let borderColor = "border-l-emerald-400";
    let statusIcon = <Clock size={12} className="text-emerald-400" />;
    let statusText = "Akan Datang";
    let statusBg = "bg-emerald-400/10 text-emerald-300";

    if (status === "lunas") {
      borderColor = "border-l-emerald-500";
      statusIcon = <CheckCircle size={12} className="text-emerald-500" />;
      statusText = "Lunas";
      statusBg = "bg-emerald-500/10 text-emerald-400";
    } else if (status === "overdue") {
      borderColor = "border-l-rose-500";
      statusIcon = <AlertCircle size={12} className="text-rose-500" />;
      statusText = "Terlewat";
      statusBg = "bg-rose-500/10 text-rose-400";
    } else if (status === "due") {
      borderColor = "border-l-orange-500";
      statusIcon = <CheckCircle size={12} className="text-orange-500" />;
      statusText = "Hari Ini";
      statusBg = "bg-orange-500/10 text-orange-400";
    }

    return (
      <div
        key={item.id}
        ref={el => cardRefs.current[item.id] = el}
        className={`bg-[#0c1220] rounded-xl p-3 md:p-4 border border-[#1e2d45] border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-all group`}
      >
        {/* Header Row */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-bold text-white tracking-tight truncate">
                {item.namaOrang}
              </h3>
              {item.isPinned && <Pin size={10} className="text-blue-400 fill-current" />}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider text-slate-400 border border-slate-700/50">
                Piutang
              </span>
              <span>•</span>
              <span className="truncate">{new Date(item.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${statusBg} border border-current opacity-80`}>
              {statusText}
            </div>
            <CardActionMenu 
              item={item}
              onTogglePin={handleTogglePin}
              onShare={(ref, t, cap) => setShareData({ isOpen: true, cardRef: ref, title: t, caption: cap })}
              cardRef={{ get current() { return cardRefs.current[item.id]; } }}
              title={`Piutang: ${item.namaOrang}`}
              caption={`${item.namaOrang}
Sisa Piutang: ${formatCurrency(sisa)}
Total: ${formatCurrency(total)}
Jatuh Tempo: ${new Date(item.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}

${item.catatan ? `Catatan:\n${item.catatan}` : ""}`.trim()}
              dataString={`${item.namaOrang} - Sisa: ${formatCurrency(sisa)} - Jatuh Tempo: ${new Date(item.jatuhTempo).toLocaleDateString("id-ID")}`}
            />
          </div>
        </div>
        
        {/* Nominal Row */}
        <div className="flex items-center justify-between py-2 border-t border-b border-[#1e2d45]/50 my-2">
          <div>
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Sisa Piutang</div>
            <div className="text-base font-bold text-emerald-400 tracking-tight leading-none">
              {formatCurrency(sisa)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Total</div>
            <div className="text-xs font-semibold text-slate-300">
              {formatCurrency(total)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar no-export mt-1">
          {[
            { icon: Wallet, label: "Terima", color: "emerald", onClick: () => openBayarModal(item) },
            { icon: Plus, label: "Tambah", color: "orange", onClick: () => handleAdd(item) },
            { icon: History, label: "Histori", count: historyPembayaran.length, color: "indigo", onClick: () => setActiveHistoryId(activeHistoryId === item.id ? null : item.id) },
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

        {activeHistoryId === item.id && (
          <div className="mt-4 bg-[#0a0f1a] rounded-xl p-3 border border-[#1e2d45] space-y-2 animate-in fade-in slide-in-from-top-2 duration-200 no-export">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
              Riwayat Transaksi
            </div>
            {historyPembayaran.length > 0 ? (
              historyPembayaran.map((h) => (
                <div key={h.id} className="text-xs border-b border-[#1e2d45] pb-2.5 mb-2.5 last:border-0 last:pb-0 last:mb-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-slate-300 font-medium">{h.tanggal || "-"}</span>
                    <span className={`font-bold ${h.type === "tambah" ? "text-orange-400" : "text-emerald-400"}`}>
                      {h.type === "tambah" ? "+" : "-"} {formatCurrency(h.jumlah)}
                    </span>
                  </div>
                  <div className="text-slate-500 mb-2 italic">"{h.catatan || (h.type === "tambah" ? "Penambahan piutang" : "Penerimaan pembayaran")}"</div>
                  <div className="flex gap-3">
                    <button onClick={() => handleEditPembayaran(h)} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                    <button onClick={() => handleDeletePembayaran(h)} className="text-red-400 hover:text-red-300 font-medium">Hapus</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic py-2">Belum ada riwayat transaksi.</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const countStatus = {
    all: piutang.length,
    upcoming: piutang.filter((i) => getDueStatus(i) === "upcoming").length,
    due: piutang.filter((i) => getDueStatus(i) === "due").length,
    overdue: piutang.filter((i) => getDueStatus(i) === "overdue").length,
    lunas: piutang.filter((i) => getDueStatus(i) === "lunas").length,
  };

  const hitunganPerItemPiutang = piutang.map((item) => {
    const t = parseFloat(item.jumlah) || 0;
    const penambahan = getTotalPenambahan(item.id);
    const diterima = getTotalDiterima(item.id);
    const sisa = Math.max(t + penambahan - diterima, 0);
    return { id: item.id, total: t, penambahan, diterima, sisa };
  });

  const totalPiutangKeseluruhan = hitunganPerItemPiutang.reduce((sum, item) => sum + item.total, 0);
  const totalPenambahanKeseluruhan = hitunganPerItemPiutang.reduce((sum, item) => sum + item.penambahan, 0);
  const totalDiterimaKeseluruhan = hitunganPerItemPiutang.reduce((sum, item) => sum + item.diterima, 0);
  const totalSisaKeseluruhan = hitunganPerItemPiutang.reduce((sum, item) => sum + item.sisa, 0);

  const piutangAktif = hitunganPerItemPiutang.filter((item) => item.sisa > 0);
  const jumlahDataAktif = piutangAktif.length;
  const getHistoryPiutang = (piutangId) =>
    pembayaranPiutang
      .filter((item) => item.piutangId?.toString() === piutangId?.toString())
      .sort(
        (a, b) =>
          new Date(b.tanggal || b.createdAt || 0) -
          new Date(a.tanggal || a.createdAt || 0),
      );

  const openBayarModal = (item) => {
    setPayFormData({
      piutangId: item.id,
      namaOrang: item.namaOrang,
      jumlah: "",
      tanggal: new Date().toISOString().split("T")[0],
      catatan: "",
    });
    setShowPayModal(true);
  };

  const handlePayJumlahChange = (value) => {
    const raw = value.replace(/[^\d]/g, "");
    setPayFormData({ ...payFormData, jumlah: raw });
  };

  const getPayInputDisplay = () => {
    if (!payFormData.jumlah) return "";
    return Number(payFormData.jumlah).toLocaleString("id-ID");
  };

  const handleSubmitBayar = (e) => {
    e.preventDefault();
    const nominal = parseFloat(payFormData.jumlah) || 0;
    if (!payFormData.piutangId || nominal <= 0) {
      alert("Data pembayaran belum valid.");
      return;
    }
    const saved = LocalStorageService.appendRow(SHEETS.PEMBAYARAN_PIUTANG, {
      piutangId: payFormData.piutangId,
      namaOrang: payFormData.namaOrang,
      jumlah: nominal,
      tanggal: payFormData.tanggal,
      catatan: payFormData.catatan,
      type: "bayar",
    });

    // Sync ke Pemasukan (karena menerima pembayaran piutang = uang masuk)
    LocalStorageService.appendRow(SHEETS.PEMASUKAN, {
      nama: `Terima Piutang: ${payFormData.namaOrang}`,
      jumlah: nominal,
      tanggal: payFormData.tanggal,
      catatan: payFormData.catatan || "",
      sourceRef: saved.id,
      sourceType: "piutang_bayar"
    });
    setShowPayModal(false);
    loadData();
  };

  const handleEditPembayaran = (historyItem) => {
    setEditPayData({
      id: historyItem.id,
      piutangId: historyItem.piutangId,
      namaOrang: historyItem.namaOrang,
      jumlah: historyItem.jumlah,
      tanggal: historyItem.tanggal || new Date().toISOString().split("T")[0],
      catatan: historyItem.catatan || "",
    });
    setShowEditPayModal(true);
  };

  const handleUpdatePembayaran = (e) => {
    e.preventDefault();
    const nominal = parseFloat(editPayData.jumlah) || 0;
    if (!editPayData.id || nominal <= 0) {
      alert("Data pembayaran tidak valid.");
      return;
    }
    LocalStorageService.updateRow(SHEETS.PEMBAYARAN_PIUTANG, editPayData.id, {
      jumlah: nominal,
      tanggal: editPayData.tanggal,
      catatan: editPayData.catatan,
    });

    // Update synced Pemasukan/Pengeluaran
    const historyItem = pembayaranPiutang.find(p => p.id === editPayData.id);
    if (historyItem) {
      if (historyItem.type === "tambah") {
        const allPengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
        const pExisting = allPengeluaran.find(p => p.sourceRef?.toString() === editPayData.id?.toString() && p.sourceType === "piutang_tambah");
        if (pExisting) {
          LocalStorageService.updateRow(SHEETS.PENGELUARAN, pExisting.id, {
            nama: `Penambahan Piutang: ${editPayData.namaOrang}`,
            jumlah: nominal,
            tanggal: editPayData.tanggal,
            catatan: editPayData.catatan || ""
          });
        }
      } else {
        const allPemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
        const pExisting = allPemasukan.find(p => p.sourceRef?.toString() === editPayData.id?.toString() && p.sourceType === "piutang_bayar");
        if (pExisting) {
          LocalStorageService.updateRow(SHEETS.PEMASUKAN, pExisting.id, {
            nama: `Terima Piutang: ${editPayData.namaOrang}`,
            jumlah: nominal,
            tanggal: editPayData.tanggal,
            catatan: editPayData.catatan || ""
          });
        }
      }
    }

    setShowEditPayModal(false);
    loadData();
  };

  const handleDeletePembayaran = (historyItem) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Riwayat",
      message: `Hapus riwayat ${historyItem.type === "tambah" ? "penambahan" : "pembayaran"} ${formatCurrency(historyItem.jumlah)}?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(
          SHEETS.PEMBAYARAN_PIUTANG,
          historyItem.id,
        );

        if (historyItem.type === "tambah") {
          const allPengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
          const pExisting = allPengeluaran.find(p => p.sourceRef?.toString() === historyItem.id?.toString() && p.sourceType === "piutang_tambah");
          if (pExisting) LocalStorageService.deleteRow(SHEETS.PENGELUARAN, pExisting.id);
        } else {
          const allPemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
          const pExisting = allPemasukan.find(p => p.sourceRef?.toString() === historyItem.id?.toString() && p.sourceType === "piutang_bayar");
          if (pExisting) LocalStorageService.deleteRow(SHEETS.PEMASUKAN, pExisting.id);
        }

        loadData();
        setConfirmModal({ ...confirmModal, visible: false });
      },
    });
  };

  const handleAdd = (item) => {
    setAddFormData({
      piutangId: item.id,
      namaOrang: item.namaOrang,
      jumlah: "",
      tanggal: new Date().toISOString().split("T")[0],
      catatan: "",
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const nominal = parseFloat(addFormData.jumlah) || 0;
    if (!addFormData.piutangId || nominal <= 0) {
      alert("Data penambahan belum valid.");
      return;
    }
    const saved = LocalStorageService.appendRow(SHEETS.PEMBAYARAN_PIUTANG, {
      piutangId: addFormData.piutangId,
      namaOrang: addFormData.namaOrang,
      jumlah: nominal,
      tanggal: addFormData.tanggal,
      catatan: addFormData.catatan,
      type: "tambah",
    });

    // Sync ke Pengeluaran (karena memberi piutang = uang keluar)
    LocalStorageService.appendRow(SHEETS.PENGELUARAN, {
      nama: `Penambahan Piutang: ${addFormData.namaOrang}`,
      kategori: "Pinjaman",
      jumlah: nominal,
      tanggal: addFormData.tanggal,
      catatan: addFormData.catatan || "",
      sourceRef: saved.id,
      sourceType: "piutang_tambah"
    });
    setShowAddModal(false);
    loadData();
  };

  const handleAddJumlahChange = (value) => {
    const raw = value.replace(/[^\d]/g, "");
    setAddFormData({ ...addFormData, jumlah: raw });
  };

  const getAddInputDisplay = () => {
    if (!addFormData.jumlah) return "";
    return Number(addFormData.jumlah).toLocaleString("id-ID");
  };

  const getActiveFilterLabel = () => {
    if (filterStatus === "all") return "Semua filter";
    const statusLabel =
      filterStatus === "upcoming"
        ? "Akan Datang"
        : filterStatus === "due"
          ? "Jatuh Tempo Hari Ini"
          : filterStatus === "lunas"
            ? "Lunas"
            : "Terlewat";
    return `Status: ${statusLabel}`;
  };

  return (
    <div className="pb-24">
      <button
        onClick={() => setModalVisible(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-40 transition-all hover:scale-110 active:scale-95"
        title="Tambah Piutang Baru"
      >
        <Plus size={28} />
      </button>

      <div className="mb-4 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] text-emerald-100 mb-0.5 tracking-wider">
              Sisa Piutang
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalSisaKeseluruhan)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-white leading-tight">
              {jumlahDataAktif} Data
            </div>
            <div className="text-[10px] text-emerald-100 opacity-80 tracking-wider">
              Aktif Belum Lunas
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
          <div>
            <div className="text-[10px] text-emerald-100 mb-1 tracking-wider">
              Total Piutang
            </div>
            <div className="text-sm font-semibold text-white">
              {formatCurrency(totalPiutangKeseluruhan)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-emerald-100 mb-1 tracking-wider">
              Sudah Diterima
            </div>
            <div className="text-sm font-semibold text-white">
              {formatCurrency(totalDiterimaKeseluruhan)}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-blue-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            <span className="text-xs text-gray-400">
              {getActiveFilterLabel()}
            </span>
          </div>
          {showFilters ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
        {showFilters && (
          <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
            <div>
              <span className="text-[10px] text-gray-500 block mb-2 uppercase tracking-wide">
                Status Jatuh Tempo
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    id: "all",
                    label: "Semua",
                    icon: null,
                    color: "blue",
                    count: countStatus.all,
                  },
                  {
                    id: "upcoming",
                    label: "Akan Datang",
                    icon: Clock,
                    color: "green",
                    count: countStatus.upcoming,
                  },
                  {
                    id: "due",
                    label: "Hari Ini",
                    icon: CheckCircle,
                    color: "yellow",
                    count: countStatus.due,
                  },
                  {
                    id: "overdue",
                    label: "Terlewat",
                    icon: AlertCircle,
                    color: "red",
                    count: countStatus.overdue,
                  },
                  {
                    id: "lunas",
                    label: "Lunas",
                    icon: CheckCircle,
                    color: "emerald",
                    count: countStatus.lunas,
                  },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilterStatus(s.id)}
                    className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1.5 transition ${filterStatus === s.id ? `bg-${s.color}-600 text-white` : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
                  >
                    {s.icon && <s.icon size={12} />}
                    {s.label}{" "}
                    <span className="text-[9px] opacity-60 bg-black/20 px-1 rounded-full">
                      {s.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card-grid-responsive">
        {activePiutang.length > 0 ? (
          activePiutang.map((item) => renderPiutangCard(item))
        ) : (
          <div className="text-center py-12 bg-[#0c1220]/50 border border-dashed border-[#1e2d45] rounded-2xl w-full col-span-full">
            <p className="text-slate-500 text-sm">Tidak ada piutang aktif.</p>
          </div>
        )}
      </div>

        {lunasPiutang.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#1e2d45]">
            <button 
              onClick={() => setShowLunasHistory(!showLunasHistory)} 
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors w-full"
            >
              {showLunasHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Riwayat Piutang Selesai ({lunasPiutang.length})
            </button>
            {showLunasHistory && (
              <div className="mt-4 card-grid-responsive opacity-70 hover:opacity-100 transition-opacity">
                {lunasPiutang.map(item => renderPiutangCard(item))}
              </div>
            )}
          </div>
        )}

      {/* MODALS */}
      {modalVisible && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
          onClick={resetForm}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                {editMode ? "Edit" : "Tambah"} Piutang
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="p-4 space-y-4 overflow-y-auto"
            >
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Nama Orang
                </label>
                <input
                  type="text"
                  value={formData.namaOrang}
                  onChange={(e) =>
                    setFormData({ ...formData, namaOrang: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 transition-colors"
                  placeholder="Contoh: Budi"
                  required
                />
              </div>
              <div>
                <NumericInput
                  label="Jumlah Piutang"
                  value={formData.jumlah}
                  onChange={(val) => setFormData({ ...formData, jumlah: val ? Number(val) : "" })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Jatuh Tempo
                  </label>
                  <input
                    type="date"
                    value={formData.jatuhTempo}
                    onChange={(e) =>
                      setFormData({ ...formData, jatuhTempo: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Catatan
                </label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData({ ...formData, catatan: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 transition-colors h-20"
                  placeholder="Keterangan tambahan..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                {editMode ? "Simpan Perubahan" : "Simpan Piutang"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPayModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowPayModal(false)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                Terima Pembayaran
              </h2>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmitBayar} className="p-4 space-y-4">
              <p className="text-sm text-gray-400">
                Penerimaan dari:{" "}
                <span className="text-white font-bold">
                  {payFormData.namaOrang}
                </span>
              </p>
              <div>
                <NumericInput
                  label="Nominal Diterima"
                  value={payFormData.jumlah}
                  onChange={(val) => setPayFormData({ ...payFormData, jumlah: val })}
                  required
                />
              </div>
              <input
                type="date"
                value={payFormData.tanggal}
                onChange={(e) =>
                  setPayFormData({ ...payFormData, tanggal: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white"
                required
              />
              <textarea
                value={payFormData.catatan}
                onChange={(e) =>
                  setPayFormData({ ...payFormData, catatan: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white h-20"
                placeholder="Catatan penerimaan..."
              />
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
              >
                Simpan Penerimaan
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Tambah Piutang</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-4 space-y-4">
              <p className="text-sm text-gray-400">
                Penambahan untuk:{" "}
                <span className="text-white font-bold">
                  {addFormData.namaOrang}
                </span>
              </p>
              <div>
                <NumericInput
                  label="Nominal Tambah"
                  value={addFormData.jumlah}
                  onChange={(val) => setAddFormData({ ...addFormData, jumlah: val })}
                  required
                />
              </div>
              <input
                type="date"
                value={addFormData.tanggal}
                onChange={(e) =>
                  setAddFormData({ ...addFormData, tanggal: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white"
                required
              />
              <textarea
                value={addFormData.catatan}
                onChange={(e) =>
                  setAddFormData({ ...addFormData, catatan: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white h-20"
                placeholder="Catatan tambah..."
              />
              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-600/20"
              >
                Simpan Penambahan
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditPayModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowEditPayModal(false)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Edit Riwayat</h2>
              <button
                onClick={() => setShowEditPayModal(false)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdatePembayaran} className="p-4 space-y-4">
              <div>
                <NumericInput
                  label="Nominal"
                  value={editPayData.jumlah}
                  onChange={(val) => setEditPayData({ ...editPayData, jumlah: val })}
                  required
                />
              </div>
              <input
                type="date"
                value={editPayData.tanggal}
                onChange={(e) =>
                  setEditPayData({ ...editPayData, tanggal: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white"
                required
              />
              <textarea
                value={editPayData.catatan}
                onChange={(e) =>
                  setEditPayData({ ...editPayData, catatan: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white h-20"
                placeholder="Catatan edit..."
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20"
              >
                Simpan Perubahan
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
