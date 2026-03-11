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

export default function Hutang() {
  const [hutang, setHutang] = useState([]);
  const [pembayaranHutang, setPembayaranHutang] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false); // State untuk menampilkan/menyembunyikan filter
  const [formData, setFormData] = useState({
    nama: "",
    tipe: "",
    jumlah: "",
    periode: "12",
    tanggal: new Date().toISOString().split("T")[0],
    catatan: "",
  });
  const [calcInput, setCalcInput] = useState("");
  const [showCalc, setShowCalc] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [payFormData, setPayFormData] = useState({
    hutangId: "",
    namaHutang: "",
    jumlah: "",
    tanggal: new Date().toISOString().split("T")[0],
    catatan: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = LocalStorageService.readSheet(SHEETS.HUTANG);
    const pembayaran = LocalStorageService.readSheet(SHEETS.PEMBAYARAN_HUTANG);
    setHutang(data);
    setPembayaranHutang(pembayaran);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama || !formData.jumlah) {
      alert("Nama dan jumlah harus diisi!");
      return;
    }
    const dataToSave = { ...formData, tipe: formData.tipe || "Lainnya" };
    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.HUTANG, editId, dataToSave);
    } else {
      LocalStorageService.appendRow(SHEETS.HUTANG, dataToSave);
    }
    resetForm();
    loadData();
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setEditId(item.id);
    setFormData({
      nama: item.nama,
      tipe: item.tipe,
      jumlah: item.jumlah,
      periode: item.periode,
      tanggal: item.tanggal,
      catatan: item.catatan || "",
    });
    setCalcInput(formatNumber(item.jumlah));
    setModalVisible(true);
  };

  const handleDelete = (item) => {
    if (confirm(`Hapus "${item.nama}"?`)) {
      LocalStorageService.deleteRow(SHEETS.HUTANG, item.id);
      loadData();
    }
  };

  const resetForm = () => {
    setModalVisible(false);
    setEditMode(false);
    setEditId(null);
    setFormData({
      nama: "",
      tipe: "",
      jumlah: "",
      periode: "12",
      tanggal: new Date().toISOString().split("T")[0],
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
      try {
        const expr = calcInput.replace(/\./g, "").replace(/[^-()\d/*+.]/g, "");
        // eslint-disable-next-line no-eval
        const result = eval(expr);
        if (!isNaN(result)) {
          setCalcInput(result.toLocaleString("id-ID"));
          setFormData({ ...formData, jumlah: result });
        }
      } catch (e) {
        // ignore
      }
    } else {
      const newInput = calcInput + val;
      setCalcInput(newInput);
      if (!isNaN(parseLocaleNumber(newInput))) {
        const num = parseLocaleNumber(newInput);
        setFormData({ ...formData, jumlah: num });
      }
    }
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

  const getStatus = (item) => {
    const jatuhTempo = getJatuhTempoDate(item);
    if (!jatuhTempo) return "upcoming";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    jatuhTempo.setHours(0, 0, 0, 0);
    if (jatuhTempo < today) return "overdue";
    if (jatuhTempo.getTime() === today.getTime()) return "due";
    return "upcoming";
  };

  const filteredData = hutang.filter((item) => {
    if (filterType !== "all" && item.tipe !== filterType) return false;
    if (filterStatus !== "all") {
      const status = getStatus(item);
      if (status !== filterStatus) return false;
    }
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const dateA = getJatuhTempoDate(a) || new Date(0);
    const dateB = getJatuhTempoDate(b) || new Date(0);
    return dateA - dateB;
  });

  const uniqueTypes = [...new Set(hutang.map((item) => item.tipe))];

  const countStatus = {
    all: hutang.length,
    upcoming: hutang.filter((i) => getStatus(i) === "upcoming").length,
    due: hutang.filter((i) => getStatus(i) === "due").length,
    overdue: hutang.filter((i) => getStatus(i) === "overdue").length,
  };

  const resetStatusFilter = () => setFilterStatus("all");
  const resetTypeFilter = () => setFilterType("all");

  const getTotalDibayar = (hutangId) =>
    pembayaranHutang
      .filter((item) => item.hutangId?.toString() === hutangId?.toString())
      .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);

  const getHistoryHutang = (hutangId) =>
    pembayaranHutang
      .filter((item) => item.hutangId?.toString() === hutangId?.toString())
      .sort((a, b) => new Date(b.tanggal || b.createdAt || 0) - new Date(a.tanggal || a.createdAt || 0));

  const openBayarModal = (item) => {
    setPayFormData({
      hutangId: item.id,
      namaHutang: item.nama,
      jumlah: "",
      tanggal: new Date().toISOString().split("T")[0],
      catatan: "",
    });
    setShowPayModal(true);
  };

  const handleSubmitBayar = (e) => {
    e.preventDefault();
    const nominal = parseFloat(payFormData.jumlah) || 0;
    if (!payFormData.hutangId || nominal <= 0) {
      alert("Data pembayaran belum valid.");
      return;
    }

    LocalStorageService.appendRow(SHEETS.PEMBAYARAN_HUTANG, {
      hutangId: payFormData.hutangId,
      namaHutang: payFormData.namaHutang,
      jumlah: nominal,
      tanggal: payFormData.tanggal,
      catatan: payFormData.catatan,
    });

    setShowPayModal(false);
    loadData();
  };

  // Mendapatkan label filter aktif
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
            : "Terlambat";
      parts.push(`Status: ${statusLabel}`);
    }
    return parts.join(" • ");
  };

  return (
    <div>
      {/* Filter Bar - Collapsible */}
      <div className="mb-4 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        {/* Header Filter - selalu terlihat */}
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition"
          onClick={() => setShowFilters(!showFilters)}>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-blue-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            {filterType !== "all" || filterStatus !== "all" ? (
              <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full">
                {getActiveFilterLabel()}
              </span>
            ) : (
              <span className="text-xs text-gray-500">Semua hutang</span>
            )}
          </div>
          <button className="p-1 text-gray-400 hover:text-white">
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Konten Filter (muncul jika showFilters true) */}
        {showFilters && (
          <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
            {/* Filter Status */}
            <div>
              <span className="text-xs text-gray-400 block mb-2">
                Jatuh Tempo:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1 ${
                    filterStatus === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}>
                  Semua{" "}
                  <span className="text-[10px] bg-white/20 px-1 rounded-full">
                    {countStatus.all}
                  </span>
                </button>
                <button
                  onClick={() => setFilterStatus("upcoming")}
                  className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1 ${
                    filterStatus === "upcoming"
                      ? "bg-green-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}>
                  <Clock size={12} /> Akan Datang{" "}
                  <span className="text-[10px] bg-white/20 px-1 rounded-full">
                    {countStatus.upcoming}
                  </span>
                </button>
                <button
                  onClick={() => setFilterStatus("due")}
                  className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1 ${
                    filterStatus === "due"
                      ? "bg-yellow-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}>
                  <CheckCircle size={12} /> Hari Ini{" "}
                  <span className="text-[10px] bg-white/20 px-1 rounded-full">
                    {countStatus.due}
                  </span>
                </button>
                <button
                  onClick={() => setFilterStatus("overdue")}
                  className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1 ${
                    filterStatus === "overdue"
                      ? "bg-red-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}>
                  <AlertCircle size={12} /> Terlambat{" "}
                  <span className="text-[10px] bg-white/20 px-1 rounded-full">
                    {countStatus.overdue}
                  </span>
                </button>
              </div>
            </div>

            {/* Filter Tipe */}
            {uniqueTypes.length > 0 && (
              <div>
                <span className="text-xs text-gray-400 block mb-2">Tipe:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={resetTypeFilter}
                    className={`px-2.5 py-1 text-xs rounded-full ${
                      filterType === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}>
                    Semua
                  </button>
                  {uniqueTypes.map((tipe) => (
                    <button
                      key={tipe}
                      onClick={() => setFilterType(tipe)}
                      className={`px-2.5 py-1 text-xs rounded-full ${
                        filterType === tipe
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                      }`}>
                      {tipe}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tombol Reset jika ada filter aktif */}
            {(filterType !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => {
                  resetTypeFilter();
                  resetStatusFilter();
                }}
                className="w-full mt-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 rounded-lg flex items-center justify-center gap-1">
                <X size={14} /> Reset Semua Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Daftar Hutang */}
      <div className="space-y-3">
        {sortedData.length > 0 ? (
          sortedData.map((item, i) => {
            const total = parseFloat(item.jumlah) || 0;
            const totalDibayar = getTotalDibayar(item.id);
            const sisa = Math.max(total - totalDibayar, 0);
            const historyPembayaran = getHistoryHutang(item.id);
            const status = getStatus(item);
            let borderColor = "border-red-500";
            let statusIcon = null;
            let statusText = "";
            let statusBg = "";

            if (status === "overdue") {
              borderColor = "border-red-500";
              statusIcon = <AlertCircle size={12} className="text-red-500" />;
              statusText = "Terlambat";
              statusBg = "bg-red-500/10 text-red-400";
            } else if (status === "due") {
              borderColor = "border-yellow-500";
              statusIcon = (
                <CheckCircle size={12} className="text-yellow-500" />
              );
              statusText = "Jatuh Tempo Hari Ini";
              statusBg = "bg-yellow-500/10 text-yellow-400";
            } else {
              borderColor = "border-green-500";
              statusIcon = <Clock size={12} className="text-green-500" />;
              statusText = "Akan Datang";
              statusBg = "bg-green-500/10 text-green-400";
            }

            return (
              <div
                key={i}
                className={`bg-slate-800 rounded-xl p-3 border-l-4 ${borderColor}`}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-base font-bold">{item.nama}</h3>
                  <div
                    className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${statusBg}`}>
                    {statusIcon}
                    <span>{statusText}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                  <div
                    className="text-xs text-gray-400 cursor-pointer hover:text-blue-400 transition"
                    onClick={() => setFilterType(item.tipe)}>
                    Tipe:{" "}
                    <span className="text-blue-400 underline underline-offset-2">
                      {item.tipe}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-red-500">
                    {formatCurrency(sisa)}
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 mb-1">
                  Periode: {item.periode} bln • {item.tanggal}
                </div>
                <div className="text-[10px] text-gray-400 mb-2">
                  Total: {formatCurrency(total)} • Dibayar: {formatCurrency(totalDibayar)}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openBayarModal(item)}
                    className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <Wallet size={12} /> Bayar
                  </button>
                  <button
                    onClick={() => setActiveHistoryId(activeHistoryId === item.id ? null : item.id)}
                    className="bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <History size={12} /> History
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <Trash2 size={12} /> Hapus
                  </button>
                </div>

                {activeHistoryId === item.id && (
                  <div className="mt-2 bg-slate-900/70 rounded-lg p-2 space-y-1.5">
                    <div className="text-[11px] text-gray-300 font-medium">Riwayat Pembayaran</div>
                    {historyPembayaran.length > 0 ? (
                      historyPembayaran.map((history) => (
                        <div key={history.id} className="text-[11px] text-gray-400 flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                          <span>{history.tanggal || "-"}</span>
                          <span className="text-emerald-300">{formatCurrency(history.jumlah)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-gray-500">Belum ada pembayaran.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            {filterType !== "all" || filterStatus !== "all"
              ? "Tidak ada hutang dengan kriteria ini"
              : "Belum ada hutang"}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setModalVisible(true)}
        className="fixed bottom-20 md:bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg z-40">
        <Plus size={22} />
      </button>

      {showPayModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-3"
          onClick={() => setShowPayModal(false)}>
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md"
            onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-700 p-3 flex justify-between items-center">
              <h2 className="text-lg font-bold">Bayar Hutang</h2>
              <button onClick={() => setShowPayModal(false)} className="p-1.5 hover:bg-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitBayar} className="p-3 space-y-3">
              <div className="text-sm text-gray-300">{payFormData.namaHutang}</div>
              <input
                type="number"
                value={payFormData.jumlah}
                onChange={(e) => setPayFormData({ ...payFormData, jumlah: e.target.value })}
                placeholder="Nominal pembayaran"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                min="1"
                required
              />
              <input
                type="date"
                value={payFormData.tanggal}
                onChange={(e) => setPayFormData({ ...payFormData, tanggal: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
              />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm">
                Simpan Pembayaran
              </button>
              <textarea
                value={payFormData.catatan}
                onChange={(e) => setPayFormData({ ...payFormData, catatan: e.target.value })}
                placeholder="Catatan pembayaran (opsional)"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                rows="2"
              />
            </form>
          </div>
        </div>
      )}

      {/* Modal - sama seperti sebelumnya, dengan ukuran yang lebih kecil */}
      {modalVisible && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-3"
          onClick={resetForm}>
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">
                {editMode ? "Edit" : "Tambah"} Hutang
              </h2>
              <button
                onClick={resetForm}
                className="p-1.5 hover:bg-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-20">
              {/* Nama */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Nama Hutang
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  placeholder="Contoh: Cicilan Motor"
                  required
                />
              </div>

              {/* Tipe */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipe</label>
                <input
                  type="text"
                  value={formData.tipe}
                  onChange={(e) =>
                    setFormData({ ...formData, tipe: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  placeholder="Pribadi, Kredit, dll"
                  list="tipe-options"
                />
                <datalist id="tipe-options">
                  <option value="Pribadi" />
                  <option value="Kredit" />
                  <option value="Pinjaman Bank" />
                  <option value="Cicilan" />
                </datalist>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {["Pribadi", "Kredit", "Pinjaman Bank", "Cicilan"].map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, tipe: t })}
                        className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 rounded-full">
                        {t}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Jumlah dengan kalkulator */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Jumlah (Rp)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={calcInput}
                    onChange={handleJumlahChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white pr-8"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCalc(!showCalc)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white">
                    <Calculator size={16} />
                  </button>
                </div>

                {showCalc && (
                  <div className="mt-2 p-2 bg-slate-900 rounded-lg grid grid-cols-4 gap-1">
                    {[
                      "7",
                      "8",
                      "9",
                      "C",
                      "4",
                      "5",
                      "6",
                      "←",
                      "1",
                      "2",
                      "3",
                      "+",
                      "0",
                      "00",
                      "-",
                      "*",
                      "/",
                      "=",
                    ].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => handleCalcButton(btn)}
                        className={`p-1.5 rounded text-xs font-bold ${
                          btn === "C"
                            ? "bg-red-600/20 text-red-400"
                            : btn === "="
                              ? "bg-green-600/20 text-green-400"
                              : "bg-slate-800 hover:bg-slate-700"
                        }`}>
                        {btn}
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-gray-500 mt-1">
                  {formatCurrency(formData.jumlah)}
                </div>
              </div>

              {/* Periode dan Tanggal dalam satu baris */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Periode (bln)
                  </label>
                  <input
                    type="number"
                    value={formData.periode}
                    onChange={(e) =>
                      setFormData({ ...formData, periode: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              {/* Info tanggal lunas */}
              {formData.periode && formData.tanggal && (
                <div className="bg-slate-700/30 rounded-lg p-2 text-xs">
                  <span className="text-gray-400">Lunas: </span>
                  <span className="text-green-400 font-medium">
                    {getTanggalLunas()}
                  </span>
                </div>
              )}

              {/* Catatan */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Catatan
                </label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData({ ...formData, catatan: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  rows="2"></textarea>
              </div>

              {/* Tombol simpan */}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2 mb-2">
                {editMode ? "Update" : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
