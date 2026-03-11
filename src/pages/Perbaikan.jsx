import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Calculator,
  Wrench,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";

export default function Perbaikan() {
  const [perbaikan, setPerbaikan] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'due', 'overdue', 'upcoming'
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    tanggal: new Date().toISOString().split("T")[0],
    km_saat_ini: "",
    km_berikutnya: "",
    biaya: "",
    catatan: "",
  });
  const [calcInput, setCalcInput] = useState("");
  const [showCalc, setShowCalc] = useState(false);
  const [calcField, setCalcField] = useState(""); // untuk mengetahui field mana yang menggunakan kalkulator

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = LocalStorageService.readSheet(SHEETS.PERBAIKAN);
    setPerbaikan(data);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama || !formData.km_saat_ini || !formData.km_berikutnya) {
      alert("Nama, KM saat ini, dan KM berikutnya harus diisi!");
      return;
    }

    const dataToSave = {
      ...formData,
      km_saat_ini: parseLocaleNumber(formData.km_saat_ini),
      km_berikutnya: parseLocaleNumber(formData.km_berikutnya),
      biaya: formData.biaya ? parseLocaleNumber(formData.biaya) : 0,
    };

    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.PERBAIKAN, editId, dataToSave);

      // OTOMATIS: Update atau hapus pengeluaran terkait (perlu logic tambahan)
      // Untuk sederhananya, kita akan buat logic terpisah nanti
    } else {
      LocalStorageService.appendRow(SHEETS.PERBAIKAN, dataToSave);

      // OTOMATIS: Tambah ke pengeluaran jika ada biaya
      if (dataToSave.biaya > 0) {
        const pengeluaranData = {
          nama: `Perbaikan: ${dataToSave.nama}`,
          kategori: "Perbaikan",
          jumlah: dataToSave.biaya,
          tanggal: dataToSave.tanggal,
          catatan: dataToSave.catatan || "",
        };
        LocalStorageService.appendRow(SHEETS.PENGELUARAN, pengeluaranData);
      }
    }

    resetForm();
    loadData();
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setEditId(item.id);
    setFormData({
      nama: item.nama,
      tanggal: item.tanggal,
      km_saat_ini: formatNumber(item.km_saat_ini),
      km_berikutnya: formatNumber(item.km_berikutnya),
      biaya: item.biaya ? formatNumber(item.biaya) : "",
      catatan: item.catatan || "",
    });
    setModalVisible(true);
  };

  const handleDelete = (item) => {
    if (confirm(`Hapus perbaikan "${item.nama}"?`)) {
      LocalStorageService.deleteRow(SHEETS.PERBAIKAN, item.id);
      loadData();
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
      km_berikutnya: "",
      biaya: "",
      catatan: "",
    });
    setCalcInput("");
    setShowCalc(false);
    setCalcField("");
  };

  const formatCurrency = (num) => {
    if (!num) return "Rp 0";
    return "Rp. " + Number(num).toLocaleString("id-ID");
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return "";
    return Number(num).toLocaleString("id-ID");
  };

  const parseLocaleNumber = (str) => {
    if (!str) return 0;
    return Number(str.replace(/\./g, ""));
  };

  // Handler untuk input dengan format
  const handleInputChange = (field, value) => {
    const raw = value.replace(/[^\d]/g, "");
    const num = raw ? parseInt(raw, 10) : 0;
    setFormData({
      ...formData,
      [field]: num ? num.toLocaleString("id-ID") : "",
    });
  };

  // Kalkulator
  const handleCalcButton = (val) => {
    if (val === "C") {
      setCalcInput("");
      if (calcField) {
        setFormData({ ...formData, [calcField]: "" });
      }
    } else if (val === "←") {
      const newInput = calcInput.slice(0, -1);
      setCalcInput(newInput);
      if (calcField) {
        setFormData({ ...formData, [calcField]: newInput });
      }
    } else if (val === "=") {
      try {
        const expr = calcInput.replace(/\./g, "").replace(/[^-()\d/*+.]/g, "");
        // eslint-disable-next-line no-eval
        const result = eval(expr);
        if (!isNaN(result)) {
          const formatted = result.toLocaleString("id-ID");
          setCalcInput(formatted);
          if (calcField) {
            setFormData({ ...formData, [calcField]: formatted });
          }
        }
      } catch (e) {
        // ignore
      }
    } else {
      const newInput = calcInput + val;
      setCalcInput(newInput);
      if (calcField) {
        setFormData({ ...formData, [calcField]: newInput });
      }
    }
  };

  const openCalculator = (field) => {
    setCalcField(field);
    setCalcInput(formData[field] || "");
    setShowCalc(true);
  };

  // Hitung sisa KM
  const getSisaKM = (item) => {
    return item.km_berikutnya - item.km_saat_ini;
  };

  // Estimasi hari (asumsi 50 km/hari)
  const getEstimasiHari = (item) => {
    const sisa = getSisaKM(item);
    return Math.ceil(sisa / 50);
  };

  // Dapatkan status perbaikan
  const getStatus = (item) => {
    const sisa = getSisaKM(item);
    if (sisa <= 0) return "overdue"; // sudah lewat
    if (sisa <= 500) return "due"; // perlu segera (≤500km)
    return "upcoming"; // masih aman
  };

  // Filter berdasarkan status
  const filteredData = perbaikan.filter((item) => {
    if (filterStatus === "all") return true;
    const status = getStatus(item);
    return status === filterStatus;
  });

  // Urutkan berdasarkan sisa KM terkecil (yang paling mendesak)
  const sortedData = [...filteredData].sort((a, b) => {
    return getSisaKM(a) - getSisaKM(b);
  });

  // Hitung jumlah berdasarkan status
  const countStatus = {
    all: perbaikan.length,
    upcoming: perbaikan.filter((i) => getStatus(i) === "upcoming").length,
    due: perbaikan.filter((i) => getStatus(i) === "due").length,
    overdue: perbaikan.filter((i) => getStatus(i) === "overdue").length,
  };

  // Reset filter
  const resetFilter = () => setFilterStatus("all");

  // Mendapatkan label filter aktif
  const getActiveFilterLabel = () => {
    if (filterStatus === "all") return "Semua filter";
    const statusLabel =
      filterStatus === "upcoming"
        ? "Masih Aman"
        : filterStatus === "due"
          ? "Segera"
          : "Terlewat";
    return `Status: ${statusLabel}`;
  };

  return (
    <div>
      {/* Ringkasan Total */}
      <div className="mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-purple-100 mb-1">Total Perbaikan</div>
            <div className="text-2xl font-bold text-white">
              {perbaikan.length} item
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <Wrench size={24} className="text-white" />
          </div>
        </div>
        <div className="mt-2 flex gap-3 text-xs text-purple-100">
          <span>Aman: {countStatus.upcoming}</span>
          <span>Perlu Servis: {countStatus.due}</span>
          <span>Lewat Target: {countStatus.overdue}</span>
        </div>
      </div>

      {/* Filter Bar - Collapsible */}
      <div className="mb-4 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition"
          onClick={() => setShowFilters(!showFilters)}>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-purple-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            {filterStatus !== "all" ? (
              <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full">
                {getActiveFilterLabel()}
              </span>
            ) : (
              <span className="text-xs text-gray-500">Semua perbaikan</span>
            )}
          </div>
          <button className="p-1 text-gray-400 hover:text-white">
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 pt-0 border-t border-slate-700">
            <div>
              <span className="text-xs text-gray-400 block mb-2">Status:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1 ${
                    filterStatus === "all"
                      ? "bg-purple-600 text-white"
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
                  Masih Aman 
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
                  Segera 
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
                  Terlewat 
                  <span className="text-[10px] bg-white/20 px-1 rounded-full">
                    {countStatus.overdue}
                  </span>
                </button>
              </div>
            </div>

            {/* Tombol Reset */}
            {filterStatus !== "all" && (
              <button
                onClick={resetFilter}
                className="w-full mt-3 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 rounded-lg flex items-center justify-center gap-1">
                <X size={14} /> Reset Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Daftar Perbaikan */}
      <div className="space-y-3">
        {sortedData.length > 0 ? (
          sortedData.map((item, i) => {
            const sisa = getSisaKM(item);
            const status = getStatus(item);
            const estimasiHari = getEstimasiHari(item);

            return (
              <div
                key={i}
                className="bg-slate-800 rounded-xl p-3 border-l-4 border-purple-500">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-base font-bold">{item.nama}</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="text-[10px] text-gray-500">Tanggal</div>
                    <div className="text-xs text-white">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">KM Saat Ini</div>
                    <div className="text-xs text-white">
                      {formatNumber(item.km_saat_ini)} km
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">
                      KM Berikutnya
                    </div>
                    <div className="text-xs text-blue-400">
                      {formatNumber(item.km_berikutnya)} km
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Sisa KM</div>
                    <div
                      className="text-xs font-medium text-blue-400">
                      {formatNumber(sisa)} km
                    </div>
                  </div>
                </div>

                {estimasiHari > 0 && status !== "overdue" && (
                  <div className="text-[10px] text-gray-500 mb-2">
                    Estimasi: {estimasiHari} hari lagi (50km/hari)
                  </div>
                )}

                {item.biaya > 0 && (
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500">Biaya:</span>
                    <span className="text-orange-400 font-medium">
                      {formatCurrency(item.biaya)}
                    </span>
                  </div>
                )}

                {item.catatan && (
                  <div className="text-[10px] text-gray-500 italic mb-2">
                    {item.catatan}
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <Trash2 size={12} /> Hapus
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            {filterStatus !== "all"
              ? "Tidak ada perbaikan dengan status ini"
              : "Belum ada data perbaikan"}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setModalVisible(true)}
        className="fixed bottom-24 md:bottom-6 right-6 w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center shadow-lg z-40">
        <Plus size={22} />
      </button>

      {/* Modal */}
      {modalVisible && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3"
          onClick={resetForm}>
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">
                {editMode ? "Edit" : "Tambah"} Perbaikan
              </h2>
              <button
                onClick={resetForm}
                className="p-1.5 hover:bg-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-8">
              {/* Nama Item */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Nama Item <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  placeholder="Contoh: Ganti Oli, Servis Rutin"
                  required
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Tanggal <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  required
                />
              </div>

              {/* KM Saat Ini */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  KM Saat Ini <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.km_saat_ini}
                    onChange={(e) => handleInputChange("km_saat_ini", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white pr-8"
                    placeholder="0"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => openCalculator("km_saat_ini")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white">
                    <Calculator size={16} />
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Contoh: 15.000</p>
              </div>

              {/* KM Berikutnya */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  KM Berikutnya (Rekomendasi){" "}
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.km_berikutnya}
                    onChange={(e) =>
                      handleInputChange("km_berikutnya", e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white pr-8"
                    placeholder="0"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => openCalculator("km_berikutnya")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white">
                    <Calculator size={16} />
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Contoh: 20.000</p>
              </div>

              {/* Biaya */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Biaya (Opsional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.biaya}
                    onChange={(e) => handleInputChange("biaya", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white pr-8"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => openCalculator("biaya")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white">
                    <Calculator size={16} />
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Otomatis tercatat di Pengeluaran
                </p>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData({ ...formData, catatan: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  rows="2"
                  placeholder="Merek, bengkel, atau catatan lainnya..."
                />
              </div>

              {/* Kalkulator Popup */}
              {showCalc && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                  <div className="bg-slate-800 rounded-xl w-full max-w-xs p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium">Kalkulator</h3>
                      <button
                        type="button"
                        onClick={() => setShowCalc(false)}
                        className="p-1 hover:bg-slate-700 rounded">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="mb-3 p-2 bg-slate-900 rounded-lg text-right text-xl font-mono">
                      {calcInput || "0"}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
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
                          className={`p-3 rounded-lg text-center font-bold text-sm ${
                            btn === "C"
                              ? "bg-red-600/20 text-red-400"
                              : btn === "="
                                ? "bg-green-600/20 text-green-400 col-span-2"
                                : "bg-slate-700 hover:bg-slate-600"
                          }`}>
                          {btn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tombol Simpan */}
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium text-sm mt-4 mb-2">
                {editMode ? "Update" : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
