import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Calculator,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";

export default function Pemasukan() {
  const [pemasukan, setPemasukan] = useState([]);
  const [pengeluaran, setPengeluaran] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterKategori, setFilterKategori] = useState("all");
  const [filterBulan, setFilterBulan] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    kategori: "",
    jumlah: "",
    tanggal: new Date().toISOString().split("T")[0],
    catatan: "",
  });
  const [calcInput, setCalcInput] = useState("");
  const [showCalc, setShowCalc] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  // Daftar kategori default
  const kategoriOptions = [
    "Gaji",
    "Bonus",
    "Hadiah",
    "Investasi",
    "Penjualan",
    "Lainnya",
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
    const dataPengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
    setPemasukan(data);
    setPengeluaran(dataPengeluaran);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama || !formData.jumlah) {
      alert("Nama dan jumlah harus diisi!");
      return;
    }
    const dataToSave = {
      ...formData,
      kategori: formData.kategori || "Lainnya",
    };
    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.PEMASUKAN, editId, dataToSave);
    } else {
      LocalStorageService.appendRow(SHEETS.PEMASUKAN, dataToSave);
    }
    resetForm();
    loadData();
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setEditId(item.id);
    setFormData({
      nama: item.nama,
      kategori: item.kategori,
      jumlah: item.jumlah,
      tanggal: item.tanggal,
      catatan: item.catatan || "",
    });
    setCalcInput(formatNumber(item.jumlah));
    setModalVisible(true);
  };

  const handleDelete = (item) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Pemasukan",
      message: `Apakah "${item.nama}" mau dihapus?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.PEMASUKAN, item.id);
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
      nama: "",
      kategori: "",
      jumlah: "",
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

  const safeEvaluate = (input) => {
    try {
      const expr = input.replace(/\./g, "").replace(/[^-()\d/*+.]/g, "");
      if (!expr) return 0;
      // eslint-disable-next-line no-new-func
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

  // Ambil bulan dari tanggal
  const getMonthYear = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}-${date.getFullYear()}`;
  };

  const getMonthName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  // Filter berdasarkan kategori dan bulan
  const filteredData = pemasukan.filter((item) => {
    if (filterKategori !== "all" && item.kategori !== filterKategori)
      return false;
    if (filterBulan !== "all") {
      const itemMonthYear = getMonthYear(item.tanggal);
      if (itemMonthYear !== filterBulan) return false;
    }
    return true;
  });

  // Urutkan berdasarkan tanggal terbaru
  const sortedData = [...filteredData].sort((a, b) => {
    return new Date(b.tanggal) - new Date(a.tanggal);
  });

  // Hitung total pemasukan
  const totalPemasukan = filteredData.reduce(
    (sum, item) => sum + (parseFloat(item.jumlah) || 0),
    0,
  );

  // Hitung total pengeluaran untuk perbandingan
  const totalPengeluaran = pengeluaran.reduce(
    (sum, item) => sum + (parseFloat(item.jumlah) || 0),
    0,
  );

  const sisaSaldo = totalPemasukan - totalPengeluaran;

  // Ambil semua kategori unik
  const uniqueKategori = [...new Set(pemasukan.map((item) => item.kategori))];

  // Ambil semua bulan unik
  const uniqueBulan = [
    ...new Set(pemasukan.map((item) => getMonthYear(item.tanggal))),
  ].sort((a, b) => {
    const [monthA, yearA] = a.split("-").map(Number);
    const [monthB, yearB] = b.split("-").map(Number);
    if (yearA !== yearB) return yearB - yearA;
    return monthB - monthA;
  });

  const resetKategoriFilter = () => setFilterKategori("all");
  const resetBulanFilter = () => setFilterBulan("all");

  // Mendapatkan label filter aktif
  const getActiveFilterLabel = () => {
    if (filterKategori === "all" && filterBulan === "all")
      return "Semua filter";

    const parts = [];
    if (filterKategori !== "all") parts.push(`Kategori: ${filterKategori}`);
    if (filterBulan !== "all") {
      const [month, year] = filterBulan.split("-");
      const date = new Date(year, month - 1);
      const monthName = date.toLocaleDateString("id-ID", { month: "long" });
      parts.push(`Bulan: ${monthName} ${year}`);
    }
    return parts.join(" • ");
  };

  return (
    <div>
      {/* Ringkasan Total Pemasukan */}
      <div className="mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 shadow-lg text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-emerald-100 mb-1">Total Pemasukan</div>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPemasukan)}
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <TrendingUp size={24} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/20">
          <div>
            <div className="text-[10px] text-emerald-100">
              Total Pengeluaran
            </div>
            <div className="text-sm font-semibold">
              {formatCurrency(totalPengeluaran)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-emerald-100">Sisa Saldo</div>
            <div
              className={`text-sm font-semibold ${sisaSaldo < 0 ? "text-red-200" : "text-green-200"}`}
            >
              {formatCurrency(sisaSaldo)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar - Collapsible */}
      <div className="mb-4 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-emerald-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            {filterKategori !== "all" || filterBulan !== "all" ? (
              <span className="text-xs bg-emerald-600/30 text-emerald-300 px-2 py-0.5 rounded-full">
                {getActiveFilterLabel()}
              </span>
            ) : (
              <span className="text-xs text-gray-500">Semua pemasukan</span>
            )}
          </div>
          <button className="p-1 text-gray-400 hover:text-white">
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
            {/* Filter Kategori */}
            <div>
              <span className="text-xs text-gray-400 block mb-2 flex items-center gap-1">
                <Tag size={12} /> Kategori:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={resetKategoriFilter}
                  className={`px-2.5 py-1 text-xs rounded-full ${
                    filterKategori === "all"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}
                >
                  Semua
                </button>
                {uniqueKategori.map((kategori) => (
                  <button
                    key={kategori}
                    onClick={() => setFilterKategori(kategori)}
                    className={`px-2.5 py-1 text-xs rounded-full ${
                      filterKategori === kategori
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    {kategori}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Bulan */}
            {uniqueBulan.length > 0 && (
              <div>
                <span className="text-xs text-gray-400 block mb-2 flex items-center gap-1">
                  <Calendar size={12} /> Bulan:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={resetBulanFilter}
                    className={`px-2.5 py-1 text-xs rounded-full ${
                      filterBulan === "all"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    Semua
                  </button>
                  {uniqueBulan.map((bulan) => {
                    const [month, year] = bulan.split("-");
                    const date = new Date(year, month - 1);
                    const monthName = date.toLocaleDateString("id-ID", {
                      month: "short",
                    });
                    return (
                      <button
                        key={bulan}
                        onClick={() => setFilterBulan(bulan)}
                        className={`px-2.5 py-1 text-xs rounded-full ${
                          filterBulan === bulan
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                        }`}
                      >
                        {monthName} {year}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tombol Reset */}
            {(filterKategori !== "all" || filterBulan !== "all") && (
              <button
                onClick={() => {
                  resetKategoriFilter();
                  resetBulanFilter();
                }}
                className="w-full mt-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 rounded-lg flex items-center justify-center gap-1"
              >
                <X size={14} /> Reset Semua Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Daftar Pemasukan */}
      <div className="space-y-3">
        {sortedData.length > 0 ? (
          sortedData.map((item, i) => {
            const total = parseFloat(item.jumlah) || 0;
            return (
              <div
                key={i}
                className="bg-slate-800 rounded-xl p-3 border-l-4 border-emerald-500"
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-base font-bold">{item.nama}</h3>
                  <div className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">
                    <Tag size={10} />
                    <span>{item.kategori || "Lainnya"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-500">
                    {new Date(item.tanggal).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-sm font-bold text-emerald-500">
                    {formatCurrency(total)}
                  </div>
                </div>

                {item.catatan && (
                  <div className="text-[10px] text-gray-500 mb-2 italic">
                    {item.catatan}
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1"
                  >
                    <Trash2 size={12} /> Hapus
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            {filterKategori !== "all" || filterBulan !== "all"
              ? "Tidak ada pemasukan dengan kriteria ini"
              : "Belum ada pemasukan"}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setModalVisible(true)}
        className="fixed bottom-20 md:bottom-6 right-6 w-12 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center shadow-lg z-40"
      >
        <Plus size={22} />
      </button>

      {/* Modal */}
      {modalVisible && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-3"
          onClick={resetForm}
        >
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">
                {editMode ? "Edit" : "Tambah"} Pemasukan
              </h2>
              <button
                onClick={resetForm}
                className="p-1.5 hover:bg-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-20">
              {/* Nama Pemasukan */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Nama Pemasukan
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  placeholder="Contoh: Gaji Bulanan"
                  required
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  value={formData.kategori}
                  onChange={(e) =>
                    setFormData({ ...formData, kategori: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  placeholder="Contoh: Gaji, Bonus, dll"
                  list="kategori-options"
                />
                <datalist id="kategori-options">
                  {kategoriOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {kategoriOptions.map((kat) => (
                    <button
                      key={kat}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, kategori: kat })
                      }
                      className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 rounded-full"
                    >
                      {kat}
                    </button>
                  ))}
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
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white"
                  >
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
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-gray-500 mt-1">
                  {formatCurrency(formData.jumlah)}
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Tanggal
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
                  rows="2"
                  placeholder="Opsional"
                ></textarea>
              </div>

              {/* Tombol Simpan */}
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2 mb-2"
              >
                {editMode ? "Update" : "Simpan"}
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
