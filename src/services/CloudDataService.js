// Compatibility facade for the existing pages. Records live only in memory
// while Firestore is the persistent source of truth.
export const SHEETS = {
  HUTANG: "Hutang",
  PEMBAYARAN_HUTANG: "PembayaranHutang",
  PIUTANG: "Piutang",
  PEMBAYARAN_PIUTANG: "PembayaranPiutang",
  PEMASUKAN: "Pemasukan",
  PENGELUARAN: "Pengeluaran",
  PERBAIKAN: "Perbaikan",
  CATATAN: "Catatan",
  TAGIHAN: "Tagihan",
  PEMBAYARAN_TAGIHAN: "PembayaranTagihan",
  BUDGETS: "Budgets",
  RECURRING_TRANSACTIONS: "RecurringTransactions",
  APP_SETTINGS: "AppSettings",
};

const memory = Object.fromEntries(Object.values(SHEETS).map((name) => [name, []]));
let cloudWriter = null;
const pendingWrites = new Set();

const emitChange = (sheetName, remote = false) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kua:data-changed", { detail: { sheet: sheetName, remote } }));
  }
};

const stableId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
};

class CloudDataFacade {
  setCloudWriter(writer) {
    cloudWriter = writer;
  }

  readSheet(sheetName) {
    return [...(memory[sheetName] || [])];
  }

  replaceSheetFromCloud(sheetName, rows, { emit = true } = {}) {
    memory[sheetName] = Array.isArray(rows) ? rows : [];
    if (emit) emitChange(sheetName, true);
  }

  clearCloudData() {
    Object.keys(memory).forEach((sheet) => { memory[sheet] = []; });
    cloudWriter = null;
  }

  _write(sheetName, nextData) {
    if (!Object.hasOwn(memory, sheetName)) memory[sheetName] = [];
    if (!cloudWriter || (typeof navigator !== "undefined" && !navigator.onLine)) {
      window.dispatchEvent(new CustomEvent("kua:cloud-error", {
        detail: { message: "Cloud belum tersambung. Perubahan tidak diterapkan; sambungkan internet lalu coba lagi." },
      }));
      return false;
    }

    const previous = memory[sheetName];
    memory[sheetName] = Array.isArray(nextData) ? nextData : [];
    emitChange(sheetName);

    const task = Promise.resolve().then(() => cloudWriter(sheetName, previous, memory[sheetName]));
    pendingWrites.add(task);
    task.catch((error) => {
      console.error(`Cloud write failed for ${sheetName}:`, error);
      window.dispatchEvent(new CustomEvent("kua:cloud-error", {
        detail: { message: error?.message || "Perubahan gagal disimpan ke cloud." },
      }));
    }).finally(() => pendingWrites.delete(task));
    return true;
  }

  async waitForPendingWrites() {
    await Promise.all([...pendingWrites]);
  }

  writeSheet(sheetName, data) {
    return this._write(sheetName, data);
  }

  appendRow(sheetName, rowData) {
    const existing = this.readSheet(sheetName);
    const row = {
      ...rowData,
      id: rowData?.id != null ? String(rowData.id) : stableId(),
      createdAt: rowData?.createdAt || new Date().toISOString(),
    };
    this._write(sheetName, [...existing, row]);
    return row;
  }

  updateRow(sheetName, id, updates) {
    const rows = this.readSheet(sheetName);
    const index = rows.findIndex((item) => String(item.id) === String(id));
    if (index === -1) throw new Error("Item tidak ditemukan.");
    rows[index] = { ...rows[index], ...updates, updatedAt: new Date().toISOString() };
    this._write(sheetName, rows);
    return rows[index];
  }

  deleteRow(sheetName, id) {
    const rows = this.readSheet(sheetName);
    this._write(sheetName, rows.filter((item) => String(item.id) !== String(id)));
    return true;
  }

  getTotalPinnedCount() {
    const sheetsToCheck = [
      SHEETS.HUTANG, SHEETS.PIUTANG, SHEETS.PEMASUKAN, SHEETS.PENGELUARAN,
      SHEETS.PERBAIKAN, SHEETS.CATATAN, SHEETS.TAGIHAN,
    ];
    return sheetsToCheck.reduce((count, sheet) =>
      count + this.readSheet(sheet).filter((item) => item.isPinned).length, 0);
  }

  togglePin(sheetName, id) {
    const rows = this.readSheet(sheetName);
    const index = rows.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return { success: false, message: "Item tidak ditemukan" };
    if (!rows[index].isPinned && this.getTotalPinnedCount() >= 5) {
      return { success: false, message: "Maksimal 5 data yang dapat dipin" };
    }
    rows[index] = {
      ...rows[index],
      isPinned: !rows[index].isPinned,
      pinnedAt: !rows[index].isPinned ? new Date().toISOString() : null,
    };
    this._write(sheetName, rows);
    return { success: true, isPinned: rows[index].isPinned };
  }

  exportAllData() {
    return {
      exportDate: new Date().toISOString(),
      version: "2.0",
      appName: "KeuanganApp",
      data: Object.fromEntries(Object.values(SHEETS).map((sheet) => [sheet, this.readSheet(sheet)])),
    };
  }

  async importAllData(importData) {
    if (!importData?.data || typeof importData.data !== "object") {
      throw new Error("Format file impor tidak valid.");
    }
    for (const [sheetName, rows] of Object.entries(importData.data)) {
      if (Object.values(SHEETS).includes(sheetName) && Array.isArray(rows) && !this._write(sheetName, rows)) {
        throw new Error("Cloud belum tersambung. File belum diimpor; sambungkan internet lalu coba lagi.");
      }
    }
    await this.waitForPendingWrites();
    return true;
  }

  getAllHistory() {
    const history = [];
    const mapRows = (sheet, type, titleKey, amountKey = "jumlah", fallbackTitleKey = "") => {
      this.readSheet(sheet).forEach((item) => history.push({
        type,
        title: item[titleKey] || (fallbackTitleKey ? item[fallbackTitleKey] : undefined),
        amount: parseFloat(item[amountKey]) || 0,
        date: item.tanggal,
        createdAt: item.createdAt,
      }));
    };
    mapRows(SHEETS.HUTANG, "hutang", "nama");
    mapRows(SHEETS.PIUTANG, "piutang", "namaOrang");
    mapRows(SHEETS.PEMASUKAN, "pemasukan", "nama", "jumlah", "sumber");
    mapRows(SHEETS.PENGELUARAN, "pengeluaran", "nama", "jumlah", "kategori");
    mapRows(SHEETS.PERBAIKAN, "perbaikan", "nama", "biaya");
    mapRows(SHEETS.PEMBAYARAN_TAGIHAN, "tagihan", "namaTagihan");
    return history.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }
}

export default new CloudDataFacade();
