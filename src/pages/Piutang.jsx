import { useState, useEffect } from "react";
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
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";

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
  const [calcInput, setCalcInput] = useState("");
  const [showCalc, setShowCalc] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
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

  useEffect(() => {
    loadData();
  }, []);

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
    setCalcInput(formatNumber(item.jumlah));
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
    setCalcInput("");
    setShowCalc(false);
  };

  const formatCurrency = (num) => {
    if (!num) return "Rp 0";
    return "Rp " + Number(num).toLocaleString("id-ID");
  };

  const formatNumber = (num) => {
    if (!num) return "";
    return Number(num).toLocaleString("id-ID");
  };

  const parseLocaleNumber = (str) => {
    if (!str) return 0;
    return Number(str.replace(/\./g, ""));
  };

  const handleJumlahChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    const num = raw ? parseInt(raw, 10) : 0;
    setFormData({ ...formData, jumlah: num });
    setCalcInput(num ? num.toLocaleString("id-ID") : "");
  };

  const safeEvaluate = (input) => {
    try {
      const expr = input.replace(/\./g, "").replace(/[^-()\d/*+.]/g, "");
      if (!expr) return 0;
      const result = new Function(`return ${expr}`)();
      return isNaN(result) ? 0 : result;
    } catch (e) {
      return 0;
    }
  };

  const handleCalcButton = (val) => {
    if (val === "C") {
      setCalcInput("");
      setFormData({ ...formData, jumlah: 0 });
    } else if (val === "←") {
      const newInput = calcInput.slice(0, -1);
      setCalcInput(newInput);
      const num = parseLocaleNumber(newInput);
      setFormData({ ...formData, jumlah: num });
    } else if (val === "=") {
      const result = safeEvaluate(calcInput);
      setCalcInput(result.toLocaleString("id-ID"));
      setFormData({ ...formData, jumlah: result });
    } else {
      const newInput = calcInput + val;
      setCalcInput(newInput);
      const expr = newInput.replace(/\./g, "").replace(/[^-()\d/*+.]/g, "");
      if (!isNaN(Number(expr))) {
        setFormData({ ...formData, jumlah: Number(expr) });
      }
    }
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

  const sortedData = [...piutang]
    .filter((item) => {
      if (filterStatus === "all") return true;
      const status = getDueStatus(item);
      return status === filterStatus;
    })
    .sort((a, b) => new Date(a.jatuhTempo) - new Date(b.jatuhTempo));

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

      <div className="space-y-3">
        {sortedData.length > 0 ? (
          sortedData.map((item) => {
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
              borderColor = "border-l-emerald-600";
              statusIcon = <AlertCircle size={12} className="text-emerald-500" />;
              statusText = "Terlewat";
              statusBg = "bg-emerald-600/20 text-emerald-400";
            } else if (status === "due") {
              borderColor = "border-l-emerald-500";
              statusIcon = (
                <CheckCircle size={12} className="text-emerald-500" />
              );
              statusText = "Jatuh Tempo Hari Ini";
              statusBg = "bg-emerald-500/10 text-emerald-400";
            }

            return (
              <div
                key={item.id}
                className={`bg-slate-800 rounded-xl p-3 border border-slate-700 border-l-4 ${borderColor} shadow-sm`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-bold text-white">
                    {item.namaOrang}
                  </h3>
                  <div
                    className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBg}`}
                  >
                    {statusIcon}
                    {statusText}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">{item.tanggal}</span>
                  <span className="text-lg font-bold text-green-500">
                    {formatCurrency(sisa)}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 mb-1">
                  Jatuh Tempo: {item.jatuhTempo}
                </div>
                <div className="text-[10px] text-gray-400 mb-3 pb-3 border-b border-slate-700/50">
                  Total: {formatCurrency(total)} • Diterima:{" "}
                  {formatCurrency(totalDiterima)}
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    {
                      icon: Wallet,
                      label: "Terima",
                      color: "emerald",
                      onClick: () => openBayarModal(item),
                    },
                    {
                      icon: Plus,
                      label: "Tambah",
                      color: "orange",
                      onClick: () => handleAdd(item),
                    },
                    {
                      icon: History,
                      label: `Histori${historyPembayaran.length > 0 ? ` (${historyPembayaran.length})` : ""}`,
                      color: "violet",
                      onClick: () =>
                        setActiveHistoryId(
                          activeHistoryId === item.id ? null : item.id,
                        ),
                    },
                    {
                      icon: Pencil,
                      label: "Edit",
                      color: "blue",
                      onClick: () => handleEdit(item),
                    },
                    {
                      icon: Trash2,
                      label: "Hapus",
                      color: "red",
                      onClick: () => handleDelete(item),
                    },
                  ].map((btn) => {
                    // Kamus warna statis agar Tailwind bisa membaca warnanya saat di-deploy
                    const colors = {
                      emerald:
                        "bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/20",
                      orange:
                        "bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border-orange-500/20",
                      violet:
                        "bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border-violet-500/20",
                      blue: "bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/20",
                      red: "bg-red-600/10 hover:bg-red-600/20 text-red-400 border-red-500/20",
                    };

                    const colorClass = colors[btn.color] || colors.blue;

                    return (
                      <button
                        key={btn.label}
                        onClick={btn.onClick}
                        // Desain diubah menjadi menyamping (flex items-center) dan teks tidak turun ke bawah (whitespace-nowrap)
                        className={`${colorClass} text-[9px] sm:text-[10px] py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-colors border w-full`}
                      >
                        <btn.icon size={12} />
                        <span className="whitespace-nowrap">{btn.label}</span>
                      </button>
                    );
                  })}
                </div>

                {activeHistoryId === item.id && (
                  <div className="mt-3 bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/50 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                      Riwayat Transaksi
                    </div>
                    {historyPembayaran.length > 0 ? (
                      historyPembayaran.map((h) => (
                        <div
                          key={h.id}
                          className="text-[11px] border-b border-slate-700/50 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-gray-300 font-medium">
                              {h.tanggal || "-"}
                            </span>
                            <span
                              className={`font-bold ${h.type === "tambah" ? "text-orange-400" : "text-emerald-400"}`}
                            >
                              {h.type === "tambah" ? "+" : "-"}{" "}
                              {formatCurrency(h.jumlah)}
                            </span>
                          </div>
                          <div className="text-gray-500 mb-1.5 italic">
                            "
                            {h.catatan ||
                              (h.type === "tambah"
                                ? "Penambahan piutang"
                                : "Penerimaan pembayaran")}
                            "
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPembayaran(h)}
                              className="text-blue-400 hover:text-blue-300 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePembayaran(h)}
                              className="text-red-400 hover:text-red-300 font-medium"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-gray-500 italic py-2">
                        Belum ada riwayat transaksi.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-slate-800/20 border border-dashed border-slate-700 rounded-2xl">
            <p className="text-gray-500 text-sm">
              Tidak ada piutang ditemukan.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => setModalVisible(true)}
        className="fixed bottom-24 md:bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-600/20 z-40 transition-transform active:scale-95"
      >
        <Plus size={28} />
      </button>

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
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Jumlah Piutang (Rp)
                </label>
                <input
                  type="text"
                  value={calcInput}
                  onChange={handleJumlahChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 transition-colors"
                  placeholder="0"
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
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Nominal Diterima
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={getPayInputDisplay()}
                    onChange={(e) => handlePayJumlahChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-9 text-sm text-white focus:border-emerald-500 transition-colors"
                    placeholder="0"
                    required
                  />
                </div>
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
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Nominal Tambah
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={getAddInputDisplay()}
                    onChange={(e) => handleAddJumlahChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-9 text-sm text-white focus:border-orange-500 transition-colors"
                    placeholder="0"
                    required
                  />
                </div>
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
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Nominal
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={
                      editPayData.jumlah
                        ? Number(editPayData.jumlah).toLocaleString("id-ID")
                        : ""
                    }
                    onChange={(e) =>
                      setEditPayData({
                        ...editPayData,
                        jumlah: e.target.value.replace(/[^\d]/g, ""),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-9 text-sm text-white focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
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
    </div>
  );
}
