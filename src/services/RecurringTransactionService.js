/**
 * RecurringTransactionService
 * Manages recurring income and expense transactions stored in localStorage.
 * Call processRecurringTransactions() on app startup to auto-execute due entries.
 */
import LocalStorageService, { SHEETS } from './LocalStorageService';

const RECURRING_SHEET = 'RecurringTransactions';

class RecurringTransactionService {
  /**
   * Return today's date as "YYYY-MM-DD".
   * @returns {string}
   */
  _today() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  }

  /**
   * Calculate the next due date after a given date, based on frequency.
   *
   * @param {string} fromDate - "YYYY-MM-DD"
   * @param {'daily'|'weekly'|'monthly'|'yearly'} frequency
   * @returns {string} "YYYY-MM-DD"
   */
  calculateNextDueDate(fromDate, frequency) {
    const d = new Date(fromDate);
    switch (frequency) {
      case 'daily':   d.setDate(d.getDate() + 1);         break;
      case 'weekly':  d.setDate(d.getDate() + 7);         break;
      case 'monthly': d.setMonth(d.getMonth() + 1);       break;
      case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
      default:        d.setMonth(d.getMonth() + 1);
    }
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  }

  /**
   * Get all recurring transaction templates.
   * @returns {Array}
   */
  getAll() {
    return LocalStorageService.readSheet(RECURRING_SHEET);
  }

  /**
   * Create a new recurring transaction template.
   *
   * @param {{ name: string, amount: number, kategori: string, type: 'income'|'expense',
   *            frequency: 'daily'|'weekly'|'monthly'|'yearly', startDate: string,
   *            catatan?: string }} data
   * @returns {object} the created record
   */
  createRecurring(data) {
    return LocalStorageService.appendRow(RECURRING_SHEET, {
      name: data.name,
      amount: data.amount,
      kategori: data.kategori || 'other',
      type: data.type,
      frequency: data.frequency || 'monthly',
      startDate: data.startDate,
      catatan: data.catatan || '',
      isActive: true,
      lastExecuted: null,
      nextDueDate: this.calculateNextDueDate(data.startDate, data.frequency || 'monthly'),
    });
  }

  /**
   * Update a recurring template.
   * @param {string} id
   * @param {object} updates
   */
  updateRecurring(id, updates) {
    return LocalStorageService.updateRow(RECURRING_SHEET, id, updates);
  }

  /**
   * Deactivate (pause) a recurring template without deleting it.
   * @param {string} id
   */
  deactivateRecurring(id) {
    return LocalStorageService.updateRow(RECURRING_SHEET, id, { isActive: false });
  }

  /**
   * Reactivate a paused recurring template.
   * @param {string} id
   */
  activateRecurring(id) {
    return LocalStorageService.updateRow(RECURRING_SHEET, id, { isActive: true });
  }

  /**
   * Permanently delete a recurring template.
   * @param {string} id
   */
  deleteRecurring(id) {
    return LocalStorageService.deleteRow(RECURRING_SHEET, id);
  }

  /**
   * Execute a single recurring entry — writes a pemasukan or pengeluaran row
   * and updates the template's nextDueDate and lastExecuted.
   *
   * @param {object} recurring
   */
  executeRecurring(recurring) {
    const today = this._today();
    const sheet = recurring.type === 'income' ? SHEETS.PEMASUKAN : SHEETS.PENGELUARAN;

    LocalStorageService.appendRow(sheet, {
      nama: recurring.name,
      kategori: recurring.kategori || 'other',
      jumlah: recurring.amount,
      tanggal: today,
      catatan: recurring.catatan
        ? `${recurring.catatan} (berulang otomatis)`
        : `Transaksi berulang otomatis: ${recurring.name}`,
      sourceRef: recurring.id,
      sourceType: 'recurring',
    });

    LocalStorageService.updateRow(RECURRING_SHEET, recurring.id, {
      lastExecuted: new Date().toISOString(),
      nextDueDate: this.calculateNextDueDate(recurring.nextDueDate, recurring.frequency),
    });
  }

  /**
   * Scan all active recurring entries and execute those whose nextDueDate ≤ today.
   * Safe to call multiple times — will not duplicate entries on the same day.
   */
  processRecurringTransactions() {
    const today = this._today();
    const recurring = this.getAll();

    recurring
      .filter((r) => r.isActive && r.nextDueDate && r.nextDueDate <= today)
      .forEach((r) => {
        try {
          this.executeRecurring(r);
        } catch (err) {
          console.error(`[Recurring] Failed to execute "${r.name}":`, err);
        }
      });
  }

  /**
   * Get the human-readable label for a frequency.
   * @param {string} frequency
   * @returns {string}
   */
  frequencyLabel(frequency) {
    const labels = {
      daily: 'Setiap hari',
      weekly: 'Setiap minggu',
      monthly: 'Setiap bulan',
      yearly: 'Setiap tahun',
    };
    return labels[frequency] || frequency;
  }
}

export default new RecurringTransactionService();
export { RECURRING_SHEET };
