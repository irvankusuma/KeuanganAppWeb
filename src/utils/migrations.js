/**
 * Data migration utilities for KeuanganApp
 * Run once on app startup to ensure clean, consistent data
 */

/**
 * Migrate data from old PENDAPATAN sheet to PEMASUKAN.
 * Merges any entries from @Pendapatan into @Pemasukan (deduplicating by ID),
 * then removes the old @Pendapatan key from localStorage.
 */
export const migratePendapatanToPemasukan = () => {
  const pendapatanRaw = localStorage.getItem('@Pendapatan');
  if (!pendapatanRaw) return; // Already migrated or no data to migrate

  try {
    const pendapatanData = JSON.parse(pendapatanRaw);
    if (!Array.isArray(pendapatanData) || pendapatanData.length === 0) {
      localStorage.removeItem('@Pendapatan');
      return;
    }

    const pemasukanRaw = localStorage.getItem('@Pemasukan') || '[]';
    const pemasukanData = JSON.parse(pemasukanRaw);

    // Merge with check for duplicates by ID
    const mergedData = [...pemasukanData];
    pendapatanData.forEach((item) => {
      if (!mergedData.find((p) => p.id === item.id)) {
        mergedData.push({ ...item, type: 'migrated_from_pendapatan' });
      }
    });

    localStorage.setItem('@Pemasukan', JSON.stringify(mergedData));
    localStorage.removeItem('@Pendapatan'); // Remove the old sheet

    console.info(`[Migration] Migrated ${pendapatanData.length} entries from Pendapatan → Pemasukan.`);
  } catch (error) {
    console.error('[Migration] migratePendapatanToPemasukan failed:', error);
  }
};

/**
 * Run all migrations in order.
 * Call this once before the React app renders.
 */
export const runAllMigrations = () => {
  migratePendapatanToPemasukan();
};
