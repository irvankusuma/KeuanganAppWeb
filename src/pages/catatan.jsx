import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
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
  Pin,
  MoreVertical
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import CardActionMenu from "../components/CardActionMenu";
import ShareDialog from "../components/ShareDialog";

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
  const [isViewMode, setIsViewMode] = useState(false);
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
    onConfirm: null,
  });
  const [shareData, setShareData] = useState({ isOpen: false, cardRef: null, title: '' });
  const cardRefs = useRef({});

  const { showToast } = useToast();

  const location = useLocation();

  useEffect(() => {
    loadData();
    if (location.state?.autoAdd) {
      setShowTypePicker(true);
    }
  }, [location.state]);

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
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return filterSort === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [catatan, search, filterType, filterSort]);

  const resetForm = () => {
    setFormData(initialForm);
    setEditId(null);
    setShowModal(false);
    setTimeout(() => setIsViewMode(false), 200); // Wait for transition
  };

  const openType = (type) => {
    let initialIsi = "";
    if (type === NOTE_TYPES.BULLET) initialIsi = "• ";
    if (type === NOTE_TYPES.CHECKBOX) initialIsi = "[ ] ";

    setFormData({ ...initialForm, jenis: type, isi: initialIsi });
    setEditId(null);
    setIsViewMode(false);
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

    if (e.key === "Enter") {
      if (isBulletType || isCheckboxType) {
        const linesBefore = value.substring(0, selectionStart).split("\n");
        const currentLineText = linesBefore[linesBefore.length - 1];
        const prefix = isBulletType
          ? "• "
          : currentLineText.toLowerCase().startsWith("[x] ")
            ? "[x] "
            : "[ ] ";

        // CASE: DOUBLE ENTER (pressing enter on empty list item ends it)
        if (currentLineText.trim() === prefix.trim()) {
          e.preventDefault();
          if (linesBefore.length > 1) {
            const removeLen = currentLineText.length + 1;
            const newValue =
              value.substring(0, selectionStart - removeLen) +
              "\n" +
              value.substring(selectionStart);
            const newPos = selectionStart - (removeLen - 1);
            setFormData({ ...formData, isi: newValue });
            setTimeout(() => {
              if (e.target) {
                e.target.selectionStart = newPos;
                e.target.selectionEnd = newPos;
              }
            }, 10);
          } else {
            // First line empty on enter -> clear it
            setFormData({ ...formData, isi: "" });
          }
          return;
        }

        e.preventDefault();
        const newlinePrefix = isBulletType ? "\n• " : "\n[ ] ";
        const newValue =
          value.substring(0, selectionStart) +
          newlinePrefix +
          value.substring(selectionStart);

        setFormData({ ...formData, isi: newValue });

        setTimeout(() => {
          if (e.target) {
            e.target.selectionStart = selectionStart + newlinePrefix.length;
            e.target.selectionEnd = selectionStart + newlinePrefix.length;
          }
        }, 10);
      }
    } else if (e.key === "Backspace") {
      if (!isBulletType && !isCheckboxType) return;

      const linesBefore = value.substring(0, selectionStart).split("\n");
      const currentLineText = linesBefore[linesBefore.length - 1];

      let prefix = isBulletType ? "• " : "[ ] ";
      if (isCheckboxType && currentLineText.toLowerCase().startsWith("[x] ")) {
        prefix = currentLineText.substring(0, 4);
      }

      const prefixLen = prefix.length;

      // If cursor is at or before the end of the prefix
      if (
        selectionStart <=
        linesBefore
          .join("\n")
          .substring(
            0,
            linesBefore.join("\n").length -
              (currentLineText.length - prefixLen),
          ).length
      ) {
        // Check if there is text after the prefix
        if (currentLineText.length > prefixLen) {
          // PROTECTED: Text exists, cannot delete prefix manually
          e.preventDefault();
        } else {
          // AUTOMATIC: Line is empty except for prefix, allow standard deletion to merge up
          if (linesBefore.length > 1) {
            e.preventDefault();
            const removeLen = currentLineText.length + 1;
            const newValue =
              value.substring(0, selectionStart - removeLen) +
              value.substring(selectionStart);
            const newPos = selectionStart - removeLen;
            setFormData({ ...formData, isi: newValue });
            setTimeout(() => {
              if (e.target) {
                e.target.selectionStart = newPos;
                e.target.selectionEnd = newPos;
              }
            }, 10);
          } else {
            // Keep the prefix on the first line if it's the only line?
            // Let's protect it as requested.
            e.preventDefault();
          }
        }
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isShort = formData.jenis === NOTE_TYPES.SHORT;

    // Clean up empty lines before saving
    let finalIsi = formData.isi;
    if (
      formData.jenis === NOTE_TYPES.BULLET ||
      formData.jenis === NOTE_TYPES.CHECKBOX
    ) {
      const prefix = formData.jenis === NOTE_TYPES.BULLET ? "• " : "[ ] ";
      finalIsi = finalIsi
        .split("\n")
        .filter((line) => line.trim() !== "" && line.trim() !== prefix.trim())
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
    setIsViewMode(true);
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

  const handleTogglePin = (id) => {
    const result = LocalStorageService.togglePin(SHEETS.CATATAN, id);
    if (result.success) {
      loadData();
    } else {
      showToast(result.message, "warning");
    }
  };

  const formatDateTime = (item) => {
    const raw = item.updatedAt || item.createdAt;
    if (!raw) return "-";
    const d = new Date(raw);
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}.${minutes}`;
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
    LocalStorageService.updateRow(SHEETS.CATATAN, item.id, {
      ...item,
      isi: newIsi,
    });
    loadData();
  };

  const toggleCheckboxInView = (visibleIdx, e) => {
    e.stopPropagation();
    const lines = (formData.isi || "").split("\n");
    
    // Map visible lines to original indices
    const visibleToOriginal = [];
    lines.forEach((l, i) => {
      if (l.trim() !== '') visibleToOriginal.push(i);
    });
    
    const actualIdx = visibleToOriginal[visibleIdx];
    if (actualIdx === undefined) return;

    let line = lines[actualIdx];
    if (line.trim().toLowerCase().startsWith("[x]")) {
      line = line.replace(/^\[x\]\s*/i, "[ ] ");
    } else if (line.trim().startsWith("[ ]")) {
      line = line.replace(/^\[ \]\s*/, "[x] ");
    } else {
      line = "[x] " + line;
    }
    lines[actualIdx] = line;

    const newIsi = lines.join("\n");
    setFormData({ ...formData, isi: newIsi });

    if (editId) {
      LocalStorageService.updateRow(SHEETS.CATATAN, editId, {
        judul: formData.judul,
        isi: newIsi,
        jenis: formData.jenis,
        tanggal: new Date().toISOString().split("T")[0],
      });
      loadData();
    }
  };

  const selectedType = formData.jenis;
  const isShort = selectedType === NOTE_TYPES.SHORT;
  const isBullet = selectedType === NOTE_TYPES.BULLET;
  const isCheckbox = selectedType === NOTE_TYPES.CHECKBOX;

  return (
    <div className="space-y-4 pb-28 md:pb-6">
      <button
        onClick={() => setShowTypePicker(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-40 transition-all hover:scale-110 active:scale-95"
        title="Tambah Catatan Baru"
      >
        <Plus size={28} />
      </button>
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
                ref={el => cardRefs.current[item.id] = el}
                className="bg-[#0c1220] border border-[#1e2d45] rounded-xl p-3 cursor-pointer hover:bg-slate-700/20 transition-all group"
                onClick={() => handleEdit(item)}
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-white tracking-tight truncate">
                        {item.judul || "Catatan Singkat"}
                      </h3>
                      {item.isPinned && <Pin size={10} className="text-blue-400 fill-current" />}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider text-slate-400 border border-slate-700/50">
                        {getTypeLabel(type)}
                      </span>
                      <span>•</span>
                      <span className="truncate">{formatDateTime(item).split(',')[0]}</span>
                    </div>
                  </div>
                  <div
                    className="flex gap-1 no-export"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CardActionMenu 
                      item={item}
                      onTogglePin={handleTogglePin}
                      onShare={(ref, t) => setShareData({ isOpen: true, cardRef: ref, title: t })}
                      cardRef={{ current: cardRefs.current[item.id] }}
                      title={`Catatan: ${item.judul || "Tanpa Judul"}`}
                      dataString={`${item.judul || "Catatan"}: ${item.isi}`}
                    />
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-md text-slate-600 hover:text-blue-400 hover:bg-white/5"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-white/5"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {type === NOTE_TYPES.BULLET ? (
                  <ul className="text-sm text-slate-200 mt-2 space-y-1">
                    {bulletItems(item.isi || "")
                      .slice(0, 3)
                      .map((line, idx) => {
                        const text = line.replace(/^\s*[•*]?\s*/, "").trim();
                        return (
                          <li key={`${item.id}-${idx}`} className="flex gap-2.5 items-start">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-500 shrink-0" />
                            <span className="flex-1 min-w-0 break-words line-clamp-2 leading-relaxed">{text}</span>
                          </li>
                        );
                      })}
                    {bulletItems(item.isi || "").length > 3 && (
                      <li className="text-xs text-slate-500 italic mt-1">
                        ... lihat selebihnya
                      </li>
                    )}
                  </ul>
                ) : type === NOTE_TYPES.CHECKBOX ? (
                  <div className="text-sm text-slate-200 mt-2 space-y-1">
                    {(item.isi || "")
                      .split("\n")
                      .map((line, i) => ({ line, i }))
                      .filter((x) => x.line.trim() !== "")
                      .slice(0, 4)
                      .map(({ line, i }, idx) => {
                        const isChecked = line.trim().startsWith("[x]");
                        const hasCheckbox =
                          line.trim().startsWith("[x]") ||
                          line.trim().startsWith("[ ]");
                        const text = hasCheckbox
                          ? line.replace(/^\[[x ]\]\s*/i, "")
                          : line;

                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            className="flex items-start gap-2"
                          >
                            <div
                              onClick={(e) => toggleCheckbox(item, i, e)}
                              className="mt-0.5 shrink-0 cursor-pointer text-slate-400 hover:text-white"
                            >
                              {isChecked ? (
                                <div className="w-4 h-4 border border-blue-500 bg-blue-500 rounded-[4px] flex items-center justify-center shadow-sm">
                                  <Check
                                    size={12}
                                    className="text-white"
                                    strokeWidth={3}
                                  />
                                </div>
                              ) : (
                                <div className="w-4 h-4 border-[1.5px] border-slate-500 rounded-[4px]"></div>
                              )}
                            </div>
                            <span
                              className={`flex-1 min-w-0 break-words line-clamp-2 leading-relaxed ${isChecked ? "text-slate-500 line-through" : ""}`}
                            >
                              {text}
                            </span>
                          </div>
                        );
                      })}
                    {(item.isi || "").split("\n").filter((l) => l.trim() !== "")
                      .length > 4 && (
                      <div className="text-xs text-slate-500 italic mt-1">
                        ... lihat selebihnya
                      </div>
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
                <div className="w-4 h-4 border border-current rounded-sm flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </div>{" "}
                Judul + Catatan Checkbox
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 md:p-6"
          onClick={isViewMode ? resetForm : undefined}
        >
          <div
            className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {isViewMode ? (
              /* VIEW MODE */
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d45]">
                   <div className="flex items-center gap-3">
                     <span className="text-xs font-medium px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg">
                       {getTypeLabel(selectedType)}
                     </span>
                   </div>
                   <div className="flex items-center gap-2">
                     <button onClick={() => setIsViewMode(false)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20">
                       <Pencil size={14} /> Edit
                     </button>
                     <button onClick={resetForm} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                       <X size={18} />
                     </button>
                   </div>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto">
                  {!isShort && (
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-tight">
                      {formData.judul || "Tanpa Judul"}
                    </h1>
                  )}
                  <div className="text-slate-300 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                    {isCheckbox ? (
                       <div className="space-y-3">
                         {formData.isi.split('\n').filter(l => l.trim() !== '').map((line, i) => {
                           const isChecked = line.trim().toLowerCase().startsWith("[x]");
                           const text = line.replace(/^\[[x ]\]\s*/i, "");
                           return (
                             <div key={i} className="flex items-start gap-3 group">
                               <div 
                                 className="mt-[3px] shrink-0 cursor-pointer"
                                 onClick={(e) => toggleCheckboxInView(i, e)}
                               >
                                 {isChecked ? (
                                   <div className="w-5 h-5 bg-blue-500 hover:bg-blue-600 rounded-md flex items-center justify-center shadow-sm transition-colors">
                                     <Check size={14} className="text-white" strokeWidth={3} />
                                   </div>
                                 ) : (
                                   <div className="w-5 h-5 border-[2px] border-[#334155] group-hover:border-blue-400 rounded-md transition-colors" />
                                 )}
                               </div>
                               <span className={`flex-1 min-w-0 break-words ${isChecked ? "text-slate-500 line-through" : "text-slate-200"}`}>{text}</span>
                             </div>
                           )
                         })}
                       </div>
                    ) : isBullet ? (
                       <ul className="space-y-2 list-none ml-0">
                         {formData.isi.split('\n').filter(l => l.trim() !== '').map((line, i) => {
                           const text = line.replace(/^\s*[•*]?\s*/, "").trim();
                           return (
                             <li key={i} className="flex items-start gap-3">
                               <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0"></span>
                               <span className="flex-1 min-w-0 break-words text-slate-200">{text}</span>
                             </li>
                           )
                         })}
                       </ul>
                    ) : (
                       <p className="whitespace-pre-wrap break-words">{formData.isi}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d45]">
                  <h2 className="text-sm font-semibold text-white">
                    {editId ? "Mode Edit" : "Catatan Baru"} <span className="text-slate-500 font-normal ml-1">({getTypeLabel(selectedType)})</span>
                  </h2>
                  <button onClick={resetForm} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    <X size={18} />
                  </button>
                </div>
                
                <form id="note-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                  {!isShort && (
                    <div>
                      <input
                        type="text"
                        value={formData.judul}
                        onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                        className="w-full bg-transparent border-b border-[#1e2d45] focus:border-blue-500 py-3 text-xl md:text-2xl font-bold text-white placeholder-slate-600 outline-none transition-colors"
                        placeholder="Judul Catatan..."
                        required
                        autoFocus
                      />
                    </div>
                  )}

                  <div>
                    <textarea
                      value={formData.isi}
                      onChange={handleIsiChange}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-[#141d2e]/50 border border-[#1e2d45] rounded-xl p-4 md:p-5 text-[15px] leading-relaxed text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-[#141d2e] focus:ring-4 focus:ring-blue-500/10 transition-all resize-none min-h-[300px]"
                      rows={isShort ? 5 : 12}
                      maxLength={isShort ? 100 : undefined}
                      placeholder={
                        isBullet || isCheckbox
                          ? "Ketik catatan disini... (Tekan Enter untuk poin baru)"
                          : isShort
                            ? "Tulis catatan singkat (maks 100 karakter)..."
                            : "Mulai menulis catatan Anda di sini..."
                      }
                      required
                      autoFocus={isShort}
                    />
                    {isShort && (
                      <div className="text-xs font-medium text-slate-500 mt-2 flex justify-end">
                        <span className={formData.isi.length >= 100 ? "text-orange-400" : ""}>
                          {formData.isi.length}
                        </span>
                        /100
                      </div>
                    )}
                  </div>
                </form>

                <div className="px-6 py-4 border-t border-[#1e2d45] flex justify-end gap-3 bg-[#0a0f1a]">
                  <button
                    type="button"
                    onClick={() => editId ? setIsViewMode(true) : resetForm()}
                    className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    form="note-form"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Save size={16} /> Simpan
                  </button>
                </div>
              </div>
            )}
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
      />
    </div>
  );
}
