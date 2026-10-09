import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Wallet,
  History,
  Pin,
  Calendar,
  Sparkles
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";
import NumericInput from "../components/NumericInput";
import ErrorMessage from "../components/ErrorMessage";
import { useToast } from "../context/ToastContext";
import CardActionMenu from "../components/CardActionMenu";
import ShareDialog from "../components/ShareDialog";
import { todayStr } from "../utils/dateUtils";
import { formatCurrency } from "../utils/format";
import { makeTogglePin, pinnedFirst } from "../utils/pinUtils";
import { hutangValidator, validatePaymentAmount } from "../utils/validators";

export default function Hutang() {
  const [hutang, setHutang] = useState([]);
  const [pembayaranHutang, setPembayaranHutang] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [payErrors, setPayErrors] = useState({});
  const [formData, setFormData] = useState({
    nama: "",
    tipe: "",
    jumlah: "",
    periode: "12",
    tanggal: todayStr(),
    catatan: "",
  });
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [showLunasHistory, setShowLunasHistory] = useState(false);
  const { showToast } = useToast();
  const [payFormData, setPayFormData] = useState({
    hutangId: "",
    namaHutang: "",
    jumlah: "",
    tanggal: todayStr(),
    catatan: "",
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    hutangId: "",
    namaHutang: "",
    jumlah: "",
    tanggal: todayStr(),
    catatan: "",
  });
  const [showEditPayModal, setShowEditPayModal] = useState(false);
  const [editPayData, setEditPayData] = useState({
    id: "",
    hutangId: "",
    namaHutang: "",
    jumlah: "",
    tanggal: "",
    catatan: "",
    type: "bayar",
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
    const data = LocalStorageService.readSheet(SHEETS.HUTANG);
    const pembayaran = LocalStorageService.readSheet(SHEETS.PEMBAYARAN_HUTANG);
    setHutang(data);
    setPembayaranHutang(pembayaran);
  };

  const syncCreatePemasukan = (hutangItem) => {
    const allPemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
    const existing = allPemasukan.find(p => p.sourceRef?.toString() === hutangItem.id?.toString() && p.sourceType === "hutang_buat");
    if (existing) {
      LocalStorageService.updateRow(SHEETS.PEMASUKAN, existing.id, {
        nama: `Terima Hutang: ${hutangItem.nama}`,
        jumlah: parseFloat(hutangItem.jumlah) || 0,
        tanggal: hutangItem.tanggal,
      });
    } else {
      LocalStorageService.appendRow(SHEETS.PEMASUKAN, {
        nama: `Terima Hutang: ${hutangItem.nama}`,
        jumlah: parseFloat(hutangItem.jumlah) || 0,
        tanggal: hutangItem.tanggal,
        catatan: "Dana pinjaman diterima (sinkron otomatis)",
        sourceRef: hutangItem.id,
        sourceType: "hutang_buat",
      });
    }
  };

  const monthlyIncome = useMemo(() => {
    const pemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
    const curMonth = todayStr().slice(0, 7);
    const thisMonth = pemasukan
      .filter((p) => p.tanggal?.startsWith(curMonth))
      .reduce((s, p) => s + (parseFloat(p.jumlah) || 0), 0);
    if (thisMonth > 0) return thisMonth;
    const total = pemasukan.reduce((s, p) => s + (parseFloat(p.jumlah) || 0), 0);
    return total > 0 ? total : 0;
  }, [pembayaranHutang, hutang]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = hutangValidator(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("Periksa kembali form isian!", "error");
      return;
    }
    setFormErrors({});
    const dataToSave = { ...formData, tipe: formData.tipe || "Lainnya" };
    if (editMode && editId) {
      const updated = LocalStorageService.updateRow(SHEETS.HUTANG, editId, dataToSave);
      syncCreatePemasukan(updated);
      showToast("Hutang berhasil diperbarui", "success");
    } else {
      const saved = LocalStorageService.appendRow(SHEETS.HUTANG, dataToSave);
      syncCreatePemasukan(saved);
      showToast("Hutang berhasil ditambahkan", "success");
    }
    resetForm();
    loadData();
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setEditId(item.id);
    setFormErrors({});
    setFormData({
      nama: item.nama,
      tipe: item.tipe,
      jumlah: item.jumlah,
      periode: item.periode || "12",
      tanggal: item.tanggal,
      catatan: item.catatan || "",
    });
    setModalVisible(true);
  };

  const handleDelete = (item) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Hutang",
      message: `Apakah "${item.nama}" mau dihapus? Semua riwayat juga akan dihapus.`,
      onConfirm: () => {
        const historyHutang = pembayaranHutang.filter((p) => p.hutangId?.toString() === item.id?.toString());
        historyHutang.forEach((hist) => {
          LocalStorageService.deleteRow(SHEETS.PEMBAYARAN_HUTANG, hist.id);
          if (hist.type === "tambah") {
            const allPemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
            const pExisting = allPemasukan.find(
              (p) => p.sourceRef?.toString() === hist.id?.toString() && p.sourceType === "hutang_tambah"
            );
            if (pExisting) LocalStorageService.deleteRow(SHEETS.PEMASUKAN, pExisting.id);
          } else {
            const allPengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
            const pExisting = allPengeluaran.find(
              (p) => p.sourceRef?.toString() === hist.id?.toString() && p.sourceType === "hutang_bayar"
            );
            if (pExisting) LocalStorageService.deleteRow(SHEETS.PENGELUARAN, pExisting.id);
          }
        });

        const allPemasukanCreate = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
        const createRow = allPemasukanCreate.find(
          (p) => p.sourceRef?.toString() === item.id?.toString() && p.sourceType === "hutang_buat"
        );
        if (createRow) LocalStorageService.deleteRow(SHEETS.PEMASUKAN, createRow.id);

        LocalStorageService.deleteRow(SHEETS.HUTANG, item.id);
        loadData();
        showToast("Hutang berhasil dihapus", "success");
        setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  const resetForm = () => {
    setModalVisible(false);
    setEditMode(false);
    setEditId(null);
    setFormErrors({});
    setFormData({
      nama: "",
      tipe: "",
      jumlah: "",
      periode: "12",
      tanggal: todayStr(),
      catatan: "",
    });
  };

  const getPaymentPlan = (item) => {
    const sisa = getSisa(item);
    if (sisa <= 0) return null;

    let remainingMonths = parseInt(item.periode, 10) || 12;
    if (item.tanggal && item.periode) {
      const start = new Date(item.tanggal);
      const now = new Date();
      const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      remainingMonths = Math.max(1, (parseInt(item.periode, 10) || 12) - Math.max(0, diffMonths));
    }

    const monthlyPayment = Math.ceil(sisa / remainingMonths);
    const isHighBurden = monthlyIncome > 0 && monthlyPayment > monthlyIncome * 0.5;
    const dtiPercent = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : 0;

    return {
      remainingMonths,
      monthlyPayment,
      isHighBurden,
      dtiPercent,
    };
  };

  const getJatuhTempoDate = (item) => {
    if (!item.tanggal || !item.periode) return null;
    const tgl = new Date(item.tanggal);
    tgl.setMonth(tgl.getMonth() + parseInt(item.periode, 10));
    return tgl;
  };

  const getTanggalLunas = () => {
    if (!formData.tanggal || !formData.periode) return "-";
    const tgl = new Date(formData.tanggal);
    tgl.setMonth(tgl.getMonth() + parseInt(formData.periode, 10));
    return tgl.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTotalDibayar = (hutangId) =>
    pembayaranHutang
      .filter(
        (item) =>
          item.hutangId?.toString() === hutangId?.toString() &&
          (!item.type || item.type === "bayar"),
      )
      .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);
  const getTotalPenambahan = (hutangId) =>
    pembayaranHutang
      .filter(
        (item) =>
          item.hutangId?.toString() === hutangId?.toString() &&
          item.type === "tambah",
      )
      .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);

  const getSisa = (item) => {
    const t = parseFloat(item.jumlah) || 0;
    const p = getTotalPenambahan(item.id);
    const d = getTotalDibayar(item.id);
    return Math.max(t + p - d, 0);
  };

  const getStatus = (item) => {
    if (getSisa(item) <= 0) return "lunas";
    const jatuhTempo = getJatuhTempoDate(item);
    if (!jatuhTempo) return "upcoming";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    jatuhTempo.setHours(0, 0, 0, 0);
    if (jatuhTempo < today) return "overdue";
    if (jatuhTempo.getTime() === today.getTime()) return "due";
    return "upcoming";
  };

  const handleTogglePin = makeTogglePin(SHEETS.HUTANG, loadData, showToast);

  const sortedData = [...hutang]
    .filter((item) => {
      if (filterType !== "all" && item.tipe !== filterType) return false;
      if (filterStatus !== "all") {
        const status = getStatus(item);
        if (status !== filterStatus) return false;
      }
      return true;
    })
    .sort((a, b) => {
      return (
        pinnedFirst(a, b) ||
        new Date(b.tanggal || b.createdAt || 0) - new Date(a.tanggal || a.createdAt || 0)
      );
    });

  const activeHutang = sortedData.filter((item) => getStatus(item) !== "lunas");
  const lunasHutang = sortedData.filter((item) => getStatus(item) === "lunas");

  const renderHutangCard = (item) => {
    const total = parseFloat(item.jumlah) || 0;
    const totalPenambahan = getTotalPenambahan(item.id);
    const totalDibayar = getTotalDibayar(item.id);
    const sisa = Math.max(total + totalPenambahan - totalDibayar, 0);
    const historyPembayaran = getHistoryHutang(item.id);
    const status = getStatus(item);
    
    let borderColor = "border-l-red-500";
    let statusIcon = <Clock size={12} className="text-red-500" />;
    let statusText = "Akan Datang";
    let statusBg = "bg-red-500/10 text-red-400";

    if (status === "lunas") {
      borderColor = "border-l-emerald-500";
      statusIcon = <CheckCircle size={12} className="text-emerald-500" />;
      statusText = "Lunas";
      statusBg = "bg-emerald-500/10 text-emerald-400";
    } else if (status === "overdue") {
      borderColor = "border-l-rose-500";
      statusIcon = <AlertCircle size={12} className="text-rose-500" />;
      statusText = "Terlambat";
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
                {item.nama}
              </h3>
              {item.isPinned && <Pin size={10} className="text-blue-400 fill-current" />}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider text-slate-400 border border-slate-700/50">
                {item.tipe}
              </span>
              <span>•</span>
              <span className="truncate">{getJatuhTempoDate(item)?.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) || "-"}</span>
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
              title={`Hutang: ${item.nama}`}
              caption={`${item.nama}
Sisa Hutang: ${formatCurrency(sisa)}
Total: ${formatCurrency(total)}
Jatuh Tempo: ${getJatuhTempoDate(item)?.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) || "-"}

${item.catatan ? `Catatan:\n${item.catatan}` : ""}`.trim()}
              dataString={`${item.nama} - Sisa: ${formatCurrency(sisa)} - Jatuh Tempo: ${getJatuhTempoDate(item)?.toLocaleDateString("id-ID")}`}
            />
          </div>
        </div>
        
        {/* Nominal Row */}
        <div className="flex items-center justify-between py-2 border-t border-b border-[#1e2d45]/50 my-2">
          <div>
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Sisa Hutang</div>
            <div className="text-base font-bold text-red-400 tracking-tight leading-none">
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

        {/* Task 2.2: Suggested Payment Plan */}
        {status !== "lunas" && (() => {
          const plan = getPaymentPlan(item);
          if (!plan) return null;
          return (
            <div
              className={`my-2 p-2.5 rounded-xl border text-xs ${
                plan.isHighBurden
                  ? "bg-rose-950/30 border-rose-500/30 text-rose-300"
                  : "bg-[#0a0f1a] border-[#1e2d45] text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles size={11} className={plan.isHighBurden ? "text-rose-400" : "text-blue-400"} />
                  Rencana Pelunasan
                </span>
                <span className="font-bold text-white">
                  {formatCurrency(plan.monthlyPayment)}
                  <span className="text-[10px] text-slate-400 font-normal"> / bln</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Sisa waktu: ~{plan.remainingMonths} bln</span>
                {plan.isHighBurden ? (
                  <span className="text-rose-400 font-bold">⚠️ &gt;50% Pemasukan</span>
                ) : (
                  <span className="text-emerald-400 font-medium">Beban Normal</span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar no-export mt-1">
          {[
            { icon: Wallet, label: "Bayar", color: "emerald", onClick: () => openBayarModal(item) },
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
                  <div className="text-slate-500 mb-2 italic">"{h.catatan || (h.type === "tambah" ? "Penambahan saldo" : "Pembayaran pinjaman")}"</div>
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

  const uniqueTypes = [...new Set(hutang.map((item) => item.tipe))];

  const countStatus = {
    all: hutang.length,
    upcoming: hutang.filter((i) => getStatus(i) === "upcoming").length,
    due: hutang.filter((i) => getStatus(i) === "due").length,
    overdue: hutang.filter((i) => getStatus(i) === "overdue").length,
    lunas: hutang.filter((i) => getStatus(i) === "lunas").length,
  };

  const hitunganPerItem = hutang.map(item => {
    const t = parseFloat(item.jumlah) || 0;
    const penambahan = getTotalPenambahan(item.id);
    const dibayar = getTotalDibayar(item.id);
    const sisa = Math.max(t + penambahan - dibayar, 0);
    return { id: item.id, total: t, penambahan, dibayar, sisa };
  });

  const hutangAktifUntukHitungan = hitunganPerItem.filter(h => h.sisa > 0);

  const totalHutangKeseluruhan = hitunganPerItem.reduce((sum, h) => sum + h.total, 0);
  const totalPenambahanKeseluruhan = hitunganPerItem.reduce((sum, h) => sum + h.penambahan, 0);
  const totalDibayarKeseluruhan = hitunganPerItem.reduce((sum, h) => sum + h.dibayar, 0);
  const totalSisaKeseluruhan = hitunganPerItem.reduce((sum, h) => sum + h.sisa, 0);
  const jumlahDataAktif = hutangAktifUntukHitungan.length;
  const getHistoryHutang = (hutangId) =>
    pembayaranHutang
      .filter((item) => item.hutangId?.toString() === hutangId?.toString())
      .sort(
        (a, b) =>
          new Date(b.tanggal || b.createdAt || 0) -
          new Date(a.tanggal || a.createdAt || 0),
      );

  const openBayarModal = (item) => {
    setPayFormData({
      hutangId: item.id,
      namaHutang: item.nama,
      jumlah: "",
      tanggal: todayStr(),
      catatan: "",
    });
    setShowPayModal(true);
  };

  const handleSubmitBayar = (e) => {
    e.preventDefault();
    const nominal = parseFloat(payFormData.jumlah) || 0;
    if (!payFormData.hutangId || nominal <= 0) {
      showToast("Data pembayaran belum valid.", "error");
      return;
    }
    const target = hutang.find(h => h.id?.toString() === payFormData.hutangId?.toString());
    const sisa = target ? getSisa(target) : 0;
    if (nominal > sisa) {
      showToast(`Nominal melebihi sisa hutang (${formatCurrency(sisa)}).`, "error");
      return;
    }
    const saved = LocalStorageService.appendRow(SHEETS.PEMBAYARAN_HUTANG, {
      hutangId: payFormData.hutangId,
      namaHutang: payFormData.namaHutang,
      jumlah: nominal,
      tanggal: payFormData.tanggal,
      catatan: payFormData.catatan,
      type: "bayar",
    });
    
    // Masuk ke pengeluaran
    LocalStorageService.appendRow(SHEETS.PENGELUARAN, {
      nama: `Bayar Hutang: ${payFormData.namaHutang}`,
      kategori: "Bayar Hutang",
      jumlah: nominal,
      tanggal: payFormData.tanggal,
      catatan: payFormData.catatan || "",
      sourceRef: saved.id,
      sourceType: "hutang_bayar"
    });

    setShowPayModal(false);
    loadData();
  };

  const handleEditPembayaran = (historyItem) => {
    setEditPayData({
      id: historyItem.id,
      hutangId: historyItem.hutangId,
      namaHutang: historyItem.namaHutang,
      jumlah: historyItem.jumlah,
      tanggal: historyItem.tanggal || todayStr(),
      catatan: historyItem.catatan || "",
      type: historyItem.type || "bayar",
    });
    setShowEditPayModal(true);
  };

  const handleUpdatePembayaran = (e) => {
    e.preventDefault();
    const nominal = parseFloat(editPayData.jumlah) || 0;
    if (!editPayData.id || nominal <= 0) {
      showToast("Data pembayaran tidak valid.", "error");
      return;
    }
    if (editPayData.type !== "tambah") {
      const target = hutang.find(h => h.id?.toString() === editPayData.hutangId?.toString());
      const old = pembayaranHutang.find(p => p.id?.toString() === editPayData.id?.toString());
      const sisaLama = target ? getSisa(target) : 0;
      if (nominal > sisaLama + (parseFloat(old?.jumlah) || 0)) {
        showToast(`Nominal melebihi sisa hutang (${formatCurrency(sisaLama + (parseFloat(old?.jumlah) || 0))}).`, "error");
        return;
      }
    }
    LocalStorageService.updateRow(SHEETS.PEMBAYARAN_HUTANG, editPayData.id, {
      jumlah: nominal,
      tanggal: editPayData.tanggal,
      catatan: editPayData.catatan,
    });

    // Update synced Pemasukan/Pengeluaran
    const historyItem = pembayaranHutang.find(p => p.id === editPayData.id);
    if (historyItem) {
      if (historyItem.type === "tambah") {
        const allPemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
        const pExisting = allPemasukan.find(p => p.sourceRef?.toString() === editPayData.id?.toString() && p.sourceType === "hutang_tambah");
        if (pExisting) {
          LocalStorageService.updateRow(SHEETS.PEMASUKAN, pExisting.id, {
            nama: `Penambahan Hutang: ${editPayData.namaHutang}`,
            jumlah: nominal,
            tanggal: editPayData.tanggal,
            catatan: editPayData.catatan || ""
          });
        }
      } else {
        const allPengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
        const pExisting = allPengeluaran.find(p => p.sourceRef?.toString() === editPayData.id?.toString() && p.sourceType === "hutang_bayar");
        if (pExisting) {
          LocalStorageService.updateRow(SHEETS.PENGELUARAN, pExisting.id, {
            nama: `Bayar Hutang: ${editPayData.namaHutang}`,
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
        LocalStorageService.deleteRow(SHEETS.PEMBAYARAN_HUTANG, historyItem.id);

        if (historyItem.type === "tambah") {
          const allPemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
          const pExisting = allPemasukan.find(p => p.sourceRef?.toString() === historyItem.id?.toString() && p.sourceType === "hutang_tambah");
          if (pExisting) LocalStorageService.deleteRow(SHEETS.PEMASUKAN, pExisting.id);
        } else {
          const allPengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
          const pExisting = allPengeluaran.find(p => p.sourceRef?.toString() === historyItem.id?.toString() && p.sourceType === "hutang_bayar");
          if (pExisting) LocalStorageService.deleteRow(SHEETS.PENGELUARAN, pExisting.id);
        }

        loadData();
        setConfirmModal(p => ({ ...p, visible: false }));
      },
    });
  };

  const handleAdd = (item) => {
    setAddFormData({
      hutangId: item.id,
      namaHutang: item.nama,
      jumlah: "",
      tanggal: todayStr(),
      catatan: "",
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const nominal = parseFloat(addFormData.jumlah) || 0;
    if (!addFormData.hutangId || nominal <= 0) {
      showToast("Data penambahan belum valid.", "error");
      return;
    }
    const saved = LocalStorageService.appendRow(SHEETS.PEMBAYARAN_HUTANG, {
      hutangId: addFormData.hutangId,
      namaHutang: addFormData.namaHutang,
      jumlah: nominal,
      tanggal: addFormData.tanggal,
      catatan: addFormData.catatan,
      type: "tambah",
    });

    // Masuk ke pemasukan
    LocalStorageService.appendRow(SHEETS.PEMASUKAN, {
      nama: `Penambahan Hutang: ${addFormData.namaHutang}`,
      jumlah: nominal,
      tanggal: addFormData.tanggal,
      catatan: addFormData.catatan || "",
      sourceRef: saved.id,
      sourceType: "hutang_tambah"
    });

    setShowAddModal(false);
    loadData();
  };

  const getActiveFilterLabel = () => {
    if (filterType === "all" && filterStatus === "all") return "Semua filter";
    const parts = [];
    if (filterType !== "all") parts.push(`Tipe: ${filterType}`);
    if (filterStatus !== "all") {
      const statusLabel =
        filterStatus === "upcoming"
          ? "Akan Datang"
          : filterStatus === "due"
            ? "Jatuh Tempo Hari Ini"
            : filterStatus === "lunas"
              ? "Lunas"
              : "Terlambat";
      parts.push(`Status: ${statusLabel}`);
    }
    return parts.join(" • ");
  };

  return (
    <div className="pb-24">
      {/* Minimalist Floating Action Button */}
      <button
        onClick={() => setModalVisible(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-40 transition-all hover:scale-110 active:scale-95"
        title="Tambah Hutang Baru"
      >
        <Plus size={28} />
      </button>

      <div className="mb-4 bg-gradient-to-r from-red-600 to-rose-500 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] text-red-100 mb-0.5 tracking-wider uppercase">
              Sisa Hutang
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalSisaKeseluruhan)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-white leading-tight">
              {jumlahDataAktif} Data
            </div>
            <div className="text-[10px] text-red-100 opacity-80 tracking-wider">
              Aktif Belum Lunas
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
          <div>
            <div className="text-[10px] text-red-100 mb-1 tracking-wider">
              Total Pinjaman
            </div>
            <div className="text-sm font-semibold text-white">
              {formatCurrency(totalHutangKeseluruhan)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-red-100 mb-1 tracking-wider">
              Sudah Dibayar
            </div>
            <div className="text-sm font-semibold text-white">
              {formatCurrency(totalDibayarKeseluruhan)}
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
                    activeBg: "bg-blue-600",
                    count: countStatus.all,
                  },
                  {
                    id: "upcoming",
                    label: "Akan Datang",
                    icon: Clock,
                    activeBg: "bg-green-600",
                    count: countStatus.upcoming,
                  },
                  {
                    id: "due",
                    label: "Hari Ini",
                    icon: CheckCircle,
                    activeBg: "bg-yellow-600",
                    count: countStatus.due,
                  },
                  {
                    id: "overdue",
                    label: "Terlambat",
                    icon: AlertCircle,
                    activeBg: "bg-red-600",
                    count: countStatus.overdue,
                  },
                  {
                    id: "lunas",
                    label: "Lunas",
                    icon: CheckCircle,
                    activeBg: "bg-emerald-600",
                    count: countStatus.lunas,
                  },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilterStatus(s.id)}
                    className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1.5 transition ${filterStatus === s.id ? `${s.activeBg} text-white` : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
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
            {uniqueTypes.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-500 block mb-2 uppercase tracking-wide">
                  Tipe Hutang
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-2.5 py-1 text-xs rounded-full transition ${filterType === "all" ? "bg-blue-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
                  >
                    Semua
                  </button>
                  {uniqueTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`px-2.5 py-1 text-xs rounded-full transition ${filterType === t ? "bg-blue-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-grid-responsive">
        {activeHutang.length > 0 ? (
          activeHutang.map((item) => renderHutangCard(item))
        ) : (
          <div className="text-center py-12 bg-[#0c1220]/50 border border-dashed border-[#1e2d45] rounded-2xl">
            <p className="text-slate-500 text-sm">Tidak ada hutang aktif.</p>
          </div>
        )}
      </div>

        {lunasHutang.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#1e2d45]">
            <button 
              onClick={() => setShowLunasHistory(!showLunasHistory)} 
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors w-full"
            >
              {showLunasHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Riwayat Hutang Lunas ({lunasHutang.length})
            </button>
            {showLunasHistory && (
              <div className="mt-4 card-grid-responsive opacity-70 hover:opacity-100 transition-opacity">
                {lunasHutang.map(item => renderHutangCard(item))}
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
                {editMode ? "Edit" : "Tambah"} Hutang
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
              {formData.jumlah && formData.periode > 0 && (
                <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs text-blue-200">
                  <div className="flex justify-between items-center">
                    <span>Estimasi Saran Cicilan:</span>
                    <strong className="text-white text-sm">
                      {formatCurrency(
                        Math.ceil(parseFloat(formData.jumlah) / Math.max(1, parseInt(formData.periode, 10)))
                      )}
                      <span className="text-[10px] text-slate-400 font-normal"> / bln</span>
                    </strong>
                  </div>
                  <div className="text-[10px] text-blue-300/70 mt-1 flex justify-between">
                    <span>Jatuh Tempo: {getTanggalLunas()}</span>
                    <span>Tenor: {formData.periode} Bulan</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Nama Hutang *
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => {
                    setFormData({ ...formData, nama: e.target.value });
                    if (formErrors.nama) setFormErrors({ ...formErrors, nama: null });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 transition-colors"
                  placeholder="Contoh: Cicilan Motor"
                  required
                />
                <ErrorMessage message={formErrors.nama} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <NumericInput
                    label="Jumlah *"
                    value={formData.jumlah}
                    onChange={(val) => {
                      setFormData({ ...formData, jumlah: val ? Number(val) : "" });
                      if (formErrors.jumlah) setFormErrors({ ...formErrors, jumlah: null });
                    }}
                    required
                  />
                  <ErrorMessage message={formErrors.jumlah} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Tipe
                  </label>
                  <input
                    type="text"
                    value={formData.tipe}
                    onChange={(e) =>
                      setFormData({ ...formData, tipe: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 transition-colors"
                    placeholder="Pribadi/Kredit/Bank"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Periode (Bulan)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.periode}
                    onChange={(e) => {
                      setFormData({ ...formData, periode: e.target.value });
                      if (formErrors.periode) setFormErrors({ ...formErrors, periode: null });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 transition-colors"
                  />
                  <ErrorMessage message={formErrors.periode} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Tanggal Mulai *
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => {
                      setFormData({ ...formData, tanggal: e.target.value });
                      if (formErrors.tanggal) setFormErrors({ ...formErrors, tanggal: null });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 transition-colors"
                    required
                  />
                  <ErrorMessage message={formErrors.tanggal} />
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
                {editMode ? "Simpan Perubahan" : "Simpan Hutang"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPayModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
          onClick={() => {
            setShowPayModal(false);
            setPayErrors({});
          }}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Bayar Hutang</h2>
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setPayErrors({});
                }}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmitBayar} className="p-4 space-y-4">
              <p className="text-sm text-gray-400">
                Pembayaran untuk:{" "}
                <span className="text-white font-bold">
                  {payFormData.namaHutang}
                </span>
              </p>
              <div>
                <NumericInput
                  label="Nominal Bayar *"
                  value={payFormData.jumlah}
                  onChange={(val) => {
                    setPayFormData({ ...payFormData, jumlah: val });
                    if (payErrors.jumlah) setPayErrors({ ...payErrors, jumlah: null });
                  }}
                  required
                />
                <ErrorMessage message={payErrors.jumlah} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Tanggal Bayar *
                </label>
                <input
                  type="date"
                  value={payFormData.tanggal}
                  onChange={(e) =>
                    setPayFormData({ ...payFormData, tanggal: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white"
                  required
                />
              </div>
              <textarea
                value={payFormData.catatan}
                onChange={(e) =>
                  setPayFormData({ ...payFormData, catatan: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white h-20"
                placeholder="Catatan bayar..."
              />
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
              >
                Simpan Pembayaran
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
              <h2 className="text-lg font-bold text-white">Tambah Hutang</h2>
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
                  {addFormData.namaHutang}
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
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />
      {/* Share Dialog */}
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
