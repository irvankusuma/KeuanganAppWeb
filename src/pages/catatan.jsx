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

  const handleEditDirectly = (item) => {
    const type = item.jenis || NOTE_TYPES.STANDARD;
    setEditId(item.id);
    setFormData({
      judul: item.judul || "",
      isi: item.isi || "",
      jenis: type,
    });
    setIsViewMode(false);
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
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors"
        />
      </div>

      <div className="card-grid-responsive">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((item) => {
            const type = item.jenis || NOTE_TYPES.STANDARD;
            return (
              <div
                key={item.id}
                ref={el => cardRefs.current[item.id] = el}
                className="bg-[#0c1220] border border-[#1e2d45] rounded-xl p-3 cursor-pointer hover:bg-slate-700/20 transition-all group flex flex-col h-full min-w-0"
                onClick={() => handleEdit(item)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
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
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  {type === NOTE_TYPES.BULLET ? (
                    <ul className="text-sm text-slate-300 space-y-1">
                      {bulletItems(item.isi || "")
                        .map((line, idx) => {
                          const text = line.replace(/^\s*[•*]?\s*/, "").trim();
                          return (
                            <li key={`${item.id}-${idx}`} className={`flex gap-2 items-start ${idx >= 3 ? 'note-extra-item' : ''}`}>
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                              <span className="flex-1 min-w-0 break-words line-clamp-2 leading-relaxed text-xs note-text-content">{text}</span>
                            </li>
                          );
                        })}
                      <li className="text-[10px] text-slate-500 italic mt-1 note-see-more">
                        ... lihat selebihnya
                      </li>
                    </ul>
                  ) : type === NOTE_TYPES.CHECKBOX ? (
                    <div className="text-sm text-slate-300 space-y-1">
                      {(item.isi || "")
                        .split("\n")
                        .map((line, i) => ({ line, i }))
                        .filter((x) => x.line.trim() !== "")
                        .map(({ line, i }, idx) => {
                          const isChecked = line.trim().startsWith("[x]");
                          const text = line.replace(/^\[[x ]\]\s*/i, "");

                          return (
                            <div
                              key={`${item.id}-${idx}`}
                              className={`flex items-start gap-2 ${idx >= 3 ? 'note-extra-item' : ''}`}
                            >
                              <div
                                onClick={(e) => toggleCheckbox(item, i, e)}
                                className="mt-0.5 shrink-0 cursor-pointer text-slate-500"
                              >
                                {isChecked ? (
                                  <div className="w-3.5 h-3.5 border border-blue-500 bg-blue-500 rounded-[3px] flex items-center justify-center">
                                    <Check size={10} className="text-white" strokeWidth={4} />
                                  </div>
                                ) : (
                                  <div className="w-3.5 h-3.5 border-[1.5px] border-slate-600 rounded-[3px]"></div>
                                )}
                              </div>
                              <span
                                className={`flex-1 min-w-0 break-words line-clamp-2 leading-relaxed text-xs note-text-content ${isChecked ? "text-slate-600 line-through" : ""}`}
                              >
                                {text}
                              </span>
                            </div>
                          );
                        })}
                      <div className="text-[10px] text-slate-500 italic mt-1 note-see-more">
                        ... lihat selebihnya
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 whitespace-pre-wrap line-clamp-4 leading-relaxed break-words note-text-content">
                      {item.isi}
                    </p>
                  )}
                </div>

                {/* Export Only Date */}
                <div className="hidden is-export-only-date mt-4 pt-3 border-t border-[#1e2d45]/50">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Waktu Terakhir</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(item)}</p>
                </div>

                {/* Footer Actions (Card Level) */}
                <div className="mt-auto pt-3 flex items-center gap-2 no-export">
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleEditDirectly(item); }}
                     className="btn-action-compact btn-action-blue"
                   >
                     <Pencil size={12} /> Edit
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                     className="btn-action-compact btn-action-red"
                   >
                     <Trash2 size={12} /> Hapus
                   </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-sm text-slate-400 py-14 bg-slate-800/30 border border-slate-700/50 rounded-2xl col-span-full">
            {search
              ? "Catatan tidak ditemukan."
              : "Belum ada catatan. Tambah catatan dari tombol +."}
          </div>
        )}
      </div>

      {showTypePicker && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[100] p-4"
          onClick={() => setShowTypePicker(false)}
        >
          <div
            className="bg-[#0c1220] rounded-3xl w-full md:max-w-sm border border-[#1e2d45] shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-none duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#1e2d45] flex justify-between items-center">
              <h2 className="text-sm font-bold text-white tracking-tight">Pilih Tipe Catatan</h2>
              <button
                onClick={() => setShowTypePicker(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {[
                { type: NOTE_TYPES.STANDARD, icon: Plus, label: "Catatan Standar", desc: "Judul & isi bebas" },
                { type: NOTE_TYPES.BULLET, icon: List, label: "Catatan List", desc: "Poin-poin otomatis" },
                { type: NOTE_TYPES.CHECKBOX, icon: Check, label: "Catatan Checkbox", desc: "Tugas dengan checklist" },
                { type: NOTE_TYPES.SHORT, icon: MessageSquare, label: "Catatan Singkat", desc: "Maksimal 100 karakter" },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => openType(item.type)}
                  className="w-full bg-slate-800/40 hover:bg-blue-500/10 border border-slate-700/50 hover:border-blue-500/30 rounded-2xl p-4 text-left transition-all flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 bg-slate-700/50 group-hover:bg-blue-600 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[110] p-4 md:p-6"
          onClick={isViewMode ? resetForm : undefined}
        >
          <div
            className="bg-[#0c1220] border border-[#1e2d45] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {isViewMode ? (
              /* VIEW MODE */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2d45] bg-[#0c1220]/80 backdrop-blur-md shrink-0">
                   <div className="flex items-center gap-2">
                     <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-lg uppercase tracking-wider border border-blue-500/20">
                       {getTypeLabel(selectedType)}
                     </span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <button 
                       onClick={() => setIsViewMode(false)} 
                       className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                     >
                       <Pencil size={12} /> EDIT
                     </button>
                     <button onClick={resetForm} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                       <X size={18} />
                     </button>
                   </div>
                </div>
                <div className="p-5 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-transparent to-black/10">
                  {!isShort && (
                    <h1 className="text-xl md:text-3xl font-bold text-white mb-6 leading-tight tracking-tight break-words">
                      {formData.judul || "Tanpa Judul"}
                    </h1>
                  )}
                  <div className="text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
                    {isCheckbox ? (
                       <div className="space-y-3">
                         {formData.isi.split('\n').filter(l => l.trim() !== '').map((line, i) => {
                           const isChecked = line.trim().toLowerCase().startsWith("[x]");
                           const text = line.replace(/^\[[x ]\]\s*/i, "");
                           return (
                             <div key={i} className="flex items-start gap-3 group">
                               <div 
                                 className="mt-0.5 shrink-0 cursor-pointer"
                                 onClick={(e) => toggleCheckboxInView(i, e)}
                                >
                                 {isChecked ? (
                                   <div className="w-5 h-5 bg-blue-500 hover:bg-blue-600 rounded-md flex items-center justify-center shadow-lg transition-colors border border-blue-400/50">
                                     <Check size={14} className="text-white" strokeWidth={4} />
                                   </div>
                                 ) : (
                                   <div className="w-5 h-5 border-[2px] border-[#1e2d45] hover:border-blue-500/50 rounded-md transition-colors bg-white/5" />
                                 )}
                               </div>
                               <span className={`flex-1 min-w-0 break-words font-medium transition-all ${isChecked ? "text-slate-600 line-through opacity-60" : "text-slate-100"}`}>{text}</span>
                             </div>
                           )
                         })}
                       </div>
                    ) : isBullet ? (
                       <ul className="space-y-3 list-none">
                         {formData.isi.split('\n').filter(l => l.trim() !== '').map((line, i) => {
                           const text = line.replace(/^\s*[•*]?\s*/, "").trim();
                           return (
                             <li key={i} className="flex items-start gap-3">
                               <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 shrink-0"></span>
                               <span className="flex-1 min-w-0 break-words text-slate-100 leading-relaxed">{text}</span>
                             </li>
                           )
                         })}
                       </ul>
                    ) : (
                       <div className="text-slate-200 leading-relaxed">
                         {formData.isi}
                       </div>
                    )}
                  </div>
                  <div className="mt-12 pt-8 border-t border-[#1e2d45]/30">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Waktu Terakhir</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{formatDateTime(editId ? catatan.find(c => c.id === editId) : {})}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2d45]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-500">
                      <Pencil size={14} />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-white tracking-tight">
                        {editId ? "Edit Catatan" : "Catatan Baru"}
                      </h2>
                    </div>
                  </div>
                  <button onClick={resetForm} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                    <X size={18} />
                  </button>
                </div>
                
                <form id="note-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 md:p-8 space-y-5 custom-scrollbar">
                  {!isShort && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">Judul Catatan</label>
                      <input
                        type="text"
                        value={formData.judul}
                        onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                        className="w-full bg-slate-900/40 border border-[#1e2d45] focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-slate-700 outline-none transition-all"
                        placeholder="Tulis judul..."
                        required
                        autoFocus
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 flex flex-col min-h-[300px]">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">Isi Catatan</label>
                    <textarea
                      value={formData.isi}
                      onChange={handleIsiChange}
                      onKeyDown={handleKeyDown}
                      className="flex-1 w-full bg-slate-900/40 border border-[#1e2d45] focus:border-blue-500/50 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-700 outline-none transition-all resize-none leading-relaxed custom-scrollbar whitespace-pre-wrap"
                      placeholder={isShort ? "Maksimal 100 karakter..." : "Mulai menulis catatan..."}
                      required
                      autoFocus={isShort}
                    />
                    {isShort && (
                      <div className="text-[10px] font-bold text-slate-500 mt-2 flex justify-end">
                        <span className={formData.isi.length >= 100 ? "text-orange-400" : ""}>
                          {formData.isi.length}
                        </span>
                        /100
                      </div>
                    )}
                  </div>
                </form>

                <div className="px-5 py-3 border-t border-[#1e2d45] flex justify-end gap-2 bg-[#0a0f1a]">
                  <button
                    type="button"
                    onClick={() => editId ? setIsViewMode(true) : resetForm()}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    form="note-form"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                  >
                    <Save size={14} /> Simpan
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
