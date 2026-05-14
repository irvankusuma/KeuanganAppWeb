import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  TrendingDown,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  ShoppingBag,
  Coffee,
  Home,
  Car,
  Heart,
  Film,
  Pin,
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";
import NumericInput from "../components/NumericInput";
import { useToast } from "../context/ToastContext";

export default function Pengeluaran() {
  const [pengeluaran, setPengeluaran] = useState([]);
  const [pemasukan, setPemasukan] = useState([]);
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
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: "",
    onConfirm: null,
  });

  const { showToast } = useToast();

  // Daftar kategori pengeluaran umum
  const kategoriOptions = [
    "Makanan & Minuman",
    "Transportasi",
    "Belanja",
    "Hiburan",
    "Tagihan",
    "Kesehatan",
    "Pendidikan",
    "Investasi",
    "Donasi",
    "Lainnya",
  ];

  // Ikon untuk setiap kategori (untuk tampilan)
  const getKategoriIcon = (kategori) => {
    switch (kategori) {
      case "Makanan & Minuman":
        return <Coffee size={12} />;
      case "Transportasi":
        return <Car size={12} />;
      case "Belanja":
        return <ShoppingBag size={12} />;
      case "Hiburan":
        return <Film size={12} />;
      case "Tagihan":
        return <Home size={12} />;
      case "Kesehatan":
        return <Heart size={12} />;
      default:
        return <Tag size={12} />;
    }
  };

  const location = useLocation();

  useEffect(() => {
    loadData();
    if (location.state?.autoAdd) {
      setModalVisible(true);
    }
  }, [location.state]);

  const loadData = () => {
    const data = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
    const dataPemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
    setPengeluaran(data);
    setPemasukan(dataPemasukan);
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
      LocalStorageService.updateRow(SHEETS.PENGELUARAN, editId, dataToSave);
    } else {
      LocalStorageService.appendRow(SHEETS.PENGELUARAN, dataToSave);
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
    setModalVisible(true);
  };

  const handleDelete = (item) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Pengeluaran",
      message: `Apakah "${item.nama}" mau dihapus?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.PENGELUARAN, item.id);
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
  };

  const formatCurrency = (num) => {
    if (!num) return "Rp 0";
    return "Rp " + Number(num).toLocaleString("id-ID");
  };

  // Ambil bulan dari tanggal
  const getMonthYear = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}-${date.getFullYear()}`;
  };

  // Filter berdasarkan kategori dan bulan
  const filteredData = pengeluaran.filter((item) => {
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
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return new Date(b.tanggal) - new Date(a.tanggal);
  });

  const handleTogglePin = (id) => {
    const result = LocalStorageService.togglePin(SHEETS.PENGELUARAN, id);
    if (result.success) {
      loadData();
    } else {
      showToast(result.message, "warning");
    }
  };

  // Hitung total pengeluaran
  const totalPengeluaran = filteredData.reduce(
    (sum, item) => sum + (parseFloat(item.jumlah) || 0),
    0,
  );

  // Hitung total pemasukan untuk perbandingan
  const totalPemasukan = pemasukan.reduce(
    (sum, item) => sum + (parseFloat(item.jumlah) || 0),
    0,
  );

  const sisaSaldo = totalPemasukan - totalPengeluaran;

  // Ambil semua kategori unik
  const uniqueKategori = [...new Set(pengeluaran.map((item) => item.kategori))];

  // Ambil semua bulan unik
  const uniqueBulan = [
    ...new Set(pengeluaran.map((item) => getMonthYear(item.tanggal))),
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

  // Pengeluaran terbesar untuk insight
  const pengeluaranTerbesar =
    filteredData.length > 0
      ? Math.max(...filteredData.map((item) => parseFloat(item.jumlah) || 0))
      : 0;

  return (
    <div>
      {/* Ringkasan Total Pengeluaran */}
      <div className="mb-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-4 shadow-lg text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-orange-100 mb-1">
              Total Pengeluaran
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPengeluaran)}
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <TrendingDown size={24} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/20">
          <div>
            <div className="text-[10px] text-orange-100">Total Pemasukan</div>
            <div className="text-sm font-semibold">
              {formatCurrency(totalPemasukan)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-orange-100">Sisa Saldo</div>
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
            <Filter size={18} className="text-orange-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            {filterKategori !== "all" || filterBulan !== "all" ? (
              <span className="text-xs bg-orange-600/30 text-orange-300 px-2 py-0.5 rounded-full">
                {getActiveFilterLabel()}
              </span>
            ) : (
              <span className="text-xs text-gray-500">Semua pengeluaran</span>
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
                      ? "bg-orange-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}
                >
                  Semua
                </button>
                {uniqueKategori.map((kategori) => (
                  <button
                    key={kategori}
                    onClick={() => setFilterKategori(kategori)}
                    className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1 ${
                      filterKategori === kategori
                        ? "bg-orange-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    {getKategoriIcon(kategori)}
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
                        ? "bg-orange-600 text-white"
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
                            ? "bg-orange-600 text-white"
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

      {/* Daftar Pengeluaran */}
      <div className="space-y-3">
        {sortedData.length > 0 ? (
          sortedData.map((item, i) => {
            const total = parseFloat(item.jumlah) || 0;
            return (
              <div
                key={i}
                className="bg-[#0e1523] border border-[#1e2d45] rounded-xl p-4 border-l-4 border-l-orange-500 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-1.5 gap-2">
                  <div className="flex-1 truncate">
                    <h3 className="text-sm font-semibold text-white truncate">{item.nama}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full font-medium border border-orange-500/20">
                      {getKategoriIcon(item.kategori)}
                      <span>{item.kategori || "Lainnya"}</span>
                    </div>
                    <button 
                      onClick={() => handleTogglePin(item.id)}
                      className={`p-1 rounded-full transition-all ${item.isPinned ? "bg-blue-500/20 text-blue-400" : "text-slate-600 hover:bg-white/5 hover:text-slate-400"}`}
                      title={item.isPinned ? "Lepas Pin" : "Pin Item"}
                    >
                      <Pin size={14} className={item.isPinned ? "fill-current" : ""} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-slate-500 font-medium">
                    {new Date(item.tanggal).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-sm font-bold text-orange-400">
                    {formatCurrency(total)}
                  </div>
                </div>

                {item.catatan && (
                  <div className="text-[11px] text-slate-400 mb-3 italic bg-slate-800/30 p-2 rounded-lg border border-slate-700/30">
                    "{item.catatan}"
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-[#1e2d45]/50">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141d2e] text-slate-400 hover:text-blue-400 hover:bg-blue-600/15 transition-colors"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141d2e] text-slate-400 hover:text-red-400 hover:bg-red-600/15 transition-colors"
                  >
                    <Trash2 size={13} /> Hapus
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-14 text-slate-500 text-sm bg-[#0e1523] border border-[#1e2d45] rounded-xl">
            {filterKategori !== "all" || filterBulan !== "all"
              ? "Tidak ada pengeluaran dengan kriteria ini"
              : "Belum ada pengeluaran"}
          </div>
        )}

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
                {editMode ? "Edit" : "Tambah"} Pengeluaran
              </h2>
              <button
                onClick={resetForm}
                className="p-1.5 hover:bg-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-20">
              {/* Nama Pengeluaran */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Nama Pengeluaran
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  placeholder="Contoh: Makan Siang"
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
                  placeholder="Contoh: Makanan, Transportasi, dll"
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
                      className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 rounded-full flex items-center gap-1"
                    >
                      {getKategoriIcon(kat)}
                      {kat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jumlah */}
              <div>
                <NumericInput
                  label="Jumlah"
                  value={formData.jumlah}
                  onChange={(val) => setFormData({ ...formData, jumlah: val ? Number(val) : "" })}
                  required
                />
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
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2 mb-2"
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
