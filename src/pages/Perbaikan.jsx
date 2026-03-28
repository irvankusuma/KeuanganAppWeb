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
  History,
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";

export default function Perbaikan() {
  const [perbaikan, setPerbaikan] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [formData, setFormData] = useState({
    nama: "",
    tanggal: new Date().toISOString().split("T")[0],
    km_saat_ini: "",
    km_tambahan: "",
    biaya: "",
    catatan: "",
  });
  const [showCalc, setShowCalc] = useState({
    km_saat_ini: false,
    biaya: false,
  });
  const [calcInput, setCalcInput] = useState({ km_saat_ini: "", biaya: "" });

  // Tambah Servis modal
  const [showTambahModal, setShowTambahModal] = useState(false);
  const [editTambahMode, setEditTambahMode] = useState(false);
  const [editTambahId, setEditTambahId] = useState(null);
  const [tambahForm, setTambahForm] = useState({
    parentId: "",
    nama: "",
    tanggal: new Date().toISOString().split("T")[0],
    km_rekomendasi_sebelumnya: 0,
    km_saat_ini: "",
    km_ditentukan: "",
    biaya: "",
    catatan: "",
  });
  const [tambahCalc, setTambahCalc] = useState({ km_saat_ini: "", biaya: "" });
  const [tambahShowCalc, setTambahShowCalc] = useState({
    km_saat_ini: false,
    biaya: false,
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
  const loadData = () =>
    setPerbaikan(LocalStorageService.readSheet(SHEETS.PERBAIKAN));

  const parseN = (str) => {
    if (!str) return 0;
    return Number(String(str).replace(/\./g, ""));
  };
  const fmtN = (num) => {
    if (!num && num !== 0) return "";
    return Number(num).toLocaleString("id-ID");
  };
  const fmtC = (num) => {
    if (!num) return "Rp 0";
    return "Rp " + Number(num).toLocaleString("id-ID");
  };

  // Auto-calc KM Berikutnya di form utama
  const getKmBerikutnya = () => {
    const a = parseN(formData.km_saat_ini),
      b = parseN(formData.km_tambahan);
    return a ? fmtN(a + b) : "";
  };

  // Auto-calc KM Berikutnya di form tambah servis (readonly)
  const getTambahKmBerikutnya = () => {
    const a = parseN(tambahForm.km_saat_ini),
      b = parseN(tambahForm.km_ditentukan);
    return a && b ? fmtN(a + b) : a ? fmtN(a) : "";
  };

  const getTambahKmSelisih = () => {
    const current = parseN(tambahForm.km_saat_ini);
    const prev = tambahForm.km_rekomendasi_sebelumnya;
    if (!current && current !== 0) return "0";
    const res = current - prev;
    return res > 0 ? `+${fmtN(res)}` : fmtN(res);
  };

  const handleInputChange = (field, value, isTambah = false) => {
    const raw = value.replace(/[^\d]/g, "");
    const num = raw ? parseInt(raw, 10) : 0;
    const fmt = num ? num.toLocaleString("id-ID") : "";
    if (isTambah) {
      setTambahForm((p) => ({ ...p, [field]: fmt }));
      setTambahCalc((p) => ({ ...p, [field]: fmt }));
    } else {
      setFormData((p) => ({ ...p, [field]: fmt }));
      setCalcInput((p) => ({ ...p, [field]: fmt }));
    }
  };

  const safeEval = (input) => {
    try {
      const expr = input.replace(/\./g, "").replace(/[^-()\d/*+.]/g, "");
      if (!expr) return 0;
      // eslint-disable-next-line no-new-func
      const r = new Function(`return ${expr}`)();
      return isNaN(r) ? 0 : r;
    } catch {
      return 0;
    }
  };

  const handleCalc = (field, val, isTambah = false) => {
    const cur = isTambah ? tambahCalc[field] : calcInput[field];
    let next = cur;
    if (val === "C") next = "";
    else if (val === "←") next = cur.slice(0, -1);
    else if (val === "=") {
      const r = safeEval(cur);
      next = r ? r.toLocaleString("id-ID") : "";
    } else next = cur + val;
    if (isTambah) {
      setTambahCalc((p) => ({ ...p, [field]: next }));
      setTambahForm((p) => ({ ...p, [field]: next }));
    } else {
      setCalcInput((p) => ({ ...p, [field]: next }));
      setFormData((p) => ({ ...p, [field]: next }));
    }
  };

  const renderCalc = (field, isTambah = false) => (
    <div className="mt-1.5 p-2 bg-slate-900 rounded-lg grid grid-cols-4 gap-1 border border-slate-700">
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
          onClick={() => handleCalc(field, btn, isTambah)}
          className={`p-1.5 rounded text-xs font-bold ${btn === "C" ? "bg-red-600/20 text-red-400" : btn === "=" ? "bg-green-600/20 text-green-400" : "bg-slate-800 hover:bg-slate-700 text-gray-300"}`}
        >
          {btn}
        </button>
      ))}
    </div>
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const a = parseN(formData.km_saat_ini),
      b = parseN(formData.km_tambahan);
    if (!formData.nama || !a) {
      alert("Nama dan KM saat ini harus diisi!");
      return;
    }
    const data = {
      ...formData,
      km_saat_ini: a,
      km_tambahan: b,
      km_berikutnya: a + b,
      biaya: formData.biaya ? parseN(formData.biaya) : 0,
    };
    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.PERBAIKAN, editId, data);
    } else {
      LocalStorageService.appendRow(SHEETS.PERBAIKAN, data);
      if (data.biaya > 0)
        LocalStorageService.appendRow(SHEETS.PENGELUARAN, {
          nama: `Perbaikan: ${data.nama}`,
          kategori: "Perbaikan",
          jumlah: data.biaya,
          tanggal: data.tanggal,
          catatan: data.catatan || "",
        });
    }
    resetForm();
    loadData();
  };

  const handleOpenTambah = (item) => {
    // Ambil data terbaru (histori terbaru atau item sendiri) untuk km_rekomendasi_sebelumnya
    const latest = getLatestRecord(item);
    const kmRek =
      latest.km_berikutnya || latest.km_saat_ini + (latest.km_tambahan || 0);
    setEditTambahMode(false);
    setEditTambahId(null);
    setTambahForm({
      parentId: item.id,
      nama: item.nama,
      tanggal: new Date().toISOString().split("T")[0],
      km_rekomendasi_sebelumnya: kmRek,
      km_saat_ini: "",
      km_ditentukan: "",
      biaya: "",
      catatan: "",
    });
    setTambahCalc({ km_saat_ini: "", biaya: "" });
    setTambahShowCalc({ km_saat_ini: false, biaya: false });
    setShowTambahModal(true);
  };

  const handleEditHistory = (histItem, parentItem) => {
    setEditTambahMode(true);
    setEditTambahId(histItem.id);
    setTambahForm({
      parentId: histItem.parent_id || parentItem.id,
      nama: histItem.nama,
      tanggal: histItem.tanggal,
      km_rekomendasi_sebelumnya: histItem.km_rekomendasi_sebelumnya || 0,
      km_saat_ini: fmtN(histItem.km_saat_ini),
      km_ditentukan: fmtN(histItem.km_tambahan),
      biaya: histItem.biaya ? fmtN(histItem.biaya) : "",
      catatan: histItem.catatan || "",
    });
    setTambahCalc({
      km_saat_ini: fmtN(histItem.km_saat_ini),
      biaya: histItem.biaya ? fmtN(histItem.biaya) : "",
    });
    setTambahShowCalc({ km_saat_ini: false, biaya: false });
    setShowTambahModal(true);
  };

  const handleSubmitTambah = (e) => {
    e.preventDefault();
    const kmSaatIni = parseN(tambahForm.km_saat_ini);
    const kmDitentukan = parseN(tambahForm.km_ditentukan);
    // KM Berikutnya = KM Saat Ini + KM Ditentukan (auto)
    const kmBerikutnya = kmSaatIni + kmDitentukan;
    const biaya = tambahForm.biaya ? parseN(tambahForm.biaya) : 0;
    if (!kmSaatIni) {
      alert("KM Saat Ini harus diisi!");
      return;
    }
    const data = {
      nama: tambahForm.nama,
      tanggal: tambahForm.tanggal,
      km_saat_ini: kmSaatIni,
      km_tambahan: kmDitentukan,
      km_berikutnya: kmBerikutnya,
      km_rekomendasi_sebelumnya: tambahForm.km_rekomendasi_sebelumnya,
      parent_id: tambahForm.parentId,
      biaya,
      catatan: tambahForm.catatan || "",
    };
    if (editTambahMode && editTambahId) {
      LocalStorageService.updateRow(SHEETS.PERBAIKAN, editTambahId, data);
    } else {
      LocalStorageService.appendRow(SHEETS.PERBAIKAN, data);
      // Otomatis masuk pengeluaran jika ada biaya
      if (biaya > 0)
        LocalStorageService.appendRow(SHEETS.PENGELUARAN, {
          nama: `Perbaikan: ${data.nama}`,
          kategori: "Perbaikan",
          jumlah: biaya,
          tanggal: data.tanggal,
          catatan: data.catatan || "",
        });
    }
    setShowTambahModal(false);
    loadData();
  };

  const handleDeleteHistory = (histItem) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Histori",
      message: `Hapus histori servis tanggal ${histItem.tanggal}?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.PERBAIKAN, histItem.id);
        loadData();
        setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setEditId(item.id);
    const d = {
      nama: item.nama,
      tanggal: item.tanggal,
      km_saat_ini: fmtN(item.km_saat_ini),
      km_tambahan: item.km_tambahan ? fmtN(item.km_tambahan) : "",
      biaya: item.biaya ? fmtN(item.biaya) : "",
      catatan: item.catatan || "",
    };
    setFormData(d);
    setCalcInput({ km_saat_ini: d.km_saat_ini, biaya: d.biaya });
    setModalVisible(true);
  };

  const handleDelete = (item) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Perbaikan",
      message: `Apakah "${item.nama}" mau dihapus?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.PERBAIKAN, item.id);
        loadData();
        setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  const resetForm = () => {
    setModalVisible(false);
    setEditMode(false);
    setEditId(null);
    setFormData({
      nama: "",
      tanggal: new Date().toISOString().split("T")[0],
      km_saat_ini: "",
      km_tambahan: "",
      biaya: "",
      catatan: "",
    });
    setCalcInput({ km_saat_ini: "", biaya: "" });
    setShowCalc({ km_saat_ini: false, biaya: false });
  };

  const getSisaKM = (item) => {
    const kmB =
      item.km_berikutnya || item.km_saat_ini + (item.km_tambahan || 0);
    return kmB - item.km_saat_ini;
  };
  const getStatus = (item) => {
    const s = getSisaKM(item);
    if (s <= 0) return "overdue";
    if (s <= 500) return "due";
    return "upcoming";
  };

  // Root items (tidak punya parent_id)
  const rootItems = perbaikan.filter((i) => !i.parent_id);
  // Anak (histori) per root item
  const getHistory = (itemId) =>
    perbaikan
      .filter((i) => i.parent_id?.toString() === itemId?.toString())
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  // Data terbaru untuk card (anak terbaru atau item sendiri)
  const getLatestRecord = (item) => {
    const hist = getHistory(item.id);
    return hist.length > 0 ? hist[0] : item;
  };

  const filteredRoots = rootItems.filter((i) => {
    const latest = getLatestRecord(i);
    if (filterStatus === "all") return true;
    return getStatus(latest) === filterStatus;
  });
  const sortedData = [...filteredRoots].sort(
    (a, b) => getSisaKM(getLatestRecord(a)) - getSisaKM(getLatestRecord(b)),
  );

  const countStatus = {
    all: rootItems.length,
    upcoming: rootItems.filter(
      (i) => getStatus(getLatestRecord(i)) === "upcoming",
    ).length,
    due: rootItems.filter((i) => getStatus(getLatestRecord(i)) === "due")
      .length,
    overdue: rootItems.filter(
      (i) => getStatus(getLatestRecord(i)) === "overdue",
    ).length,
  };

  const statusCfg = {
    upcoming: {
      border: "border-l-green-500",
      badge: "bg-green-500/10 text-green-400",
      text: "Aman",
      km: "text-green-400",
    },
    due: {
      border: "border-l-yellow-500",
      badge: "bg-yellow-500/10 text-yellow-400",
      text: "Segera",
      km: "text-yellow-400",
    },
    overdue: {
      border: "border-l-red-500",
      badge: "bg-red-500/10 text-red-400",
      text: "Lewat",
      km: "text-red-400",
    },
  };

  const inputCls =
    "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white";
  const readonlyCls =
    "w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-2.5 text-sm cursor-not-allowed";
  const labelCls = "block text-xs text-gray-400 mb-1";

  return (
    <div>
      {/* Ringkasan */}
      <div className="mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-purple-100 mb-1">Total Perbaikan</div>
            <div className="text-2xl font-bold text-white">
              {rootItems.length} item
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <Wrench size={24} className="text-white" />
          </div>
        </div>
        <div className="mt-2 flex gap-3 text-xs text-purple-100">
          <span>Aman: {countStatus.upcoming}</span>
          <span>Segera: {countStatus.due}</span>
          <span>Lewat: {countStatus.overdue}</span>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-purple-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${filterStatus !== "all" ? "bg-purple-600/30 text-purple-300" : "text-gray-500"}`}
            >
              {filterStatus === "all"
                ? "Semua perbaikan"
                : `Status: ${statusCfg[filterStatus]?.text}`}
            </span>
          </div>
          <span className="text-gray-400">
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </div>
        {showFilters && (
          <div className="p-3 pt-0 border-t border-slate-700">
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { id: "all", label: "Semua", color: "bg-purple-600" },
                { id: "upcoming", label: "Aman", color: "bg-green-600" },
                { id: "due", label: "Segera", color: "bg-yellow-600" },
                { id: "overdue", label: "Lewat", color: "bg-red-600" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-2.5 py-1 text-xs rounded-full flex items-center gap-1 ${filterStatus === f.id ? `${f.color} text-white` : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
                >
                  {f.label}{" "}
                  <span className="text-[10px] bg-white/20 px-1 rounded-full">
                    {countStatus[f.id]}
                  </span>
                </button>
              ))}
            </div>
            {filterStatus !== "all" && (
              <button
                onClick={() => setFilterStatus("all")}
                className="w-full mt-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 rounded-lg flex items-center justify-center gap-1"
              >
                <X size={12} /> Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Daftar */}
      <div className="space-y-2">
        {sortedData.length > 0 ? (
          sortedData.map((item, i) => {
            const latest = getLatestRecord(item);
            const kmB =
              latest.km_berikutnya ||
              latest.km_saat_ini + (latest.km_tambahan || 0);
            const sisa = kmB - latest.km_saat_ini;
            const status = getStatus(latest);
            const cfg = statusCfg[status];
            const hari = Math.ceil(sisa / 50);
            const history = getHistory(item.id);
            const showHistory = activeHistoryId === item.id;

            return (
              <div
                key={i}
                className={`bg-slate-800 rounded-xl border border-slate-700 border-l-4 ${cfg.border} p-2.5`}
              >
                {/* Baris 1: nama + badge */}
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-bold text-white truncate flex-1 mr-2">
                    {item.nama}
                  </h3>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${cfg.badge}`}
                  >
                    {cfg.text}
                  </span>
                </div>
                {/* Baris 2: KM inline (dari data terbaru) */}
                <div className="flex items-center gap-1 text-[10px] mb-1 flex-wrap">
                  <span className="text-gray-500">KM:</span>
                  <span className="text-white">{fmtN(latest.km_saat_ini)}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-blue-400">{fmtN(kmB)}</span>
                  <span className="text-gray-600 mx-0.5">|</span>
                  <span className="text-gray-500">Sisa:</span>
                  <span className={`font-bold ${cfg.km}`}>
                    {sisa > 0 ? fmtN(sisa) : `−${fmtN(Math.abs(sisa))}`} km
                  </span>
                  {hari > 0 && status !== "overdue" && (
                    <span className="text-gray-500 ml-auto">~{hari} hr</span>
                  )}
                </div>
                {/* Baris 3: detail */}
                <div className="flex items-center gap-1.5 text-[9px] mb-2 text-gray-500 flex-wrap">
                  <span>
                    {new Date(latest.tanggal).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                  {latest.biaya > 0 && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="text-orange-400 font-medium">
                        {fmtC(latest.biaya)}
                      </span>
                    </>
                  )}
                  {latest.catatan && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="italic truncate max-w-[100px]">
                        {latest.catatan}
                      </span>
                    </>
                  )}
                  {history.length > 0 && (
                    <span className="text-purple-400 ml-auto">
                      {history.length} servis
                    </span>
                  )}
                </div>
                {/* Baris 4: tombol 4 kolom */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => handleOpenTambah(item)}
                    className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 text-[9px] py-1 rounded-lg flex items-center justify-center gap-0.5"
                  >
                    <Plus size={10} /> Tambah
                  </button>
                  <button
                    onClick={() =>
                      setActiveHistoryId(showHistory ? null : item.id)
                    }
                    className={`text-[9px] py-1 rounded-lg flex items-center justify-center gap-0.5 ${showHistory ? "bg-violet-600/40 text-violet-300" : "bg-violet-600/20 hover:bg-violet-600/40 text-violet-400"}`}
                  >
                    <History size={10} /> Histori{" "}
                    {history.length > 0 && `(${history.length})`}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[9px] py-1 rounded-lg flex items-center justify-center gap-0.5"
                  >
                    <Pencil size={10} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-[9px] py-1 rounded-lg flex items-center justify-center gap-0.5"
                  >
                    <Trash2 size={10} /> Hapus
                  </button>
                </div>

                {/* History panel */}
                {showHistory && (
                  <div className="mt-2 bg-slate-900/60 rounded-lg border border-slate-700/50 p-2">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                      Riwayat Servis
                    </div>
                    {history.length > 0 ? (
                      history.map((h) => {
                        const hKmB =
                          h.km_berikutnya ||
                          h.km_saat_ini + (h.km_tambahan || 0);
                        const hSisa = hKmB - h.km_saat_ini;
                        const hStatus = getStatus(h);
                        const hCfg = statusCfg[hStatus];
                        return (
                          <div
                            key={h.id}
                            className="border-b border-slate-700/40 pb-2 mb-2 last:border-0 last:mb-0"
                          >
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[10px] text-gray-300 font-medium">
                                {new Date(h.tanggal).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full ${hCfg.badge}`}
                              >
                                {hCfg.text}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 mb-0.5">
                              <span>KM: {fmtN(h.km_saat_ini)}</span>
                              <span className="text-gray-600">→</span>
                              <span className="text-blue-400">
                                {fmtN(hKmB)}
                              </span>
                              <span className="text-gray-600">|</span>
                              <span className={hCfg.km}>
                                {hSisa > 0
                                  ? fmtN(hSisa)
                                  : `−${fmtN(Math.abs(hSisa))}`}{" "}
                                km
                              </span>
                              {h.biaya > 0 && (
                                <>
                                  <span className="text-gray-600 ml-1">•</span>
                                  <span className="text-orange-400">
                                    {fmtC(h.biaya)}
                                  </span>
                                </>
                              )}
                            </div>
                            {h.catatan && (
                              <div className="text-[9px] text-gray-500 italic mb-1">
                                {h.catatan}
                              </div>
                            )}
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={() => handleEditHistory(h, item)}
                                className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[9px] py-0.5 rounded flex items-center justify-center gap-0.5"
                              >
                                <Pencil size={9} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteHistory(h)}
                                className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-[9px] py-0.5 rounded flex items-center justify-center gap-0.5"
                              >
                                <Trash2 size={9} /> Hapus
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[10px] text-gray-500 italic py-1 text-center">
                        Belum ada riwayat servis
                      </div>
                    )}
                  </div>
                )}
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
        className="fixed bottom-24 md:bottom-6 right-6 w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center shadow-lg z-40"
      >
        <Plus size={22} />
      </button>

      {/* Modal Tambah/Edit Data Utama */}
      {modalVisible && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3"
          onClick={resetForm}
        >
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">
                {editMode ? "Edit" : "Tambah"} Perbaikan
              </h2>
              <button
                onClick={resetForm}
                className="p-1.5 hover:bg-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-8">
              <div>
                <label className={labelCls}>
                  Nama Item <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  className={inputCls}
                  placeholder="Contoh: Ganti Oli"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>
                  Tanggal <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal: e.target.value })
                  }
                  className={inputCls}
                  style={{ colorScheme: "dark" }}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>
                  KM Saat Ini <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.km_saat_ini}
                    onChange={(e) =>
                      handleInputChange("km_saat_ini", e.target.value)
                    }
                    className={`${inputCls} pr-8`}
                    placeholder="0"
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowCalc((p) => ({
                        ...p,
                        km_saat_ini: !p.km_saat_ini,
                      }))
                    }
                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md ${showCalc.km_saat_ini ? "bg-purple-600/20 text-purple-400" : "text-gray-400 hover:text-white"}`}
                  >
                    <Calculator size={16} />
                  </button>
                </div>
                {showCalc.km_saat_ini && renderCalc("km_saat_ini")}
              </div>
              <div>
                <label className={labelCls}>+ KM Rekomendasi (Interval)</label>
                <input
                  type="text"
                  value={formData.km_tambahan}
                  onChange={(e) =>
                    handleInputChange("km_tambahan", e.target.value)
                  }
                  className={inputCls}
                  placeholder="Contoh: 5.000"
                />
              </div>
              <div>
                <label className={labelCls}>KM Berikutnya (otomatis)</label>
                <input
                  type="text"
                  value={getKmBerikutnya()}
                  readOnly
                  className={`${readonlyCls} text-blue-400`}
                  placeholder="Otomatis dihitung"
                />
              </div>
              <div>
                <label className={labelCls}>Biaya (Opsional)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.biaya}
                    onChange={(e) => handleInputChange("biaya", e.target.value)}
                    className={`${inputCls} pr-8`}
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowCalc((p) => ({ ...p, biaya: !p.biaya }))
                    }
                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md ${showCalc.biaya ? "bg-purple-600/20 text-purple-400" : "text-gray-400 hover:text-white"}`}
                  >
                    <Calculator size={16} />
                  </button>
                </div>
                {showCalc.biaya && renderCalc("biaya")}
                <p className="text-[9px] text-gray-500 mt-0.5">
                  Otomatis tercatat di Pengeluaran
                </p>
              </div>
              <div>
                <label className={labelCls}>Catatan (Opsional)</label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData({ ...formData, catatan: e.target.value })
                  }
                  className={inputCls}
                  rows="2"
                  placeholder="Merek, bengkel, dll..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium text-sm"
              >
                {editMode ? "Update" : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Servis */}
      {showTambahModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3"
          onClick={() => setShowTambahModal(false)}
        >
          <div
            className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">
                {editTambahMode ? "Edit" : "Tambah"} Servis
              </h2>
              <button
                onClick={() => setShowTambahModal(false)}
                className="p-1.5 hover:bg-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitTambah} className="p-3 space-y-3 pb-8 text-white">
              {/* Baris 1: Nama & Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nama Item</label>
                  <input type="text" value={tambahForm.nama} readOnly className={`${readonlyCls} text-gray-300 font-medium`} />
                </div>
                <div>
                  <label className={labelCls}>Tanggal Servis <span className="text-red-400">*</span></label>
                  <input type="date" value={tambahForm.tanggal} onChange={(e) => setTambahForm({ ...tambahForm, tanggal: e.target.value })} className={inputCls} style={{ colorScheme: "dark" }} required />
                </div>
              </div>

              {/* Baris 2: KM Rekomendasi & Selisih KM */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>KM Rekomendasi</label>
                  <input type="text" value={fmtN(tambahForm.km_rekomendasi_sebelumnya)} readOnly className={`${readonlyCls} text-blue-400 font-bold`} />
                  <p className="text-[9px] text-gray-500 mt-0.5 truncate">Target sebelumnya</p>
                </div>
                <div>
                  <label className={labelCls}>Selisih KM</label>
                  <input type="text" value={getTambahKmSelisih()} readOnly className={`${readonlyCls} font-bold ${parseN(getTambahKmSelisih()) >= 0 ? "text-green-400" : "text-red-400"}`} />
                  <p className="text-[9px] text-gray-500 mt-0.5 truncate">Hasil: Sekarang − Target</p>
                </div>
              </div>

              {/* Baris 3: KM Saat Ini & KM Ditentukan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>KM Saat Ini <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input type="text" value={tambahForm.km_saat_ini} onChange={(e) => handleInputChange("km_saat_ini", e.target.value, true)} className={`${inputCls} pr-8`} placeholder="0" required />
                    <button type="button" onClick={() => setTambahShowCalc((p) => ({ ...p, km_saat_ini: !p.km_saat_ini }))} className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md ${tambahShowCalc.km_saat_ini ? "bg-purple-600/20 text-purple-400" : "text-gray-400 hover:text-white"}`}><Calculator size={14} /></button>
                  </div>
                  {tambahShowCalc.km_saat_ini && renderCalc("km_saat_ini", true)}
                </div>
                <div>
                  <label className={labelCls}>KM Ditentukan (Interval)</label>
                  <input type="text" value={tambahForm.km_ditentukan} onChange={(e) => handleInputChange("km_ditentukan", e.target.value, true)} className={inputCls} placeholder="Contoh: 5.000" />
                </div>
              </div>

              {/* Baris 4: KM Berikutnya & Biaya */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>KM Berikutnya (Target)</label>
                  <input type="text" value={getTambahKmBerikutnya()} readOnly className={`${readonlyCls} text-blue-400 font-bold`} placeholder="Auto" />
                </div>
                <div>
                  <label className={labelCls}>Biaya Operasional</label>
                  <div className="relative">
                    <input type="text" value={tambahForm.biaya} onChange={(e) => handleInputChange("biaya", e.target.value, true)} className={`${inputCls} pr-8`} placeholder="0" />
                    <button type="button" onClick={() => setTambahShowCalc((p) => ({ ...p, biaya: !p.biaya }))} className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md ${tambahShowCalc.biaya ? "bg-purple-600/20 text-purple-400" : "text-gray-400 hover:text-white"}`}><Calculator size={14} /></button>
                  </div>
                  {tambahShowCalc.biaya && renderCalc("biaya", true)}
                </div>
              </div>

              {/* Baris 5: Catatan */}
              <div>
                <label className={labelCls}>Catatan (Opsional)</label>
                <textarea value={tambahForm.catatan} onChange={(e) => setTambahForm({ ...tambahForm, catatan: e.target.value })} className={inputCls} rows="2" placeholder="Merek oli, bengkel, dll..." />
              </div>

              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-bold text-sm shadow-lg transition">
                {editTambahMode ? "Update Record Servis" : "Simpan Record Servis"}
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
        onCancel={() => setConfirmModal((p) => ({ ...p, visible: false }))}
      />
    </div>
  );
}
