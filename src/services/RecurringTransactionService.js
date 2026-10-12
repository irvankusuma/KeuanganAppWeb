/**
 * RecurringTransactionService
 * Manages recurring transactions stored in Cloud Firestore.
 * Call processRecurringTransactions() only after the cloud data has loaded.
 */
import CloudDataService, { SHEETS } from './CloudDataService';

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
   * @param {string} anchorDate - Original schedule date; keeps month-end dates stable.
   * @returns {string} "YYYY-MM-DD"
   */
  calculateNextDueDate(fromDate, frequency, anchorDate = fromDate) {
    const d = new Date(`${fromDate}T00:00:00.000Z`);
    const [, anchorMonth, anchorDay] = String(anchorDate).split('-').map(Number);
    if (Number.isNaN(d.getTime()) || !anchorMonth || !anchorDay) return '';

    switch (frequency) {
      case 'daily':
        d.setUTCDate(d.getUTCDate() + 1);
        break;
      case 'weekly':
        d.setUTCDate(d.getUTCDate() + 7);
        break;
      case 'yearly': {
        const year = d.getUTCFullYear() + 1;
        const month = anchorMonth - 1;
        const day = Math.min(anchorDay, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
        return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
      }
      case 'monthly':
      default: {
        const totalMonths = d.getUTCFullYear() * 12 + d.getUTCMonth() + 1;
        const year = Math.floor(totalMonths / 12);
        const month = totalMonths % 12;
        const day = Math.min(anchorDay, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
        return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
      }
    }
    return d.toISOString().slice(0, 10);
  }

  /**
   * Get all recurring transaction templates.
   * @returns {Array}
   */
  getAll() {
    return CloudDataService.readSheet(RECURRING_SHEET);
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
    return CloudDataService.appendRow(RECURRING_SHEET, {
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
    return CloudDataService.updateRow(RECURRING_SHEET, id, updates);
  }

  /**
   * Deactivate (pause) a recurring template without deleting it.
   * @param {string} id
   */
  deactivateRecurring(id) {
    return CloudDataService.updateRow(RECURRING_SHEET, id, { isActive: false });
  }

  /**
   * Reactivate a paused recurring template.
   * @param {string} id
   */
  activateRecurring(id) {
    return CloudDataService.updateRow(RECURRING_SHEET, id, { isActive: true });
  }

  /**
   * Permanently delete a recurring template.
   * @param {string} id
   */
  deleteRecurring(id) {
    return CloudDataService.deleteRow(RECURRING_SHEET, id);
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

    CloudDataService.appendRow(sheet, {
      // A deterministic cloud document ID prevents two online devices from
      // creating the same scheduled transaction at the same time.
      id: `recurring:${recurring.id}:${today}`,
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

    CloudDataService.updateRow(RECURRING_SHEET, recurring.id, {
      lastExecuted: new Date().toISOString(),
      nextDueDate: this.calculateNextDueDate(
        recurring.nextDueDate,
        recurring.frequency,
        recurring.startDate || recurring.nextDueDate,
      ),
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
          const outputSheet = r.type === 'income' ? SHEETS.PEMASUKAN : SHEETS.PENGELUARAN;
          const alreadyCreated = CloudDataService.readSheet(outputSheet).some(
            (row) => row.sourceType === 'recurring' && String(row.sourceRef) === String(r.id) && row.tanggal === today,
          );
          if (alreadyCreated) {
            CloudDataService.updateRow(RECURRING_SHEET, r.id, {
              lastExecuted: new Date().toISOString(),
              nextDueDate: this.calculateNextDueDate(
                r.nextDueDate,
                r.frequency,
                r.startDate || r.nextDueDate,
              ),
            });
            return;
          }
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
