import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, X, Calculator, TrendingUp,
  Filter, ChevronDown, ChevronUp, History,
  ArrowDownCircle, ArrowUpCircle,
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import ConfirmModal from "../components/ConfirmModal";

export default function Pemasukan() {
  const [pemasukan, setPemasukan] = useState([]);
  const [pengeluaran, setPengeluaran] = useState([]);

  // Modal utama tambah/edit root pemasukan
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    nama: "", jumlah: "",
    tanggal: new Date().toISOString().split("T")[0],
    catatan: "",
  });
  const [calcInput, setCalcInput] = useState("");
  const [showCalc, setShowCalc] = useState(false);

  // Modal tambah sub-saldo (per item)
  const [showTambahSubModal, setShowTambahSubModal] = useState(false);
  const [editSubMode, setEditSubMode] = useState(false);
  const [editSubId, setEditSubId] = useState(null);
  const [subForm, setSubForm] = useState({
    parentId: "", tanggal: new Date().toISOString().split("T")[0],
    jumlah: "", catatan: "",
  });
  const [subCalcInput, setSubCalcInput] = useState("");
  const [showSubCalc, setShowSubCalc] = useState(false);

  // Modal keluar (per item)
  const [showKeluarModal, setShowKeluarModal] = useState(false);
  const [editKeluarMode, setEditKeluarMode] = useState(false);
  const [editKeluarId, setEditKeluarId] = useState(null);
  const [keluarParentId, setKeluarParentId] = useState(null);
  const [keluarParentNama, setKeluarParentNama] = useState("");
  const [keluarForm, setKeluarForm] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    jumlah: "", catatan: "",
  });
  const [keluarCalcInput, setKeluarCalcInput] = useState("");
  const [showKeluarCalc, setShowKeluarCalc] = useState(false);

  // History panel
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  // Filter bulan
  const [filterBulan, setFilterBulan] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    visible: false, title: "", message: "", onConfirm: null,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setPemasukan(LocalStorageService.readSheet(SHEETS.PEMASUKAN));
    setPengeluaran(LocalStorageService.readSheet(SHEETS.PENGELUARAN));
  };

  // ===== FORMAT HELPERS =====
  const fmtC = (num) => "Rp " + (Number(num) || 0).toLocaleString("id-ID");
  const fmtN = (num) => num ? Number(num).toLocaleString("id-ID") : "";
  const parseN = (str) => Number(String(str || "").replace(/\./g, "")) || 0;

  // ===== DATA RELATIONS =====
  const rootItems = pemasukan.filter((i) => !i.parent_id);

  const getSubTambah = (itemId) =>
    pemasukan
      .filter((i) => i.parent_id?.toString() === itemId?.toString())
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  const getKeluarList = (itemId) =>
    pengeluaran
      .filter((p) =>
        p.sourceRef?.toString() === itemId?.toString() &&
        p.sourceType === "pemasukan_keluar"
      )
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  const getSaldoAktif = (item) => {
    const root = parseFloat(item.jumlah) || 0;
    const subTotal = getSubTambah(item.id).reduce((s, i) => s + (parseFloat(i.jumlah) || 0), 0);
    const keluarTotal = getKeluarList(item.id).reduce((s, i) => s + (parseFloat(i.jumlah) || 0), 0);
    return root + subTotal - keluarTotal;
  };

  // ===== TOTALS =====
  const totalPemasukan = pemasukan.reduce((s, i) => s + (parseFloat(i.jumlah) || 0), 0);
  const totalPengeluaran = pengeluaran.reduce((s, i) => s + (parseFloat(i.jumlah) || 0), 0);
  const sisaSaldo = totalPemasukan - totalPengeluaran;

  // ===== FILTER =====
  const getMonthYear = (d) => { const dt = new Date(d); return `${dt.getMonth() + 1}-${dt.getFullYear()}`; };
  const uniqueBulan = [...new Set(rootItems.map((i) => getMonthYear(i.tanggal)))].sort((a, b) => {
    const [mA, yA] = a.split("-").map(Number);
    const [mB, yB] = b.split("-").map(Number);
    return yA !== yB ? yB - yA : mB - mA;
  });
  const filteredRoots = rootItems.filter((i) => filterBulan === "all" || getMonthYear(i.tanggal) === filterBulan);
  const sortedRoots = [...filteredRoots].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  // ===== CALCULATOR =====
  const safeEval = (input) => {
    try {
      const expr = input.replace(/\./g, "").replace(/[^-()\d/*+.]/g, "");
      if (!expr) return 0;
      // eslint-disable-next-line no-new-func
      const r = new Function(`return ${expr}`)();
      return isNaN(r) ? 0 : r;
    } catch { return 0; }
  };

  const calcKeys = ["7","8","9","C","4","5","6","←","1","2","3","+","0","00","-","*","/","="];

  const makeCalcHandler = (getCur, setCur, setNum) => (btn) => {
    const curVal = getCur();
    let next = curVal;
    if (btn === "C") { next = ""; setNum(0); }
    else if (btn === "←") { next = curVal.slice(0, -1); setNum(parseN(next)); }
    else if (btn === "=") {
      const r = safeEval(curVal);
      next = r ? r.toLocaleString("id-ID") : "";
      setNum(r);
    } else {
      next = curVal + btn;
      const expr = next.replace(/\./g, "").replace(/[^-()\d/*+.]/g, "");
      if (!isNaN(Number(expr))) setNum(Number(expr));
    }
    setCur(next);
  };

  const renderCalc = (handler) => (
    <div className="mt-1.5 p-2 bg-slate-900 rounded-lg grid grid-cols-4 gap-1 border border-slate-700">
      {calcKeys.map((btn) => (
        <button
          key={btn} type="button"
          onClick={() => handler(btn)}
          className={`p-1.5 rounded text-xs font-bold ${
            btn === "C" ? "bg-red-600/20 text-red-400" :
            btn === "=" ? "bg-green-600/20 text-green-400" :
            "bg-slate-800 hover:bg-slate-700 text-gray-300"
          }`}
        >{btn}</button>
      ))}
    </div>
  );

  const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white";
  const labelCls = "block text-xs text-gray-400 mb-1";

  // ===== HANDLERS: ROOT PEMASUKAN =====
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama || !formData.jumlah) { alert("Nama dan saldo harus diisi!"); return; }
    if (editMode && editId) {
      LocalStorageService.updateRow(SHEETS.PEMASUKAN, editId, formData);
    } else {
      LocalStorageService.appendRow(SHEETS.PEMASUKAN, formData);
    }
    resetForm(); loadData();
  };

  const handleEdit = (item) => {
    setEditMode(true); setEditId(item.id);
    setFormData({ nama: item.nama, jumlah: item.jumlah, tanggal: item.tanggal, catatan: item.catatan || "" });
    setCalcInput(fmtN(item.jumlah));
    setModalVisible(true);
  };

  const handleDelete = (item) => {
    setConfirmModal({
      visible: true,
      title: "Hapus Pemasukan",
      message: `Hapus "${item.nama}"? Semua data terkait ikut terhapus.`,
      onConfirm: () => {
        getSubTambah(item.id).forEach((s) => LocalStorageService.deleteRow(SHEETS.PEMASUKAN, s.id));
        getKeluarList(item.id).forEach((k) => LocalStorageService.deleteRow(SHEETS.PENGELUARAN, k.id));
        LocalStorageService.deleteRow(SHEETS.PEMASUKAN, item.id);
        loadData();
        setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  const resetForm = () => {
    setModalVisible(false); setEditMode(false); setEditId(null);
    setFormData({ nama: "", jumlah: "", tanggal: new Date().toISOString().split("T")[0], catatan: "" });
    setCalcInput(""); setShowCalc(false);
  };

  // ===== HANDLERS: SUB-TAMBAH =====
  const handleOpenSub = (item) => {
    setEditSubMode(false); setEditSubId(null);
    setSubForm({ parentId: item.id, tanggal: new Date().toISOString().split("T")[0], jumlah: "", catatan: "" });
    setSubCalcInput(""); setShowSubCalc(false);
    setShowTambahSubModal(true);
  };

  const handleEditSub = (subItem) => {
    setEditSubMode(true); setEditSubId(subItem.id);
    setSubForm({ parentId: subItem.parent_id, tanggal: subItem.tanggal, jumlah: subItem.jumlah, catatan: subItem.catatan || "" });
    setSubCalcInput(fmtN(subItem.jumlah));
    setShowSubCalc(false);
    setShowTambahSubModal(true);
  };

  const handleSubmitSub = (e) => {
    e.preventDefault();
    const jumlahNum = parseN(subCalcInput) || parseFloat(subForm.jumlah) || 0;
    if (!jumlahNum) { alert("Saldo harus diisi!"); return; }
    const data = { parent_id: subForm.parentId, jumlah: jumlahNum, tanggal: subForm.tanggal, catatan: subForm.catatan || "" };
    if (editSubMode && editSubId) {
      LocalStorageService.updateRow(SHEETS.PEMASUKAN, editSubId, data);
    } else {
      LocalStorageService.appendRow(SHEETS.PEMASUKAN, data);
    }
    setShowTambahSubModal(false); loadData();
  };

  const handleDeleteSub = (subItem) => {
    setConfirmModal({
      visible: true, title: "Hapus Tambah Saldo",
      message: `Hapus tambahan saldo ${fmtC(subItem.jumlah)}?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.PEMASUKAN, subItem.id);
        loadData(); setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  // ===== HANDLERS: KELUAR =====
  const handleOpenKeluar = (item) => {
    setEditKeluarMode(false); setEditKeluarId(null);
    setKeluarParentId(item.id); setKeluarParentNama(item.nama);
    setKeluarForm({ tanggal: new Date().toISOString().split("T")[0], jumlah: "", catatan: "" });
    setKeluarCalcInput(""); setShowKeluarCalc(false);
    setShowKeluarModal(true);
  };

  const handleEditKeluar = (kItem, parentItem) => {
    setEditKeluarMode(true); setEditKeluarId(kItem.id);
    setKeluarParentId(parentItem.id); setKeluarParentNama(parentItem.nama);
    setKeluarForm({ tanggal: kItem.tanggal, jumlah: kItem.jumlah, catatan: kItem.catatan || "" });
    setKeluarCalcInput(fmtN(kItem.jumlah));
    setShowKeluarCalc(false);
    setShowKeluarModal(true);
  };

  const handleSubmitKeluar = (e) => {
    e.preventDefault();
    const jumlahNum = parseN(keluarCalcInput) || parseFloat(keluarForm.jumlah) || 0;
    if (!jumlahNum) { alert("Saldo harus diisi!"); return; }
    const data = {
      nama: `Keluar: ${keluarParentNama}`,
      kategori: "Keluar Pemasukan",
      jumlah: jumlahNum,
      tanggal: keluarForm.tanggal,
      catatan: keluarForm.catatan || "",
      sourceRef: keluarParentId,
      sourceType: "pemasukan_keluar",
    };
    if (editKeluarMode && editKeluarId) {
      LocalStorageService.updateRow(SHEETS.PENGELUARAN, editKeluarId, data);
    } else {
      LocalStorageService.appendRow(SHEETS.PENGELUARAN, data);
    }
    setShowKeluarModal(false); loadData();
  };

  const handleDeleteKeluar = (kItem) => {
    setConfirmModal({
      visible: true, title: "Hapus Keluar",
      message: `Hapus saldo keluar ${fmtC(kItem.jumlah)}?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.PENGELUARAN, kItem.id);
        loadData(); setConfirmModal((p) => ({ ...p, visible: false }));
      },
    });
  };

  // ===== RENDER =====
  return (
    <div>
      {/* Ringkasan */}
      <div className="mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 shadow-lg text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-emerald-100 mb-1">Total Pemasukan</div>
            <div className="text-2xl font-bold">{fmtC(totalPemasukan)}</div>
          </div>
          <div className="bg-white/20 p-2 rounded-full"><TrendingUp size={24} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/20">
          <div>
            <div className="text-[10px] text-emerald-100">Total Pengeluaran</div>
            <div className="text-sm font-semibold">{fmtC(totalPengeluaran)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-emerald-100">Sisa Saldo</div>
            <div className={`text-sm font-semibold ${sisaSaldo < 0 ? "text-red-200" : "text-green-200"}`}>{fmtC(sisaSaldo)}</div>
          </div>
        </div>
      </div>

      {/* Filter Bulan */}
      <div className="mb-4 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-emerald-400" />
            <span className="text-sm font-medium text-white">Filter</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${filterBulan !== "all" ? "bg-emerald-600/30 text-emerald-300" : "text-gray-500"}`}>
              {filterBulan === "all" ? "Semua pemasukan" : (() => {
                const [m, y] = filterBulan.split("-");
                return new Date(y, m - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
              })()}
            </span>
          </div>
          <span className="text-gray-400">{showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
        </div>
        {showFilters && (
          <div className="p-3 pt-0 border-t border-slate-700">
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                onClick={() => setFilterBulan("all")}
                className={`px-2.5 py-1 text-xs rounded-full ${filterBulan === "all" ? "bg-emerald-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
              >Semua</button>
              {uniqueBulan.map((bulan) => {
                const [m, y] = bulan.split("-");
                const label = new Date(y, m - 1).toLocaleDateString("id-ID", { month: "short" });
                return (
                  <button key={bulan} onClick={() => setFilterBulan(bulan)}
                    className={`px-2.5 py-1 text-xs rounded-full ${filterBulan === bulan ? "bg-emerald-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"}`}
                  >{label} {y}</button>
                );
              })}
            </div>
            {filterBulan !== "all" && (
              <button onClick={() => setFilterBulan("all")} className="w-full mt-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 rounded-lg flex items-center justify-center gap-1">
                <X size={12} /> Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Daftar */}
      <div className="space-y-2">
        {sortedRoots.length > 0 ? (
          sortedRoots.map((item, i) => {
            const subTambah = getSubTambah(item.id);
            const keluarList = getKeluarList(item.id);
            const saldoAktif = getSaldoAktif(item);
            const showHistory = activeHistoryId === item.id;
            const historyCount = subTambah.length + keluarList.length;

            return (
              <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 border-l-4 border-l-emerald-500 p-2.5">
                {/* Baris 1: nama + jumlah */}
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-bold text-white truncate flex-1 mr-2">{item.nama}</h3>
                  <span className="text-sm font-bold text-emerald-400">{fmtC(item.jumlah)}</span>
                </div>

                {/* Baris 2: tanggal + saldo aktif */}
                <div className="flex items-center gap-1 text-[10px] mb-1 flex-wrap">
                  <span className="text-gray-500">
                    {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                  </span>
                  {saldoAktif !== (parseFloat(item.jumlah) || 0) && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">Aktif:</span>
                      <span className={`font-bold ${saldoAktif < 0 ? "text-red-400" : "text-teal-400"}`}>{fmtC(saldoAktif)}</span>
                    </>
                  )}
                  {historyCount > 0 && <span className="text-emerald-400 ml-auto">{historyCount} entri</span>}
                </div>

                {item.catatan && <div className="text-[9px] text-gray-500 italic mb-1 truncate">{item.catatan}</div>}

                {/* Tombol 5 kolom */}
                <div className="grid grid-cols-5 gap-1">
                  <button
                    onClick={() => handleOpenSub(item)}
                    className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[9px] py-1 rounded-lg flex items-center justify-center gap-0.5"
                  ><Plus size={10} /> Tambah</button>
                  <button
                    onClick={() => handleOpenKeluar(item)}
                    className="bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 text-[9px] py-1 rounded-lg flex items-center justify-center gap-0.5"
                  ><ArrowDownCircle size={10} /> Keluar</button>
                  <button
                    onClick={() => setActiveHistoryId(showHistory ? null : item.id)}
                    className={`text-[9px] py-1 rounded-lg flex items-center justify-center gap-0.5 ${showHistory ? "bg-violet-600/40 text-violet-300" : "bg-violet-600/20 hover:bg-violet-600/40 text-violet-400"}`}
                  ><History size={10} /> Histori {historyCount > 0 && `(${historyCount})`}</button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[9px] py-1 rounded-lg flex items-center justify-center gap-0.5"
                  ><Pencil size={10} /> Edit</button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-[9px] py-1 rounded-lg flex items-center justify-center gap-0.5"
                  ><Trash2 size={10} /> Hapus</button>
                </div>

                {/* History panel */}
                {showHistory && (
                  <div className="mt-2 bg-slate-900/60 rounded-lg border border-slate-700/50 p-2">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Riwayat</div>
                    {historyCount > 0 ? (
                      <div>
                        {subTambah.map((s) => (
                          <div key={s.id} className="border-b border-slate-700/40 pb-2 mb-2 last:border-0 last:mb-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <ArrowUpCircle size={8} /> Tambah
                                </span>
                                <span className="text-[10px] text-gray-300">
                                  {new Date(s.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-400">{fmtC(s.jumlah)}</span>
                            </div>
                            {s.catatan && <div className="text-[9px] text-gray-500 italic mb-1">{s.catatan}</div>}
                            <div className="flex gap-1 mt-1">
                              <button onClick={() => handleEditSub(s)}
                                className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[9px] py-0.5 rounded flex items-center justify-center gap-0.5">
                                <Pencil size={9} /> Edit
                              </button>
                              <button onClick={() => handleDeleteSub(s)}
                                className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-[9px] py-0.5 rounded flex items-center justify-center gap-0.5">
                                <Trash2 size={9} /> Hapus
                              </button>
                            </div>
                          </div>
                        ))}
                        {keluarList.map((k) => (
                          <div key={k.id} className="border-b border-slate-700/40 pb-2 mb-2 last:border-0 last:mb-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <ArrowDownCircle size={8} /> Keluar
                                </span>
                                <span className="text-[10px] text-gray-300">
                                  {new Date(k.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-orange-400">-{fmtC(k.jumlah)}</span>
                            </div>
                            {k.catatan && <div className="text-[9px] text-gray-500 italic mb-1">{k.catatan}</div>}
                            <div className="flex gap-1 mt-1">
                              <button onClick={() => handleEditKeluar(k, item)}
                                className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[9px] py-0.5 rounded flex items-center justify-center gap-0.5">
                                <Pencil size={9} /> Edit
                              </button>
                              <button onClick={() => handleDeleteKeluar(k)}
                                className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-[9px] py-0.5 rounded flex items-center justify-center gap-0.5">
                                <Trash2 size={9} /> Hapus
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-500 italic py-1 text-center">Belum ada riwayat</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            {filterBulan !== "all" ? "Tidak ada pemasukan di bulan ini" : "Belum ada pemasukan"}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setModalVisible(true)}
        className="fixed bottom-20 md:bottom-6 right-6 w-12 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center shadow-lg z-40"
      ><Plus size={22} /></button>

      {/* ========== MODAL TAMBAH/EDIT ROOT ========== */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-3" onClick={resetForm}>
          <div className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">{editMode ? "Edit" : "Tambah"} Pemasukan</h2>
              <button onClick={resetForm} className="p-1.5 hover:bg-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-3 space-y-3 pb-8">
              <div>
                <label className={labelCls}>Nama Pemasukan <span className="text-red-400">*</span></label>
                <input type="text" value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className={inputCls} placeholder="Contoh: Gaji Bulanan" required />
              </div>
              <div>
                <label className={labelCls}>Tanggal</label>
                <input type="date" value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className={inputCls} style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <label className={labelCls}>Saldo (Rp) <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type="text" value={calcInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      const num = raw ? parseInt(raw, 10) : 0;
                      setFormData({ ...formData, jumlah: num });
                      setCalcInput(num ? num.toLocaleString("id-ID") : "");
                    }}
                    className={`${inputCls} pr-8`} placeholder="0" />
                  <button type="button" onClick={() => setShowCalc(!showCalc)}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md ${showCalc ? "bg-emerald-600/20 text-emerald-400" : "text-gray-400 hover:text-white"}`}>
                    <Calculator size={16} />
                  </button>
                </div>
                {showCalc && renderCalc(makeCalcHandler(() => calcInput, setCalcInput, (v) => setFormData((p) => ({ ...p, jumlah: v }))))}
                <div className="text-[10px] text-gray-500 mt-1">{fmtC(formData.jumlah)}</div>
              </div>
              <div>
                <label className={labelCls}>Catatan</label>
                <textarea value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className={inputCls} rows="2" placeholder="Opsional" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2">
                {editMode ? "Update" : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL TAMBAH SUB-SALDO ========== */}
      {showTambahSubModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3" onClick={() => setShowTambahSubModal(false)}>
          <div className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">{editSubMode ? "Edit" : "Tambah"} Saldo Masuk</h2>
              <button onClick={() => setShowTambahSubModal(false)} className="p-1.5 hover:bg-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitSub} className="p-3 space-y-3 pb-8">
              <div>
                <label className={labelCls}>Tanggal</label>
                <input type="date" value={subForm.tanggal}
                  onChange={(e) => setSubForm({ ...subForm, tanggal: e.target.value })}
                  className={inputCls} style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <label className={labelCls}>Saldo (Rp) <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type="text" value={subCalcInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      const num = raw ? parseInt(raw, 10) : 0;
                      setSubForm({ ...subForm, jumlah: num });
                      setSubCalcInput(num ? num.toLocaleString("id-ID") : "");
                    }}
                    className={`${inputCls} pr-8`} placeholder="0" />
                  <button type="button" onClick={() => setShowSubCalc(!showSubCalc)}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md ${showSubCalc ? "bg-emerald-600/20 text-emerald-400" : "text-gray-400 hover:text-white"}`}>
                    <Calculator size={16} />
                  </button>
                </div>
                {showSubCalc && renderCalc(makeCalcHandler(() => subCalcInput, setSubCalcInput, (v) => setSubForm((p) => ({ ...p, jumlah: v }))))}
                <div className="text-[10px] text-gray-500 mt-1">{fmtC(subForm.jumlah)}</div>
              </div>
              <div>
                <label className={labelCls}>Catatan</label>
                <textarea value={subForm.catatan}
                  onChange={(e) => setSubForm({ ...subForm, catatan: e.target.value })}
                  className={inputCls} rows="2" placeholder="Opsional" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2">
                {editSubMode ? "Update" : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL KELUAR ========== */}
      {showKeluarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-3" onClick={() => setShowKeluarModal(false)}>
          <div className="bg-slate-800 rounded-t-xl md:rounded-xl w-full md:max-w-md max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-bold">{editKeluarMode ? "Edit" : "Tambah"} Keluar</h2>
                <div className="text-xs text-gray-400 truncate max-w-[240px]">dari: {keluarParentNama}</div>
              </div>
              <button onClick={() => setShowKeluarModal(false)} className="p-1.5 hover:bg-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitKeluar} className="p-3 space-y-3 pb-8">
              <div>
                <label className={labelCls}>Tanggal</label>
                <input type="date" value={keluarForm.tanggal}
                  onChange={(e) => setKeluarForm({ ...keluarForm, tanggal: e.target.value })}
                  className={inputCls} style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <label className={labelCls}>Saldo Keluar (Rp) <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type="text" value={keluarCalcInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      const num = raw ? parseInt(raw, 10) : 0;
                      setKeluarForm({ ...keluarForm, jumlah: num });
                      setKeluarCalcInput(num ? num.toLocaleString("id-ID") : "");
                    }}
                    className={`${inputCls} pr-8`} placeholder="0" />
                  <button type="button" onClick={() => setShowKeluarCalc(!showKeluarCalc)}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md ${showKeluarCalc ? "bg-orange-600/20 text-orange-400" : "text-gray-400 hover:text-white"}`}>
                    <Calculator size={16} />
                  </button>
                </div>
                {showKeluarCalc && renderCalc(makeCalcHandler(() => keluarCalcInput, setKeluarCalcInput, (v) => setKeluarForm((p) => ({ ...p, jumlah: v }))))}
                <div className="text-[10px] text-gray-500 mt-1">{fmtC(keluarForm.jumlah)}</div>
              </div>
              <div>
                <label className={labelCls}>Catatan</label>
                <textarea value={keluarForm.catatan}
                  onChange={(e) => setKeluarForm({ ...keluarForm, catatan: e.target.value })}
                  className={inputCls} rows="2" placeholder="Opsional" />
              </div>
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-medium text-sm mt-2">
                {editKeluarMode ? "Update" : "Simpan"}
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
