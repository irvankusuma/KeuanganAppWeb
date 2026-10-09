import { useState, useEffect, useMemo, useCallback } from 'react';
import LocalStorageService, { SHEETS } from '../services/LocalStorageService';
import { EXPENSE_CATEGORIES } from '../utils/categories';
import { monthStr } from '../utils/dateUtils';

/**
 * Hook to manage and compute budgets and alerts for a specified month.
 *
 * @param {string} [initialMonth] - Month formatted as "YYYY-MM"
 */
export function useBudget(initialMonth = monthStr()) {
  const [month, setMonth] = useState(initialMonth);
  const [budgets, setBudgets] = useState([]);
  const [pengeluaran, setPengeluaran] = useState([]);

  const refresh = useCallback(() => {
    setBudgets(LocalStorageService.readSheet(SHEETS.BUDGETS));
    setPengeluaran(LocalStorageService.readSheet(SHEETS.PENGELUARAN));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const categoryBudgets = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => {
      const budget = budgets.find(
        (b) => b.categoryId === cat.id && b.month === month
      );
      const spent = pengeluaran
        .filter((item) => item.kategori === cat.id && item.tanggal?.startsWith(month))
        .reduce((sum, item) => sum + (parseFloat(item.jumlah) || 0), 0);

      const limit = budget?.limit ? parseFloat(budget.limit) : null;
      const percentage = limit ? Math.min((spent / limit) * 100, 999) : 0;
      const remaining = limit !== null ? Math.max(limit - spent, 0) : null;
      const isOverBudget = limit !== null && spent > limit;
      const isWarning = limit !== null && spent > limit * 0.8 && spent <= limit;

      return {
        ...cat,
        budgetId: budget?.id || null,
        limit,
        spent,
        remaining,
        percentage,
        isOverBudget,
        isWarning,
      };
    });
  }, [budgets, pengeluaran, month]);

  const alerts = useMemo(() => {
    return categoryBudgets.filter((c) => c.isOverBudget || c.isWarning);
  }, [categoryBudgets]);

  const totalBudgeted = useMemo(() => {
    return categoryBudgets.reduce((sum, c) => sum + (c.limit || 0), 0);
  }, [categoryBudgets]);

  const totalSpent = useMemo(() => {
    return categoryBudgets.reduce((sum, c) => sum + c.spent, 0);
  }, [categoryBudgets]);

  return {
    month,
    setMonth,
    categoryBudgets,
    alerts,
    totalBudgeted,
    totalSpent,
    refresh,
  };
}

export default useBudget;
