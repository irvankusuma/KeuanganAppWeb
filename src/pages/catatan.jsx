import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  List,
  MessageSquare,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";

const NOTE_TYPES = {
  STANDARD: "standard",
  BULLET: "bullet",
  SHORT: "short",
};

const initialForm = {
  judul: "",
  isi: "",
  jenis: NOTE_TYPES.STANDARD,
};

export default function Catatan() {
  const [catatan, setCatatan] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(initialForm);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterSort, setFilterSort] = useState("newest");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = LocalStorageService.readSheet(SHEETS.CATATAN);
    setCatatan(data);
  };

  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...catatan]
      .filter((item) => {
<<<<<<< HEAD
        if (
          filterType !== "all" &&
          (item.jenis || NOTE_TYPES.STANDARD) !== filterType
        ) {
=======
        if (filterType !== "all" && (item.jenis || NOTE_TYPES.STANDARD) !== filterType) {
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
          return false;
        }

        if (!keyword) return true;

        const judul = (item.judul || "").toLowerCase();
        const isi = (item.isi || "").toLowerCase();
        return judul.includes(keyword) || isi.includes(keyword);
      })
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return filterSort === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [catatan, search, filterType, filterSort]);

  const resetForm = () => {
    setFormData(initialForm);
    setEditId(null);
    setShowModal(false);
  };

  const openType = (type) => {
    setFormData({ ...initialForm, jenis: type });
    setEditId(null);
    setShowTypePicker(false);
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isShort = formData.jenis === NOTE_TYPES.SHORT;

    if (!isShort && !formData.judul.trim()) {
      alert("Judul harus diisi.");
      return;
    }

    if (!formData.isi.trim()) {
      alert("Isi catatan harus diisi.");
      return;
    }

    if (isShort && formData.isi.trim().length > 100) {
      alert("Catatan singkat maksimal 100 karakter.");
      return;
    }

    const payload = {
      judul: isShort ? "" : formData.judul.trim(),
      isi: formData.isi.trim(),
      jenis: formData.jenis,
      tanggal: new Date().toISOString().split("T")[0],
    };

    if (editId) {
      LocalStorageService.updateRow(SHEETS.CATATAN, editId, payload);
    } else {
      LocalStorageService.appendRow(SHEETS.CATATAN, payload);
    }

    resetForm();
    loadData();
  };

  const handleEdit = (item) => {
    const type = item.jenis || NOTE_TYPES.STANDARD;
    setEditId(item.id);
    setFormData({
      judul: item.judul || "",
      isi: item.isi || "",
      jenis: type,
    });
    setShowModal(true);
  };

  const handleDelete = (item) => {
    if (confirm(`Hapus catatan \"${item.judul || "Catatan Singkat"}\"?`)) {
      LocalStorageService.deleteRow(SHEETS.CATATAN, item.id);
      loadData();
    }
  };

  const formatDateTime = (item) => {
    const raw = item.updatedAt || item.createdAt;
    if (!raw) return "-";
    return new Date(raw).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeLabel = (type) => {
    if (type === NOTE_TYPES.BULLET) return "List";
    if (type === NOTE_TYPES.SHORT) return "Singkat";
    return "Standar";
  };

  const getActiveFilterLabel = () => {
    const sortLabel = filterSort === "newest" ? "Terbaru" : "Terlama";
<<<<<<< HEAD
    const typeLabel =
      filterType === "all" ? "Semua tipe" : getTypeLabel(filterType);
=======
    const typeLabel = filterType === "all" ? "Semua tipe" : getTypeLabel(filterType);
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
    return `${typeLabel} • ${sortLabel}`;
  };

  const bulletItems = (text) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const selectedType = formData.jenis;
  const isShort = selectedType === NOTE_TYPES.SHORT;
  const isBullet = selectedType === NOTE_TYPES.BULLET;

  return (
    <div className="space-y-4 pb-28 md:pb-6">
      <div className="mb-4 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition"
<<<<<<< HEAD
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-blue-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            <span className="text-xs text-gray-400">
              {getActiveFilterLabel()}
            </span>
=======
          onClick={() => setShowFilters(!showFilters)}>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-blue-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            <span className="text-xs text-gray-400">{getActiveFilterLabel()}</span>
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
          </div>
          <button className="p-1 text-gray-400 hover:text-white">
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 pt-0 border-t border-slate-700 space-y-3">
            <div>
<<<<<<< HEAD
              <span className="text-xs text-gray-400 block mb-2">
                Kategori:
              </span>
=======
              <span className="text-xs text-gray-400 block mb-2">Kategori:</span>
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "all", label: "Semua" },
                  { value: NOTE_TYPES.STANDARD, label: "Standar" },
                  { value: NOTE_TYPES.BULLET, label: "List" },
                  { value: NOTE_TYPES.SHORT, label: "Singkat" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setFilterType(item.value)}
                    className={`px-2.5 py-1 text-xs rounded-full ${
                      filterType === item.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
<<<<<<< HEAD
                    }`}
                  >
=======
                    }`}>
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-gray-400 block mb-2">Urutan:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilterSort("newest")}
                  className={`px-2.5 py-1 text-xs rounded-full ${
                    filterSort === "newest"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
<<<<<<< HEAD
                  }`}
                >
=======
                  }`}>
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                  Terbaru
                </button>
                <button
                  onClick={() => setFilterSort("oldest")}
                  className={`px-2.5 py-1 text-xs rounded-full ${
                    filterSort === "oldest"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
<<<<<<< HEAD
                  }`}
                >
=======
                  }`}>
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                  Terlama
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul atau isi catatan..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="space-y-3">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((item) => {
            const type = item.jenis || NOTE_TYPES.STANDARD;
            return (
<<<<<<< HEAD
              <div
                key={item.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-3"
              >
=======
              <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {item.judul || "Catatan Singkat"}
                      </h3>
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">
                        {getTypeLabel(type)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Terakhir diubah: {formatDateTime(item)}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-md bg-blue-600/20 text-blue-300 hover:bg-blue-600/40"
<<<<<<< HEAD
                      aria-label="Edit catatan"
                    >
=======
                      aria-label="Edit catatan">
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-md bg-red-600/20 text-red-300 hover:bg-red-600/40"
<<<<<<< HEAD
                      aria-label="Hapus catatan"
                    >
=======
                      aria-label="Hapus catatan">
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {type === NOTE_TYPES.BULLET ? (
                  <ul className="text-sm text-slate-200 mt-2 space-y-1">
                    {bulletItems(item.isi || "").map((line, idx) => (
                      <li key={`${item.id}-${idx}`} className="flex gap-2">
                        <span>•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
<<<<<<< HEAD
                  <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">
                    {item.isi}
                  </p>
=======
                  <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{item.isi}</p>
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center text-sm text-slate-400 py-14 bg-slate-800/60 border border-slate-700 rounded-xl">
<<<<<<< HEAD
            {search
              ? "Catatan tidak ditemukan."
              : "Belum ada catatan. Tambah catatan dari tombol +."}
=======
            {search ? "Catatan tidak ditemukan." : "Belum ada catatan. Tambah catatan dari tombol +."}
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
          </div>
        )}
      </div>

      <button
        onClick={() => setShowTypePicker(true)}
        className="fixed bottom-24 md:bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg z-40 md:z-40"
<<<<<<< HEAD
        aria-label="Tambah catatan"
      >
=======
        aria-label="Tambah catatan">
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
        <Plus size={22} />
      </button>

      {showTypePicker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3"
<<<<<<< HEAD
          onClick={() => setShowTypePicker(false)}
        >
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-slate-700 flex justify-between items-center">
              <h2 className="font-semibold">Pilih Tipe Catatan</h2>
              <button
                onClick={() => setShowTypePicker(false)}
                className="p-1.5 hover:bg-slate-700 rounded-lg"
              >
=======
          onClick={() => setShowTypePicker(false)}>
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md border border-slate-700"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-slate-700 flex justify-between items-center">
              <h2 className="font-semibold">Pilih Tipe Catatan</h2>
              <button onClick={() => setShowTypePicker(false)} className="p-1.5 hover:bg-slate-700 rounded-lg">
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                <X size={18} />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <button
                onClick={() => openType(NOTE_TYPES.STANDARD)}
<<<<<<< HEAD
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2"
              >
=======
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2">
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                <Plus size={16} /> Judul + Catatan
              </button>
              <button
                onClick={() => openType(NOTE_TYPES.BULLET)}
<<<<<<< HEAD
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2"
              >
=======
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2">
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                <List size={16} /> Judul + Catatan Bertitik
              </button>
              <button
                onClick={() => openType(NOTE_TYPES.SHORT)}
<<<<<<< HEAD
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2"
              >
=======
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2">
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                <MessageSquare size={16} /> Catatan Singkat (maks 100 karakter)
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3"
<<<<<<< HEAD
          onClick={resetForm}
        >
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-lg max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">
                {editId ? "Edit Catatan" : "Tambah Catatan"} (
                {getTypeLabel(selectedType)})
              </h2>
              <button
                onClick={resetForm}
                className="p-1.5 hover:bg-slate-700 rounded-lg"
              >
=======
          onClick={resetForm}>
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-lg max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">
                {editId ? "Edit Catatan" : "Tambah Catatan"} ({getTypeLabel(selectedType)})
              </h2>
              <button onClick={resetForm} className="p-1.5 hover:bg-slate-700 rounded-lg">
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-8">
              {!isShort && (
                <div>
<<<<<<< HEAD
                  <label className="block text-xs text-gray-400 mb-1">
                    Judul
                  </label>
                  <input
                    type="text"
                    value={formData.judul}
                    onChange={(e) =>
                      setFormData({ ...formData, judul: e.target.value })
                    }
=======
                  <label className="block text-xs text-gray-400 mb-1">Judul</label>
                  <input
                    type="text"
                    value={formData.judul}
                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                    placeholder="Contoh: Belanja bulanan"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1">
<<<<<<< HEAD
                  {isBullet
                    ? "Catatan (tekan Enter untuk poin baru)"
                    : "Isi Catatan"}
                </label>
                <textarea
                  value={formData.isi}
                  onChange={(e) =>
                    setFormData({ ...formData, isi: e.target.value })
                  }
=======
                  {isBullet ? "Catatan (tekan Enter untuk poin baru)" : "Isi Catatan"}
                </label>
                <textarea
                  value={formData.isi}
                  onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  rows={isShort ? 3 : 8}
                  maxLength={isShort ? 100 : undefined}
                  placeholder={
                    isBullet
<<<<<<< HEAD
                      ? "Contoh 1\nContoh 2\nContoh 3"
=======
                      ? "Mentega\nGaram\nSusu\nGula"
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
                      : isShort
                        ? "Tulis catatan singkat..."
                        : "Tulis catatan di sini..."
                  }
                  required
                />
                {isShort && (
                  <div className="text-[11px] text-gray-400 mt-1 text-right">
                    {formData.isi.length}/100
                  </div>
                )}
              </div>

              <button
                type="submit"
<<<<<<< HEAD
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2 mb-2 flex items-center justify-center gap-2"
              >
                <Save size={16} />{" "}
                {editId ? "Simpan Perubahan" : "Simpan Catatan"}
=======
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2 mb-2 flex items-center justify-center gap-2">
                <Save size={16} /> {editId ? "Simpan Perubahan" : "Simpan Catatan"}
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
