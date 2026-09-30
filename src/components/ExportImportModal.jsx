import { useState, useEffect } from "react";
import {
  Download,
  Upload,
  History,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";
import LocalStorageService, { SHEETS } from "../services/LocalStorageService";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "./ConfirmModal";
import * as XLSX from "xlsx";
import { formatCurrency } from "../utils/format";

// Nama sheet di file TXT ditulis kapital semua, jadi perlu dipetakan balik.
const TXT_SHEET_NAMES = Object.values(SHEETS).reduce((acc, name) => {
  acc[name.toUpperCase()] = name;
  return acc;
}, {});

const TXT_ID_KEYS = ["id", "parent_id", "sourceRef", "piutangId", "hutangId", "tagihanId"];

const coerceTxtValue = (key, raw) => {
  const value = raw.trim();
  if (value === "null" || value === "undefined") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (TXT_ID_KEYS.includes(key)) return value;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
};

const parseTxtRow = (line) => {
  const body = line.replace(/^\s*\d+\.\s*/, "").replace(/,\s*$/, "");
  const marks = [];
  const keyPattern = /(^|, )([A-Za-z0-9_]+): /g;
  let match;
  while ((match = keyPattern.exec(body)) !== null) {
    marks.push({ key: match[2], start: match.index + match[0].length, sepIndex: match.index });
  }
  if (marks.length === 0) return null;

  return marks.reduce((item, mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].sepIndex : body.length;
    item[mark.key] = coerceTxtValue(mark.key, body.slice(mark.start, end));
    return item;
  }, {});
};

const parseTXT = (text) => {
  if (!text || !/^\s*LAPORAN KEUANGAN/m.test(text)) return null;

  const data = Object.values(SHEETS).reduce((acc, name) => {
    acc[name] = [];
    return acc;
  }, {});
  let currentSheet = null;

  text.split(/\r?\n/).forEach((line) => {
    const header = line.match(/^\s*===\s*([A-Za-z0-9_]+)\s*===\s*$/);
    if (header) {
      currentSheet = TXT_SHEET_NAMES[header[1].toUpperCase()] || null;
      return;
    }
    if (!currentSheet || !/^\s*\d+\.\s+/.test(line)) return;
    const row = parseTxtRow(line);
    if (row) data[currentSheet].push(row);
  });

  const hasRows = Object.values(data).some((rows) => rows.length > 0);
  if (!hasRows) return null;

  return {
    exportDate: new Date().toISOString(),
    version: "1.0",
    appName: "KeuanganApp",
    data,
  };
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Ditunda agar browser sempat memulai unduhan sebelum URL dibatalkan.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function ExportImportModal({ visible, onClose }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("export");
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [exportFormat, setExportFormat] = useState("json");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  // Import confirmation modal state
  const [importConfirm, setImportConfirm] = useState({ visible: false, onConfirm: null, label: "" });

  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    if (visible && activeTab === "history") {
      loadHistory();
    }
  }, [visible, activeTab]);

  useEffect(() => {
    filterHistoryData();
  }, [
    history,
    filterType,
    filterMonth,
    filterYear,
    filterStartDate,
    filterEndDate,
  ]);

  const loadHistory = () => {
    const data = LocalStorageService.getAllHistory();
    setHistory(data);

    const months = [
      ...new Set(
        data
          .map((item) => {
            const date = new Date(item.date);
            return isNaN(date.getTime()) ? null : date.getMonth() + 1;
          })
          .filter((m) => m !== null),
      ),
    ].sort((a, b) => a - b);

    const years = [
      ...new Set(
        data
          .map((item) => {
            const date = new Date(item.date);
            return isNaN(date.getTime()) ? null : date.getFullYear();
          })
          .filter((y) => y !== null),
      ),
    ].sort((a, b) => b - a);

    setAvailableMonths(months);
    setAvailableYears(years);
  };

  const filterHistoryData = () => {
    let filtered = [...history];

    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.type === filterType);
    }

    if (filterMonth !== "all") {
      filtered = filtered.filter((item) => {
        const date = new Date(item.date);
        return (date.getMonth() + 1).toString() === filterMonth;
      });
    }

    if (filterYear !== "all") {
      filtered = filtered.filter((item) => {
        const date = new Date(item.date);
        return date.getFullYear().toString() === filterYear;
      });
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((item) => {
        const date = new Date(item.date);
        date.setHours(0, 0, 0, 0);
        return date >= start;
      });
    }

    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((item) => {
        const date = new Date(item.date);
        return date <= end;
      });
    }

    setFilteredHistory(filtered);
  };

  const resetFilters = () => {
    setFilterType("all");
    setFilterMonth("all");
    setFilterYear("all");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  // ==================== EXPORT ====================
  const handleExport = () => {
    try {
      const result = LocalStorageService.exportAllData();
      const sheets = result.data;

      if (!sheets || Object.keys(sheets).length === 0) {
        showToast("Tidak ada data untuk diekspor.", "warning");
        return;
      }

      if (exportFormat === "json") {
        exportJSON(result);
      } else if (exportFormat === "excel") {
        exportExcel(sheets);
      } else if (exportFormat === "txt") {
        exportTXT(sheets);
      }

      showToast(`Data berhasil diekspor sebagai ${exportFormat.toUpperCase()}!`, "success");
    } catch (error) {
      console.error("Export error:", error);
      showToast(`Gagal ekspor: ${error.message}`, "error");
    }
  };

  const exportJSON = (data) => {
    const json = JSON.stringify(data, null, 2);
    downloadBlob(new Blob([json], { type: "application/json" }), getFileName("json"));
  };

  const exportExcel = (sheets) => {
    if (typeof XLSX === "undefined") {
      throw new Error("Library XLSX tidak tersedia. Jalankan npm install xlsx");
    }

    const wb = XLSX.utils.book_new();

    Object.keys(sheets).forEach((sheetName) => {
      let sheetData = sheets[sheetName];
      if (!Array.isArray(sheetData)) {
        console.warn(
          `Sheet ${sheetName} bukan array, dikonversi ke array kosong`,
        );
        sheetData = [];
      }
      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, getFileName("xlsx"));
  };

  const exportTXT = (sheets) => {
    let text = `LAPORAN KEUANGAN\n`;
    text += `Tanggal Export: ${new Date().toLocaleDateString("id-ID")}\n`;
    text += `================================\n\n`;

    Object.keys(sheets).forEach((sheetName) => {
      text += `\n=== ${sheetName.toUpperCase()} ===\n`;
      let sheetData = sheets[sheetName];

      if (!Array.isArray(sheetData)) {
        text += "(Data tidak valid)\n";
        return;
      }

      if (sheetData.length === 0) {
        text += "(Kosong)\n";
      } else {
        sheetData.forEach((item, index) => {
          const pairs = Object.keys(item)
            .filter((key) => item[key] !== undefined)
            // Baris baru dipecah jadi satu baris agar file tetap bisa diimpor ulang.
            .map((key) => `${key}: ${String(item[key]).replace(/\r?\n/g, " / ")}`);
          text += `\n${index + 1}. ${pairs.join(", ")}\n`;
        });
      }
      text += "\n";
    });

    downloadBlob(new Blob([text], { type: "text/plain" }), getFileName("txt"));
  };

  // ==================== IMPORT ====================
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.xlsx,.xls,.txt";

    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        const extension = file.name.split(".").pop().toLowerCase();

        const doImport = (data, label) => {
          setImportConfirm({
            visible: true,
            label,
            onConfirm: () => {
              try {
                LocalStorageService.importAllData(data);
                showToast(`Data berhasil diimport dari ${label}!`, "success");
                setImportConfirm({ visible: false, onConfirm: null, label: "" });
                onClose();
                setTimeout(() => window.location.reload(), 800);
              } catch {
                showToast("Gagal menyimpan data import.", "error");
              }
            },
          });
        };

        if (extension === "json") {
          const text = await file.text();
          const data = JSON.parse(text);
          doImport(data, "JSON");
        } else if (extension === "xlsx" || extension === "xls") {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer);
          const importedData = { data: {} };
          wb.SheetNames.forEach((sheetName) => {
            importedData.data[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
          });
          doImport(importedData, "Excel");
        } else if (extension === "txt") {
          const text = await file.text();
          const importedData = parseTXT(text);
          if (!importedData) {
            showToast("File TXT tidak valid. Pastikan format sesuai ekspor aplikasi.", "error");
            return;
          }
          doImport(importedData, "TXT");
        } else {
          showToast("Format tidak didukung. Gunakan JSON, Excel, atau TXT.", "warning");
        }
      } catch (error) {
        console.error(error);
        showToast("Gagal membaca file. Pastikan file valid.", "error");
      }
    };
    input.click();
  };

  // ==================== DOWNLOAD FILTERED ====================

  const downloadFilteredExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const data = filteredHistory.map((item, index) => ({
        No: index + 1,
        Nama: item.title,
        Tipe: getTypeLabel(item.type),
        Nominal: item.amount,
        Tanggal: formatDate(item.date),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Riwayat Terfilter");
      XLSX.writeFile(wb, getFileName("xlsx", "History"));
      showToast("Riwayat berhasil diunduh sebagai Excel!", "success");
    } catch {
      showToast("Gagal mengunduh Excel.", "error");
    }
    setShowDownloadMenu(false);
  };

  const downloadFilteredTXT = () => {
    try {
      let text = `LAPORAN RIWAYAT KEUANGAN (TERFILTER) - KEUANGANAPP\n`;
      text += `Tanggal Export: ${new Date().toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      })}\n====================================================\n\n`;
      filteredHistory.forEach((item, index) => {
        text += `${index + 1}. Nama: ${item.title}\n`;
        text += `   Tipe: ${getTypeLabel(item.type)}\n`;
        text += `   Nominal: ${formatCurrency(item.amount)}\n`;
        text += `   Tanggal: ${formatDate(item.date)}\n`;
        text += `----------------------------------------------------\n`;
      });
      downloadBlob(new Blob([text], { type: "text/plain" }), getFileName("txt", "History"));
      showToast("Riwayat berhasil diunduh sebagai TXT!", "success");
    } catch {
      showToast("Gagal mengunduh TXT.", "error");
    }
    setShowDownloadMenu(false);
  };

  // ==================== HELPER ====================
  const getFileName = (ext, prefix = "") => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const baseName = `KeuanganApp ${day}-${month}-${year} ${hour}${minute}`;
    return prefix ? `${prefix} ${baseName}.${ext}` : `${baseName}.${ext}`;
  };

  const getTypeLabel = (type) => {
    const labels = {
      hutang: "Hutang",
      piutang: "Piutang",
      pemasukan: "Pemasukan",
      pengeluaran: "Pengeluaran",
      perbaikan: "Perbaikan",
      tagihan: "Tagihan",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      hutang: "text-red-500",
      piutang: "text-green-500",
      pemasukan: "text-emerald-500",
      pengeluaran: "text-orange-500",
      perbaikan: "text-blue-500",
      tagihan: "text-purple-500",
    };
    return colors[type] || "text-gray-500";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const historyTotalAmount = filteredHistory.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0,
  );

  if (!visible) return null;

  return (
    <>
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-3"
      onClick={onClose}
    >
      <div
        className="bg-[#0e1523] border border-[#1e2d45] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-base font-bold">Kelola Data</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {[
            { id: "export", label: "Ekspor", icon: Download },
            { id: "import", label: "Impor", icon: Upload },
            { id: "history", label: "Riwayat", icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border-b-2 ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              <tab.icon size={16} />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* EXPORT TAB */}
          {activeTab === "export" && (
            <div className="space-y-4">
              <div className="text-center">
                <Download size={48} className="mx-auto text-blue-500 mb-2" />
                <h3 className="text-base font-bold mb-1">Ekspor Data</h3>
                <p className="text-xs text-gray-400">
                  Download semua data dalam berbagai format.
                </p>
              </div>

              {/* Pilihan Format (tanpa PDF) */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Pilih Format:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "json",
                      label: "JSON",
                      icon: FileJson,
                      activeCls: "border-yellow-500 bg-yellow-500/10 text-yellow-300",
                    },
                    {
                      id: "excel",
                      label: "Excel",
                      icon: FileSpreadsheet,
                      activeCls: "border-green-500 bg-green-500/10 text-green-300",
                    },
                    {
                      id: "txt",
                      label: "TXT",
                      icon: FileText,
                      activeCls: "border-blue-500 bg-blue-500/10 text-blue-300",
                    },
                  ].map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setExportFormat(format.id)}
                      className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                        exportFormat === format.id
                          ? format.activeCls
                          : "border-slate-700 bg-slate-700/30 text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      <format.icon size={20} />
                      <span className="text-[10px] font-medium">{format.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tombol Export */}
              <button
                onClick={handleExport}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Ekspor Data
              </button>
            </div>
          )}

          {/* IMPORT TAB */}
          {activeTab === "import" && (
            <div className="space-y-4">
              <div className="text-center">
                <Upload size={48} className="mx-auto text-green-500 mb-2" />
                <h3 className="text-base font-bold mb-1">Impor Data</h3>
                <p className="text-xs text-gray-400">
                  Restore data dari file JSON, Excel, atau TXT.
                </p>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-3 text-xs">
                <p className="text-gray-300 mb-1">📌 Format yang didukung:</p>
                <ul className="text-gray-400 space-y-1 ml-4 list-disc">
                  <li>JSON - Export dari aplikasi ini</li>
                  <li>Excel (.xlsx, .xls) - Hasil export Excel</li>
                  <li>TXT - Hasil export TXT dari aplikasi ini</li>
                </ul>
              </div>

              {/* Tombol Import */}
              <button
                onClick={handleImport}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                Pilih File untuk Impor
              </button>
            </div>
          )}

          {/* HISTORY TAB (sama seperti sebelumnya) */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {/* Filter Bar */}
              <div className="bg-slate-700/30 rounded-lg border border-slate-700 overflow-hidden">
                <div
                  className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-700/50"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-blue-400" />
                    <span className="text-xs font-medium text-white">
                      Filter
                    </span>
                    {(filterType !== "all" ||
                      filterMonth !== "all" ||
                      filterYear !== "all" ||
                      filterStartDate ||
                      filterEndDate) && (
                      <span className="text-[10px] bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded-full">
                        Aktif
                      </span>
                    )}
                  </div>
                  {showFilters ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </div>

                {/* Filter Header for Download Icon */}
                <div className="flex items-center justify-between p-2 border-t border-slate-700 bg-slate-800/50">
                  <div className="text-[10px] text-gray-500 font-medium ml-1">
                    OPSI FILTER
                  </div>
                  <div className="relative">
                    <button
                      disabled={filteredHistory.length === 0}
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        filteredHistory.length === 0
                          ? "text-gray-600 cursor-not-allowed"
                          : "text-blue-400 hover:bg-slate-700"
                      }`}
                      title="Unduh Riwayat Terfilter"
                    >
                      <Download size={16} />
                    </button>

                    {showDownloadMenu && (
                      <div className="absolute right-0 mt-1 w-28 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        {[
                          { label: "Excel", action: downloadFilteredExcel },
                          { label: "TXT", action: downloadFilteredTXT },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            onClick={opt.action}
                            className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-slate-800 transition-colors border-b border-slate-700 last:border-0"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {showFilters && (
                  <div className="p-3 pt-0 border-t border-slate-700 space-y-3">
                    {/* Filter Tipe */}
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">
                        Tipe:
                      </label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="all">Semua Tipe</option>
                        <option value="hutang">Hutang</option>
                        <option value="piutang">Piutang</option>
                        <option value="pemasukan">Pemasukan</option>
                        <option value="pengeluaran">Pengeluaran</option>
                        <option value="perbaikan">Perbaikan</option>
                        <option value="tagihan">Tagihan</option>
                      </select>
                    </div>

                    {/* Filter Bulan & Tahun */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">
                          Bulan:
                        </label>
                        <select
                          value={filterMonth}
                          onChange={(e) => setFilterMonth(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        >
                          <option value="all">Semua Bulan</option>
                          {availableMonths.map((month) => (
                            <option key={month} value={month}>
                              {new Date(2000, month - 1).toLocaleDateString(
                                "id-ID",
                                { month: "long" },
                              )}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">
                          Tahun:
                        </label>
                        <select
                          value={filterYear}
                          onChange={(e) => setFilterYear(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        >
                          <option value="all">Semua Tahun</option>
                          {availableYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Filter Rentang Tanggal */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">
                          Dari Tanggal:
                        </label>
                        <input
                          type="date"
                          value={filterStartDate}
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">
                          Sampai Tanggal:
                        </label>
                        <input
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    {/* Tombol Reset */}
                    {(filterType !== "all" ||
                      filterMonth !== "all" ||
                      filterYear !== "all" ||
                      filterStartDate ||
                      filterEndDate) && (
                      <button
                        onClick={resetFilters}
                        className="w-full px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 rounded-lg flex items-center justify-center gap-1"
                      >
                        <X size={12} /> Reset Filter
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-3 bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Total Riwayat</div>
                    <div className="text-white font-semibold">
                      {filteredHistory.length} data
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400">Total Nominal</div>
                    <div className="text-blue-300 font-semibold">
                      {formatCurrency(historyTotalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Daftar History */}
              {filteredHistory.length > 0 ? (
                <div className="space-y-2">
                  {filteredHistory.map((item, i) => (
                    <div key={i} className="bg-slate-900 rounded-lg p-3">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div>
                          <div className="text-sm font-medium">
                            {item.title}
                          </div>
                          <div
                            className={`text-[10px] ${getTypeColor(item.type)}`}
                          >
                            {getTypeLabel(item.type)}
                          </div>
                        </div>
                        {item.amount > 0 && (
                          <div
                            className={`text-xs font-bold ${getTypeColor(item.type)}`}
                          >
                            {formatCurrency(item.amount)}
                          </div>
                        )}
                      </div>
                      <div className="text-[9px] text-gray-500">
                        {formatDate(item.date)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">
                  {history.length === 0
                    ? "Belum ada riwayat"
                    : "Tidak ada data dengan filter ini"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Import confirmation modal */}
    <ConfirmModal
      visible={importConfirm.visible}
      title="Konfirmasi Import"
      message={`Import dari ${importConfirm.label} akan MENIMPA semua data yang ada. Data lama tidak dapat dikembalikan. Lanjutkan?`}
      confirmText="Ya, Import"
      danger
      onConfirm={importConfirm.onConfirm}
      onCancel={() => setImportConfirm({ visible: false, onConfirm: null, label: "" })}
    />
    </>
  );
}
