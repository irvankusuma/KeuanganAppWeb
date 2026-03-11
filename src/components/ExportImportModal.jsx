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
import LocalStorageService from "../services/LocalStorageService";
import * as XLSX from "xlsx";

export default function ExportImportModal({ visible, onClose }) {
  const [activeTab, setActiveTab] = useState("export");
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [exportFormat, setExportFormat] = useState("json");

  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    if (visible && activeTab === "history") {
      loadHistory();
    }
  }, [visible, activeTab]);

  useEffect(() => {
    filterHistoryData();
  }, [history, filterType, filterMonth, filterYear]);

  const loadHistory = () => {
    const data = LocalStorageService.getAllHistory();
    setHistory(data);

    const months = [
      ...new Set(
        data.map((item) => {
          const date = new Date(item.date);
          return date.getMonth() + 1;
        }),
      ),
    ].sort((a, b) => a - b);

    const years = [
      ...new Set(
        data.map((item) => {
          const date = new Date(item.date);
          return date.getFullYear();
        }),
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

    setFilteredHistory(filtered);
  };

  const resetFilters = () => {
    setFilterType("all");
    setFilterMonth("all");
    setFilterYear("all");
  };

  // ==================== EXPORT ====================
  const handleExport = () => {
    try {
      const result = LocalStorageService.exportAllData();
      const sheets = result.data;

      if (!sheets || Object.keys(sheets).length === 0) {
        throw new Error("Tidak ada data untuk diekspor.");
      }

      if (exportFormat === "json") {
        exportJSON(result);
      } else if (exportFormat === "excel") {
        exportExcel(sheets);
      } else if (exportFormat === "txt") {
        exportTXT(sheets);
      }

      alert(
        `Data berhasil diekspor dalam format ${exportFormat.toUpperCase()}!`,
      );
    } catch (error) {
      console.error("Export error:", error);
      alert(`Gagal ekspor: ${error.message}`);
    }
  };

  const exportJSON = (data) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `KeuanganApp_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

    XLSX.writeFile(
      wb,
      `KeuanganApp_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
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
          text += `\n${index + 1}. `;
          Object.keys(item).forEach((key) => {
            text += `${key}: ${item[key]}, `;
          });
          text = text.slice(0, -2);
          text += "\n";
        });
      }
      text += "\n";
    });

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `KeuanganApp_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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

        if (extension === "json") {
          const text = await file.text();
          const data = JSON.parse(text);
          if (confirm("Import akan MENIMPA semua data yang ada. Lanjutkan?")) {
            LocalStorageService.importAllData(data);
            alert("Data berhasil diimport!");
            onClose();
            window.location.reload();
          }
        } else if (extension === "xlsx" || extension === "xls") {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer);
          const importedData = { data: {} };

          wb.SheetNames.forEach((sheetName) => {
            const ws = wb.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(ws);
            importedData.data[sheetName] = jsonData;
          });

          if (confirm("Import akan MENIMPA semua data yang ada. Lanjutkan?")) {
            LocalStorageService.importAllData(importedData);
            alert("Data berhasil diimport dari Excel!");
            onClose();
            window.location.reload();
          }
        } else if (extension === "txt") {
          const text = await file.text();
          const importedData = parseTXT(text);
          if (!importedData) {
            alert(
              "Gagal memparse file TXT. Pastikan formatnya sesuai dengan ekspor dari aplikasi ini.",
            );
            return;
          }
          if (confirm("Import akan MENIMPA semua data yang ada. Lanjutkan?")) {
            LocalStorageService.importAllData(importedData);
            alert("Data berhasil diimport dari TXT!");
            onClose();
            window.location.reload();
          }
        } else {
          alert("Format file tidak didukung. Gunakan JSON, Excel, atau TXT.");
        }
      } catch (error) {
        console.error(error);
        alert("Gagal import data. Pastikan file valid.");
      }
    };
    input.click();
  };

  // Parsing file TXT hasil ekspor
  const parseTXT = (text) => {
    try {
      const lines = text.split("\n");
      let currentSheet = null;
      const sheets = {};

      for (let line of lines) {
        line = line.trim();
        if (line.startsWith("===") && line.endsWith("===")) {
          const sheetName = line.replace(/=/g, "").trim();
          currentSheet = sheetName;
          sheets[sheetName] = [];
        } else if (currentSheet && line.match(/^\d+\./)) {
          const item = {};
          const withoutNumber = line.replace(/^\d+\.\s*/, "");
          const parts = withoutNumber.split(",").map((p) => p.trim());
          parts.forEach((part) => {
            const colonIndex = part.indexOf(":");
            if (colonIndex !== -1) {
              const key = part.substring(0, colonIndex).trim();
              let value = part.substring(colonIndex + 1).trim();
              if (!isNaN(value) && value !== "") {
                value = Number(value);
              }
              item[key] = value;
            }
          });
          sheets[currentSheet].push(item);
        }
      }
      return { data: sheets };
    } catch (error) {
      console.error("Parse TXT error:", error);
      return null;
    }
  };

  // ==================== HELPER ====================
  const formatCurrency = (n) => "Rp " + n.toLocaleString("id-ID");

  const getTypeLabel = (type) => {
    const labels = {
      hutang: "Hutang",
      piutang: "Piutang",
      pemasukan: "Pemasukan",
      pengeluaran: "Pengeluaran",
      perbaikan: "Perbaikan",
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
    };
    return colors[type] || "text-gray-500";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3"
      onClick={onClose}>
      <div
        className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-3 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-base font-bold">Kelola Data</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg">
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
              }`}>
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
                      color: "yellow",
                    },
                    {
                      id: "excel",
                      label: "Excel",
                      icon: FileSpreadsheet,
                      color: "green",
                    },
                    { id: "txt", label: "TXT", icon: FileText, color: "blue" },
                  ].map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setExportFormat(format.id)}
                      className={`p-2 rounded-lg border flex flex-col items-center gap-1 ${
                        exportFormat === format.id
                          ? `border-${format.color}-500 bg-${format.color}-500/10`
                          : "border-slate-700 bg-slate-700/30"
                      }`}>
                      <format.icon
                        size={20}
                        className={`text-${format.color}-400`}
                      />
                      <span className="text-[10px]">{format.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tombol Export */}
              <button
                onClick={handleExport}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
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
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
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
                  onClick={() => setShowFilters(!showFilters)}>
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-blue-400" />
                    <span className="text-xs font-medium text-white">
                      Filter
                    </span>
                    {(filterType !== "all" ||
                      filterMonth !== "all" ||
                      filterYear !== "all") && (
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white">
                        <option value="all">Semua Tipe</option>
                        <option value="hutang">Hutang</option>
                        <option value="piutang">Piutang</option>
                        <option value="pemasukan">Pemasukan</option>
                        <option value="pengeluaran">Pengeluaran</option>
                        <option value="perbaikan">Perbaikan</option>
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white">
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white">
                          <option value="all">Semua Tahun</option>
                          {availableYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Tombol Reset */}
                    {(filterType !== "all" ||
                      filterMonth !== "all" ||
                      filterYear !== "all") && (
                      <button
                        onClick={resetFilters}
                        className="w-full px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 rounded-lg flex items-center justify-center gap-1">
                        <X size={12} /> Reset Filter
                      </button>
                    )}
                  </div>
                )}
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
                            className={`text-[10px] ${getTypeColor(item.type)}`}>
                            {getTypeLabel(item.type)}
                          </div>
                        </div>
                        {item.amount > 0 && (
                          <div
                            className={`text-xs font-bold ${getTypeColor(item.type)}`}>
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
  );
}
