/**
 * AnalyticsService — compute monthly summaries and trend data
 * using data from LocalStorageService.
 */
import LocalStorageService, { SHEETS } from './LocalStorageService';
import { getCategoryByType } from '../utils/categories';

/**
 * Return expense entries grouped by category ID for a given month.
 *
 * @param {string} month - "YYYY-MM"
 * @returns {Record<string, number>} categoryId → total amount
 */
function getExpenseByCategory(month) {
  const pengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
  const map = {};
  pengeluaran
    .filter((item) => item.tanggal?.startsWith(month))
    .forEach((item) => {
      const cat = item.kategori || 'other';
      map[cat] = (map[cat] || 0) + (parseFloat(item.jumlah) || 0);
    });
  return map;
}

/**
 * Return income entries grouped by category ID for a given month.
 *
 * @param {string} month - "YYYY-MM"
 * @returns {Record<string, number>}
 */
function getIncomeByCategory(month) {
  const pemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
  const map = {};
  pemasukan
    .filter((item) => item.tanggal?.startsWith(month) && !item.parent_id)
    .forEach((item) => {
      const cat = item.kategori || 'other';
      map[cat] = (map[cat] || 0) + (parseFloat(item.jumlah) || 0);
    });
  return map;
}

/**
 * Return top N expenses sorted by amount (descending) for a given month.
 *
 * @param {string} month - "YYYY-MM"
 * @param {number} limit
 * @returns {Array<{ nama: string, kategori: string, jumlah: number, tanggal: string }>}
 */
function getTopExpenses(month, limit = 5) {
  const pengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);
  return pengeluaran
    .filter((item) => item.tanggal?.startsWith(month))
    .sort((a, b) => (parseFloat(b.jumlah) || 0) - (parseFloat(a.jumlah) || 0))
    .slice(0, limit)
    .map((item) => ({
      nama: item.nama || '(tanpa nama)',
      kategori: item.kategori || 'other',
      jumlah: parseFloat(item.jumlah) || 0,
      tanggal: item.tanggal,
    }));
}

/**
 * Compute a complete monthly summary.
 *
 * @param {string} month - "YYYY-MM"
 * @returns {{ month: string, income: number, expense: number, net: number,
 *              expenseByCategory: Record<string,number>, incomeByCategory: Record<string,number>,
 *              topExpenses: Array }}
 */
export const getMonthlySummary = (month) => {
  const pemasukan = LocalStorageService.readSheet(SHEETS.PEMASUKAN);
  const pengeluaran = LocalStorageService.readSheet(SHEETS.PENGELUARAN);

  // Only root pemasukan items (no parent_id) to avoid double-counting sub-entries
  const income = pemasukan
    .filter((item) => item.tanggal?.startsWith(month) && !item.parent_id)
    .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);

  const expense = pengeluaran
    .filter((item) => item.tanggal?.startsWith(month))
    .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);

  return {
    month,
    income,
    expense,
    net: income - expense,
    expenseByCategory: getExpenseByCategory(month),
    incomeByCategory: getIncomeByCategory(month),
    topExpenses: getTopExpenses(month, 5),
  };
};

/**
 * Return an array of monthly summaries for the last N months (newest last).
 *
 * @param {number} count - number of months to include (default 6)
 * @returns {Array<ReturnType<typeof getMonthlySummary>>}
 */
export const getTrendData = (count = 6) => {
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(month);
  }
  return months.map((m) => getMonthlySummary(m));
};

/**
 * Build expense-by-category data formatted for Recharts PieChart.
 *
 * @param {Record<string, number>} expenseByCategory
 * @returns {Array<{ name: string, value: number, color: string, emoji: string }>}
 */
export const formatPieData = (expenseByCategory) => {
  return Object.entries(expenseByCategory)
    .filter(([, val]) => val > 0)
    .map(([catId, value]) => {
      const cat = getCategoryByType('expense', catId);
      return {
        name: cat.name,
        value,
        color: cat.color,
        emoji: cat.emoji,
        id: catId,
      };
    })
    .sort((a, b) => b.value - a.value);
};
