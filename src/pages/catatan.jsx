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
  Check,
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";


const NOTE_TYPES = {
  STANDARD: "standard",
  BULLET: "bullet",
  SHORT: "short",
  CHECKBOX: "checkbox",
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
    const data = LocalStorageService.readSheet(SHEETS.CATATAN);
    setCatatan(data);
  };

  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...catatan]
      .filter((item) => {
        if (
          filterType !== "all" &&
          (item.jenis || NOTE_TYPES.STANDARD) !== filterType
        ) {
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
    let initialIsi = "";
    if (type === NOTE_TYPES.BULLET) initialIsi = "• ";
    if (type === NOTE_TYPES.CHECKBOX) initialIsi = "[ ] ";
    
    setFormData({ ...initialForm, jenis: type, isi: initialIsi });
    setEditId(null);
    setShowTypePicker(false);
    setShowModal(true);
  };
  const handleIsiChange = (e) => {
    setFormData({ ...formData, isi: e.target.value });
  };

  const handleKeyDown = (e) => {
    const { selectionStart, value } = e.target;
    const isBulletType = formData.jenis === NOTE_TYPES.BULLET;
    const isCheckboxType = formData.jenis === NOTE_TYPES.CHECKBOX;
    const prefixLen = isBulletType ? 2 : 4; // "• " or "[ ] "
    
    if (e.key === "Enter") {
      if (isBulletType || isCheckboxType) {
        e.preventDefault();
        const prefix = isBulletType ? "\n• " : "\n[ ] ";
        const newValue = value.substring(0, selectionStart) + prefix + value.substring(selectionStart);
        
        setFormData({ ...formData, isi: newValue });
        
        setTimeout(() => {
          if (e.target) {
            e.target.selectionStart = selectionStart + prefix.length;
            e.target.selectionEnd = selectionStart + prefix.length;
          }
        }, 10);
      }
    } else if (e.key === "Backspace") {
      const prefix = isBulletType ? "• " : "[ ] ";
      const prefixLen = prefix.length;
      
      const linesBefore = value.substring(0, selectionStart).split("\n");
      const currentLineText = linesBefore[linesBefore.length - 1];
      
      // If we are deleting a line that is empty except for the prefix
      if ((isBulletType || isCheckboxType) && currentLineText.length <= prefixLen) {
        if (linesBefore.length > 1) {
          e.preventDefault();
          // Find the total length of characters to remove including preceding newline
          const removeLen = currentLineText.length + 1;
          const newValue = value.substring(0, selectionStart - removeLen) + value.substring(selectionStart);
          const newPos = selectionStart - removeLen;
          
          setFormData({ ...formData, isi: newValue });
          setTimeout(() => {
            if (e.target) {
              e.target.selectionStart = newPos;
              e.target.selectionEnd = newPos;
            }
          }, 10);
        } else if (currentLineText === prefix) {
          // Optional: don't delete first line's prefix entirely or do nothing
        }
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isShort = formData.jenis === NOTE_TYPES.SHORT;
    
    // Clean up empty lines before saving
    let finalIsi = formData.isi;
    if (formData.jenis === NOTE_TYPES.BULLET || formData.jenis === NOTE_TYPES.CHECKBOX) {
        const prefix = formData.jenis === NOTE_TYPES.BULLET ? "• " : "[ ] ";
        finalIsi = finalIsi.split("\n")
          .filter(line => line.trim() !== "" && line.trim() !== prefix.trim())
          .join("\n");
        
        if (!finalIsi) {
          alert("Isi catatan tidak boleh kosong.");
          return;
        }
    }

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
      isi: finalIsi,
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
    setConfirmModal({
      visible: true,
      title: "Hapus Catatan",
      message: `Apakah catatan "${item.judul || "Catatan Singkat"}" mau dihapus?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.CATATAN, item.id);
        loadData();
        setConfirmModal({ ...confirmModal, visible: false });
      },
    });
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
    if (type === NOTE_TYPES.CHECKBOX) return "Checkbox";
    return "Standar";
  };

  const getActiveFilterLabel = () => {
    const sortLabel = filterSort === "newest" ? "Terbaru" : "Terlama";
    const typeLabel =
      filterType === "all" ? "Semua tipe" : getTypeLabel(filterType);
    return `${typeLabel} • ${sortLabel}`;
  };

  const bulletItems = (text) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const toggleCheckbox = (item, lineIdx, e) => {
    e.stopPropagation();
    const lines = (item.isi || "").split("\n");
    const line = lines[lineIdx];
    
    if (line.trim().startsWith("[x]")) {
      lines[lineIdx] = line.replace("[x]", "[ ]");
    } else if (line.trim().startsWith("[ ]")) {
      lines[lineIdx] = line.replace("[ ]", "[x]");
    } else {
      lines[lineIdx] = "[x] " + line;
    }
    
    const newIsi = lines.join("\n");
    LocalStorageService.updateRow(SHEETS.CATATAN, item.id, { ...item, isi: newIsi });
    loadData();
  };

  const selectedType = formData.jenis;
  const isShort = selectedType === NOTE_TYPES.SHORT;
  const isBullet = selectedType === NOTE_TYPES.BULLET;
  const isCheckbox = selectedType === NOTE_TYPES.CHECKBOX;

  return (
    <div className="space-y-4 pb-28 md:pb-6">
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
          <button className="p-1 text-gray-400 hover:text-white">
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 pt-0 border-t border-slate-700 space-y-3">
            <div>
              <span className="text-xs text-gray-400 block mb-2">
                Kategori:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "all", label: "Semua" },
                  { value: NOTE_TYPES.STANDARD, label: "Standar" },
                  { value: NOTE_TYPES.BULLET, label: "List" },
                  { value: NOTE_TYPES.SHORT, label: "Singkat" },
                  { value: NOTE_TYPES.CHECKBOX, label: "Checkbox" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setFilterType(item.value)}
                    className={`px-2.5 py-1 text-xs rounded-full ${
                      filterType === item.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
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
                  }`}
                >
                  Terbaru
                </button>
                <button
                  onClick={() => setFilterSort("oldest")}
                  className={`px-2.5 py-1 text-xs rounded-full ${
                    filterSort === "oldest"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}
                >
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
              <div
                key={item.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-3 cursor-pointer hover:bg-slate-700/50 transition relative"
                onClick={() => handleEdit(item)}
              >
                <div className="flex items-start justify-between gap-3 relative z-10">
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
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-md bg-blue-600/20 text-blue-300 hover:bg-blue-600/40"
                      aria-label="Edit catatan"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-md bg-red-600/20 text-red-300 hover:bg-red-600/40"
                      aria-label="Hapus catatan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {type === NOTE_TYPES.BULLET ? (
                  <ul className="text-sm text-slate-200 mt-2 space-y-1">
                    {bulletItems(item.isi || "").slice(0, 3).map((line, idx) => {
                      const text = line.replace(/^\s*[•*]?\s*/, "").trim();
                      return (
                        <li key={`${item.id}-${idx}`} className="flex gap-2">
                          <span>•</span>
                          <span className="truncate">{text}</span>
                        </li>
                      );
                    })}
                    {bulletItems(item.isi || "").length > 3 && (
                      <li className="text-xs text-slate-500 italic mt-1">... lihat selebihnya</li>
                    )}
                  </ul>
                ) : type === NOTE_TYPES.CHECKBOX ? (
                  <div className="text-sm text-slate-200 mt-2 space-y-1">
                    {(item.isi || "")
                      .split("\n")
                      .map((line, i) => ({ line, i }))
                      .filter(x => x.line.trim() !== "")
                      .slice(0, 4)
                      .map(({ line, i }, idx) => {
                      const isChecked = line.trim().startsWith("[x]");
                      const hasCheckbox = line.trim().startsWith("[x]") || line.trim().startsWith("[ ]");
                      const text = hasCheckbox ? line.replace(/^\[[x ]\]\s*/i, "") : line;

                      return (
                        <div key={`${item.id}-${idx}`} className="flex items-start gap-2">
                          <div
                            onClick={(e) => toggleCheckbox(item, i, e)}
                            className="mt-0.5 shrink-0 cursor-pointer text-slate-400 hover:text-white"
                          >
                            {isChecked ? (
                              <div className="w-4 h-4 border border-blue-500 bg-blue-500 rounded-sm flex items-center justify-center">
                                <Check size={12} className="text-white" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-4 h-4 border border-slate-500 rounded-sm"></div>
                            )}
                          </div>
                          <span className={`truncate cursor-text ${isChecked ? "text-slate-500 line-through" : ""}`}>
                            {text}
                          </span>
                        </div>
                      );
                    })}
                    {(item.isi || "").split("\n").filter(l => l.trim() !== "").length > 4 && (
                      <div className="text-xs text-slate-500 italic mt-1">... lihat selebihnya</div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap line-clamp-3">
                    {item.isi}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center text-sm text-slate-400 py-14 bg-slate-800/60 border border-slate-700 rounded-xl">
            {search
              ? "Catatan tidak ditemukan."
              : "Belum ada catatan. Tambah catatan dari tombol +."}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowTypePicker(true)}
        className="fixed bottom-24 md:bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg z-40 md:z-40"
        aria-label="Tambah catatan"
      >
        <Plus size={22} />
      </button>

      {showTypePicker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3"
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
                <X size={18} />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <button
                onClick={() => openType(NOTE_TYPES.STANDARD)}
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Judul + Catatan
              </button>
              <button
                onClick={() => openType(NOTE_TYPES.BULLET)}
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2"
              >
                <List size={16} /> Judul + Catatan Bertitik
              </button>
              <button
                onClick={() => openType(NOTE_TYPES.SHORT)}
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2"
              >
                <MessageSquare size={16} /> Catatan Singkat (maks 100 karakter)
              </button>
              <button
                onClick={() => openType(NOTE_TYPES.CHECKBOX)}
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm flex items-center gap-2"
              >
                <div className="w-4 h-4 border border-current rounded-sm flex items-center justify-center"><Check size={12} strokeWidth={3} /></div> Judul + Catatan Checkbox
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3"
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
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-8">
              {!isShort && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Judul
                  </label>
                  <input
                    type="text"
                    value={formData.judul}
                    onChange={(e) =>
                      setFormData({ ...formData, judul: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                    placeholder="Contoh: Belanja bulanan"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  {isBullet || isCheckbox
                    ? "Catatan (tekan Enter untuk poin baru)"
                    : "Isi Catatan"}
                </label>
                <textarea
                  value={formData.isi}
                  onChange={handleIsiChange}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                  rows={isShort ? 3 : 8}
                  maxLength={isShort ? 100 : undefined}
                  placeholder={
                    isBullet || isCheckbox
                      ? "Ketik catatan disini..."
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2 mb-2 flex items-center justify-center gap-2"
              >
                <Save size={16} />{" "}
                {editId ? "Simpan Perubahan" : "Simpan Catatan"}
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
