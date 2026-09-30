import { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Pencil, Trash2, X, Pin, Filter,
  Search, Wallet, Check, Calendar
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import NumericInput from "../components/NumericInput";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import CardActionMenu from "../components/CardActionMenu";
import ShareDialog from "../components/ShareDialog";
import { todayStr, monthStr } from "../utils/dateUtils";
import { formatCurrency as fmtC } from "../utils/format";
import { makeTogglePin, pinnedFirst } from "../utils/pinUtils";
// ─── Konstanta Kategori ───────────────────────────────────────
const KATEGORI_PENDAPATAN = [
  "Gaji", "Freelance", "Bonus", "Jualan", "Komisi", "Investasi", "Lainnya"
];

const emptyCardForm = {
  nama: "",
  kategori: "Gaji",
  catatan: "",
};

const emptyHistForm = {
  id: "",
  jumlah: "",
  tanggal: todayStr(),
  catatan: "",
};

export default function Pendapatan() {
  const [items, setItems]               = useState([]); // Sumber Pendapatan (Cards)
  const [pemasukans, setPemasukans]     = useState([]); // Seluruh Pemasukan untuk riwayat
  
  // Modals & Forms
  const [cardModal, setCardModal]       = useState(false);
  const [cardEditMode, setCardEditMode] = useState(false);
  const [activeCardId, setActiveCardId] = useState(null);
  const [cardForm, setCardForm]         = useState(emptyCardForm);

  const [histModal, setHistModal]       = useState(false);
  const [histEditMode, setHistEditMode] = useState(false);
  const [activeHistId, setActiveHistId] = useState(null);
  const [histForm, setHistForm]         = useState(emptyHistForm);

  // Filter & Search
  const [search, setSearch]             = useState("");
  const [showFilter, setShowFilter]     = useState(false);
  const [filterKat, setFilterKat]       = useState("all");
  const [filterSort, setFilterSort]     = useState("newest");

  // Utilities
  const [confirm, setConfirm]           = useState({ visible: false, title: "", message: "", onConfirm: null });
  const [shareData, setShareData]       = useState({ isOpen: false, cardRef: null, title: "", caption: "" });

  const cardRefs = useRef({});
  const { showToast } = useToast();

  useEffect(() => {
    load();
  }, []);

  // ─── Load & Auto-migration ──────────────────────────────────
  const load = () => {
    const rawCards = LocalStorageService.readSheet(SHEETS.PENDAPATAN);
    const rawPemasukans = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
    let cardsChanged = false;
    let pemasukansChanged = false;

    // Migrasi data lama (jumlah > 0) ke sistem histori Pemasukan secara aman
    const migratedCards = rawCards.map(card => {
      if (card.jumlah && parseFloat(card.jumlah) > 0) {
        const hasHistory = rawPemasukans.some(p => p.sourceId === card.id.toString() && p.sourceType === "pendapatan");
        if (!hasHistory) {
          rawPemasukans.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            nama: `[Pendapatan: ${card.kategori}] ${card.nama}`,
            jumlah: parseFloat(card.jumlah),
            tanggal: card.tanggal || todayStr(),
            catatan: card.catatan || "Saldo awal migrasi",
            sourceId: card.id.toString(),
            sourceType: "pendapatan"
          });
          pemasukansChanged = true;
        }
        const { jumlah, tanggal, ...cleanedCard } = card;
        cardsChanged = true;
        return cleanedCard;
      }
      return card;
    });

    if (pemasukansChanged) {
      localStorage.setItem("@Pemasukan", JSON.stringify(rawPemasukans));
    }
    if (cardsChanged) {
      localStorage.setItem("@Pendapatan", JSON.stringify(migratedCards));
      setItems(migratedCards);
    } else {
      setItems(rawCards);
    }
    setPemasukans(LocalStorageService.readSheet(SHEETS.PEMASUKAN));
  };

  // ─── Data Selectors & Helpers ──────────────────────────────
  const getHistory = (cardId) => {
    return pemasukans
      .filter(p => p.sourceId === cardId.toString() && p.sourceType === "pendapatan")
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  };

  const getStats = (cardId) => {
    const hist = getHistory(cardId);
    const total = hist.reduce((s, h) => s + (parseFloat(h.jumlah) || 0), 0);
    const last = hist.length > 0 ? hist[0] : null;
    return { total, last, count: hist.length };
  };

  const globalStats = useMemo(() => {
    const hist = pemasukans.filter(p => p.sourceType === "pendapatan");
    const total = hist.reduce((s, h) => s + (parseFloat(h.jumlah) || 0), 0);
    const bulanIni = monthStr();
    const totalBulanIni = hist
      .filter(p => (p.tanggal || "").slice(0, 7) === bulanIni)
      .reduce((s, h) => s + (parseFloat(h.jumlah) || 0), 0);
    return { total, totalBulanIni, count: items.length };
  }, [items, pemasukans]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return [...items]
      .filter(item => {
        if (filterKat !== "all" && item.kategori !== filterKat) return false;
        if (kw) {
          const hay = `${item.nama} ${item.kategori} ${item.catatan || ""}`.toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pin = pinnedFirst(a, b);
        if (pin) return pin;
        const statsA = getStats(a.id);
        const statsB = getStats(b.id);
        return filterSort === "newest" ? (statsB.last?.tanggal || "").localeCompare(statsA.last?.tanggal || "") : (statsA.last?.tanggal || "").localeCompare(statsB.last?.tanggal || "");
      });
  }, [items, pemasukans, search, filterKat, filterSort]);

  // ─── Handlers: Kategori/Sumber Pendapatan ──────────────────
  const openAddCard = () => {
    setCardEditMode(false);
    setActiveCardId(null);
    setCardForm(emptyCardForm);
    setCardModal(true);
  };

  const handleEditCard = (card) => {
    setCardEditMode(true);
    setActiveCardId(card.id);
    setCardForm({
      nama: card.nama,
      kategori: card.kategori || "Gaji",
      catatan: card.catatan || "",
    });
    setCardModal(true);
  };

  const handleSubmitCard = (e) => {
    e.preventDefault();
    if (!cardForm.nama.trim()) { showToast("Nama sumber harus diisi", "error"); return; }
    
    const payload = {
      nama: cardForm.nama.trim(),
      kategori: cardForm.kategori,
      catatan: cardForm.catatan.trim(),
    };

    if (cardEditMode && activeCardId) {
      LocalStorageService.updateRow(SHEETS.PENDAPATAN, activeCardId, payload);
      // Sinkronkan nama histori lama di Pemasukan
      const hist = getHistory(activeCardId);
      hist.forEach(h => {
        LocalStorageService.updateRow(SHEETS.PEMASUKAN, h.id, {
          nama: `[Pendapatan: ${cardForm.kategori}] ${cardForm.nama.trim()}`
        });
      });
      showToast("Sumber pendapatan berhasil diperbarui", "success");
    } else {
      LocalStorageService.appendRow(SHEETS.PENDAPATAN, payload);
      showToast("Sumber pendapatan baru ditambahkan", "success");
    }
    setCardModal(false);
    load();
  };

  const handleDeleteCard = (card) => {
    setConfirm({
      visible: true,
      title: "Hapus Sumber Pendapatan",
      message: `Hapus "${card.nama}" beserta seluruh riwayat pemasukannya? Seluruh histori terkait di Pemasukan juga akan terhapus.`,
      onConfirm: () => {
        const hist = getHistory(card.id);
        hist.forEach(h => LocalStorageService.deleteRow(SHEETS.PEMASUKAN, h.id));
        LocalStorageService.deleteRow(SHEETS.PENDAPATAN, card.id);
        load();
        showToast("Sumber pendapatan berhasil dihapus", "success");
        setConfirm(p => ({ ...p, visible: false }));
      }
    });
  };

  const handlePin = makeTogglePin(SHEETS.PENDAPATAN, load, showToast);

  // ─── Handlers: Histori Pembayaran/Pemasukan ────────────────
  const openAddHist = (card) => {
    setActiveCardId(card.id);
    setHistEditMode(false);
    setHistForm({
      id: "",
      jumlah: "",
      tanggal: todayStr(),
      catatan: "",
    });
    setHistModal(true);
  };

  const openEditHist = (card, histItem) => {
    setActiveCardId(card.id);
    setHistEditMode(true);
    setActiveHistId(histItem.id);
    setHistForm({
      id: histItem.id,
      jumlah: histItem.jumlah,
      tanggal: histItem.tanggal,
      catatan: histItem.catatan || "",
    });
    setHistModal(true);
  };

  const handleSubmitHist = (e) => {
    e.preventDefault();
    if (!histForm.jumlah || !histForm.tanggal) { showToast("Jumlah dan tanggal harus diisi", "error"); return; }
    
    const card = items.find(c => c.id === activeCardId);
    const amt = parseFloat(histForm.jumlah) || 0;

    const payload = {
      nama: `[Pendapatan: ${card.kategori}] ${card.nama}`,
      jumlah: amt,
      tanggal: histForm.tanggal,
      catatan: histForm.catatan.trim(),
      sourceId: activeCardId.toString(),
      sourceType: "pendapatan",
    };

    if (histEditMode && activeHistId) {
      LocalStorageService.updateRow(SHEETS.PEMASUKAN, activeHistId, payload);
      showToast("Histori pendapatan berhasil diperbarui", "success");
    } else {
      LocalStorageService.appendRow(SHEETS.PEMASUKAN, payload);
      showToast("Pemasukan berhasil ditambahkan & tersinkronisasi", "success");
    }
    setHistModal(false);
    load();
  };

  const handleDeleteHist = (histItem) => {
    setConfirm({
      visible: true,
      title: "Hapus Histori Pemasukan",
      message: `Hapus pemasukan sebesar ${fmtC(histItem.jumlah)} tanggal ${formatDate(histItem.tanggal)}?`,
      onConfirm: () => {
        LocalStorageService.deleteRow(SHEETS.PEMASUKAN, histItem.id);
        load();
        showToast("Histori pemasukan berhasil dihapus", "success");
        setConfirm(p => ({ ...p, visible: false }));
      }
    });
  };

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const getKatColor = (k) => {
    const mapping = {
      Gaji:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      Freelance: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      Bonus:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      Jualan:    "bg-orange-500/10 text-orange-400 border-orange-500/20",
      Komisi:    "bg-purple-500/10 text-purple-400 border-purple-500/20",
      Investasi: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      Lainnya:   "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
    return mapping[k] || mapping["Lainnya"];
  };

  // ─── Render Card ──────────────────────────────────────────
  const renderCard = (card) => {
    const hist = getHistory(card.id);
    const { total, last, count } = getStats(card.id);
    
    const histLines = hist.map(h => `${formatDate(h.tanggal)} - ${fmtC(h.jumlah)}`).join("\n");
    const caption = `${card.nama} [${card.kategori}]
Total Keseluruhan: ${fmtC(total)}
Pendapatan Terakhir: ${last ? fmtC(last.jumlah) : "-"} (${last ? formatDate(last.tanggal) : "-"})

${card.catatan ? `Catatan:\n${card.catatan}\n` : ""}
${hist.length > 0 ? `Riwayat Pemasukan:\n${histLines}` : ""}`.trim();

    return (
      <div
        key={card.id}
        ref={(el) => { cardRefs.current[card.id] = el; }}
        className="bg-[#0c1220] rounded-2xl p-3 border border-[#1e2d45] border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-start gap-1.5 mb-2 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-xs font-bold text-white truncate">{card.nama}</h3>
              {card.isPinned && <Pin size={9} className="text-blue-400 fill-current shrink-0 animate-pulse" />}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getKatColor(card.kategori)}`}>
                {card.kategori}
              </span>
              {card.catatan && (
                <span className="text-[9px] text-slate-500 truncate max-w-[120px] italic">
                  {card.catatan}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <CardActionMenu
              item={card}
              onTogglePin={handlePin}
              onShare={(ref, t, cap) => setShareData({ isOpen: true, cardRef: ref, title: t, caption: cap })}
              cardRef={{ get current() { return cardRefs.current[card.id]; } }}
              title={`Pendapatan: ${card.nama}`}
              caption={caption}
              dataString={`${card.nama} (${card.kategori}) - Total ${fmtC(total)}`}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 py-1.5 border-t border-b border-[#1e2d45]/40 mb-2 shrink-0 text-left">
          <div className="min-w-0">
            <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider mb-0.5">Total Keseluruhan</div>
            <div className="text-xs font-extrabold text-blue-400 truncate tabular-nums">{fmtC(total)}</div>
          </div>
          <div className="min-w-0 border-l border-[#1e2d45]/30 pl-2">
            <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider mb-0.5">Terakhir</div>
            {last ? (
              <div className="truncate">
                <span className="text-[10px] font-bold text-slate-300 tabular-nums">{fmtC(last.jumlah)}</span>
                <span className="text-[8px] text-slate-500 block leading-none">{formatDate(last.tanggal)}</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-600 italic">-</span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1 no-export mb-2 shrink-0">
          <button
            onClick={() => openAddHist(card)}
            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/10 text-[9px] font-bold transition-all active:scale-95"
          >
            <Plus size={10} /><span>Tambah</span>
          </button>
          <button
            onClick={() => handleEditCard(card)}
            className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50 text-[9px] font-bold transition-all active:scale-95"
            title="Edit Kategori"
          >
            <Pencil size={10} />
          </button>
          <button
            onClick={() => handleDeleteCard(card)}
            className="py-1 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 text-[9px] font-bold transition-all active:scale-95"
            title="Hapus Kategori"
          >
            <Trash2 size={10} />
          </button>
        </div>

        {/* Inline History List */}
        <div className="bg-[#0a0f1a] rounded-xl border border-[#1e2d45]/60 overflow-hidden flex-1 flex flex-col min-h-[100px]">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#1e2d45]/40 shrink-0 bg-slate-900/50">
            <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wider">Riwayat Pendapatan</span>
            <span className="text-[8px] text-slate-600 italic font-semibold">{count} entri</span>
          </div>
          {hist.length > 0 ? (
            <div className="divide-y divide-[#1e2d45]/20 max-h-[140px] overflow-y-auto custom-scrollbar flex-1">
              {hist.map((h) => (
                <div key={h.id} className="flex justify-between items-center px-2.5 py-1.5 hover:bg-white/[0.01] transition-all group">
                  <div className="min-w-0 flex-1 pr-1.5">
                    <div className="text-[10px] text-slate-300 font-medium truncate flex items-center gap-1">
                      <Calendar size={8} className="text-slate-600 shrink-0" />
                      <span>{formatDate(h.tanggal)}</span>
                    </div>
                    {h.catatan && (
                      <div className="text-[8px] text-slate-600 truncate max-w-[150px] mt-0.5 leading-none italic">{h.catatan}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-bold text-emerald-400 text-[10px] tabular-nums">{fmtC(h.jumlah)}</span>
                    <div className="flex items-center gap-0.5 no-export opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditHist(card, h)}
                        className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-blue-400 rounded transition-colors"
                        title="Edit Histori"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteHist(h)}
                        className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded transition-colors"
                        title="Hapus Histori"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center flex-1">
              <p className="text-[9px] text-slate-600 italic">Belum ada riwayat masuk.</p>
              <button
                onClick={() => openAddHist(card)}
                className="mt-1 text-[9px] text-blue-400 hover:underline font-semibold"
              >
                Catat Pemasukan
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 pb-24 md:pb-6">
      {/* FAB */}
      <button
        onClick={openAddCard}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 z-40 transition-all hover:scale-110 active:scale-95"
        title="Tambah Sumber Pendapatan"
      >
        <Plus size={24} />
      </button>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 gap-2 text-left">
        <div className="bg-[#0c1220] border border-[#1e2d45] rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider mb-0.5">Total Pendapatan</div>
          <div className="text-lg font-extrabold text-blue-400 tracking-tight tabular-nums">{fmtC(globalStats.total)}</div>
          <div className="text-[9px] text-slate-500 mt-0.5">{globalStats.count} sumber penghasilan</div>
        </div>
        <div className="bg-[#0c1220] border border-[#1e2d45] rounded-xl p-3 flex flex-col justify-center">
          <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider mb-0.5">Bulan Ini</div>
          <div className="text-lg font-extrabold text-emerald-400 tracking-tight tabular-nums">{fmtC(globalStats.totalBulanIni)}</div>
          <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
            <Check size={8} className="text-emerald-400" />
            Auto sync ke Pemasukan
          </div>
        </div>
      </div>

      {/* Compact Search & Filter */}
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kategori..."
            className="w-full bg-[#0c1220] border border-[#1e2d45] rounded-xl pl-8 pr-3 py-2 text-[11px] text-white placeholder-slate-600 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`px-3 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all ${
            showFilter || filterKat !== "all"
              ? "bg-blue-600/10 text-blue-400 border-blue-500/30"
              : "bg-[#0c1220] text-slate-400 border-[#1e2d45] hover:text-slate-200"
          }`}
        >
          <Filter size={12} />
          <span>Filter</span>
        </button>
      </div>

      {/* Compact Filter Panel */}
      {showFilter && (
        <div className="bg-[#0c1220] border border-[#1e2d45] rounded-xl p-3 space-y-2 text-left animate-in fade-in duration-200">
          <div>
            <div className="text-[8px] text-slate-500 uppercase font-extrabold mb-1">Kategori</div>
            <div className="flex flex-wrap gap-1">
              {["all", ...KATEGORI_PENDAPATAN].map((k) => (
                <button
                  key={k}
                  onClick={() => setFilterKat(k)}
                  className={`px-2 py-0.5 text-[9px] rounded-md font-bold transition-all ${
                    filterKat === k
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {k === "all" ? "Semua" : k}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[8px] text-slate-500 uppercase font-extrabold mb-1">Urutan</div>
            <div className="flex gap-1">
              {[
                { v: "newest", l: "Terbaru" },
                { v: "oldest", l: "Terlama" },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setFilterSort(v)}
                  className={`px-2 py-0.5 text-[9px] rounded-md font-bold transition-all ${
                    filterSort === v
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.length > 0 ? (
          filtered.map((card) => renderCard(card))
        ) : (
          <div className="text-center py-10 bg-[#0c1220]/30 border border-dashed border-[#1e2d45] rounded-xl col-span-full">
            <Wallet size={20} className="mx-auto text-slate-600 mb-1" />
            <p className="text-slate-400 text-xs font-semibold">
              Tidak ada sumber pendapatan yang sesuai.
            </p>
            <button
              onClick={openAddCard}
              className="mt-1.5 text-[10px] text-blue-400 hover:underline font-bold"
            >
              Tambah Baru
            </button>
          </div>
        )}
      </div>

      {/* Modal: Tambah/Edit Card */}
      {cardModal && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100] p-4 backdrop-blur-sm"
          onClick={() => setCardModal(false)}
        >
          <div
            className="bg-[#0c1220] border border-[#1e2d45] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#1e2d45] flex justify-between items-center shrink-0">
              <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
                {cardEditMode ? "Edit Sumber" : "Tambah Sumber Pendapatan"}
              </h2>
              <button
                onClick={() => setCardModal(false)}
                className="p-1 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmitCard} className="p-4 space-y-3">
              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase block mb-1">
                  Nama Sumber / Perusahaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cardForm.nama}
                  onChange={(e) => setCardForm({ ...cardForm, nama: e.target.value })}
                  required
                  placeholder="Contoh: Gaji Kantor, Freelance UI, Jualan Baju"
                  className="w-full bg-slate-900 border border-[#1e2d45] rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase block mb-1">Kategori</label>
                <div className="flex flex-wrap gap-1">
                  {KATEGORI_PENDAPATAN.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCardForm({ ...cardForm, kategori: k })}
                      className={`px-2.5 py-1 text-[10px] rounded-lg font-bold border transition-all ${
                        cardForm.kategori === k
                          ? "bg-blue-600 text-white border-blue-500 shadow-md"
                          : "bg-slate-800 text-slate-400 border-slate-700/50 hover:border-slate-600"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase block mb-1">Catatan Utama (opsional)</label>
                <input
                  type="text"
                  value={cardForm.catatan}
                  onChange={(e) => setCardForm({ ...cardForm, catatan: e.target.value })}
                  placeholder="Contoh: Setiap tanggal 25, Kontrak 6 bulan"
                  className="w-full bg-slate-900 border border-[#1e2d45] rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition-all active:scale-[0.98] mt-2"
              >
                {cardEditMode ? "Simpan Perubahan" : "Buat Sumber Pendapatan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah/Edit Histori (Pemasukan) */}
      {histModal && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100] p-4 backdrop-blur-sm"
          onClick={() => setHistModal(false)}
        >
          <div
            className="bg-[#0c1220] border border-[#1e2d45] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#1e2d45] flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  {histEditMode ? "Edit Riwayat Pendapatan" : "Catat Pemasukan Pendapatan"}
                </h2>
                <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                  Sumber: {items.find(c => c.id === activeCardId)?.nama}
                </p>
              </div>
              <button
                onClick={() => setHistModal(false)}
                className="p-1 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmitHist} className="p-4 space-y-3">
              <NumericInput
                label="Jumlah yang Diterima"
                value={histForm.jumlah}
                onChange={(v) => setHistForm({ ...histForm, jumlah: v ? Number(v) : "" })}
                required
              />

              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase block mb-1">Tanggal Diterima</label>
                <input
                  type="date"
                  value={histForm.tanggal}
                  onChange={(e) => setHistForm({ ...histForm, tanggal: e.target.value })}
                  required
                  className="w-full bg-slate-900 border border-[#1e2d45] rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase block mb-1">Keterangan / Catatan (opsional)</label>
                <input
                  type="text"
                  value={histForm.catatan}
                  onChange={(e) => setHistForm({ ...histForm, catatan: e.target.value })}
                  placeholder="Contoh: Bonus lembur, Termin 1"
                  className="w-full bg-slate-900 border border-[#1e2d45] rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5 text-[10px] text-blue-300">
                💡 Histori ini disinkronkan secara otomatis dan aman dengan halaman <strong>Pemasukan</strong>.
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-all active:scale-[0.98] mt-1"
              >
                {histEditMode ? "Simpan Perubahan" : "Konfirmasi Terima Pendapatan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <ConfirmModal
        visible={confirm.visible}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(p => ({ ...p, visible: false }))}
      />

      {/* Share Dialog */}
      <ShareDialog
        isOpen={shareData.isOpen}
        onClose={() => setShareData(p => ({ ...p, isOpen: false }))}
        cardRef={shareData.cardRef}
        title={shareData.title}
        caption={shareData.caption}
      />
    </div>
  );
}
