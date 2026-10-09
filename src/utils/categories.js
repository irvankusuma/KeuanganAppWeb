/**
 * Preset categories for KeuanganApp
 * Provides emoji, color coding, and consistent IDs for expense and income categories
 */

/** @typedef {{ id: string, name: string, emoji: string, color: string }} Category */

/** @type {Category[]} */
export const EXPENSE_CATEGORIES = [
  { id: 'makanan',       name: 'Makanan & Minuman',    emoji: '🍽️',  color: '#F97316' },
  { id: 'transport',     name: 'Transportasi',          emoji: '🚗',  color: '#3B82F6' },
  { id: 'entertainment', name: 'Hiburan',               emoji: '🎮',  color: '#8B5CF6' },
  { id: 'utilities',     name: 'Listrik, Air, Internet',emoji: '💡',  color: '#EAB308' },
  { id: 'health',        name: 'Kesehatan',             emoji: '⚕️',  color: '#EF4444' },
  { id: 'shopping',      name: 'Belanja',               emoji: '🛍️',  color: '#EC4899' },
  { id: 'education',     name: 'Pendidikan',            emoji: '📚',  color: '#06B6D4' },
  { id: 'tagihan',       name: 'Tagihan',               emoji: '🧾',  color: '#64748B' },
  { id: 'investasi',     name: 'Investasi',             emoji: '📈',  color: '#10B981' },
  { id: 'donasi',        name: 'Donasi',                emoji: '🤲',  color: '#F59E0B' },
  { id: 'other',         name: 'Lainnya',               emoji: '📌',  color: '#64748B' },
];

/** @type {Category[]} */
export const INCOME_CATEGORIES = [
  { id: 'salary',     name: 'Gaji',      emoji: '💼', color: '#10B981' },
  { id: 'bonus',      name: 'Bonus',     emoji: '🎁', color: '#F59E0B' },
  { id: 'freelance',  name: 'Freelance', emoji: '💻', color: '#6366F1' },
  { id: 'investment', name: 'Investasi', emoji: '📈', color: '#14B8A6' },
  { id: 'transfer',   name: 'Transfer',  emoji: '🔁', color: '#3B82F6' },
  { id: 'other',      name: 'Lainnya',   emoji: '📌', color: '#64748B' },
];

/**
 * Resolve a category object by its ID and type.
 * Falls back to the last element (Lainnya) if not found.
 *
 * @param {'income'|'expense'} type
 * @param {string} categoryId
 * @returns {Category}
 */
export const getCategoryByType = (type, categoryId) => {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return categories.find((cat) => cat.id === categoryId)
    || categories[categories.length - 1];
};

/**
 * Return the hex color string for a given category.
 *
 * @param {string} categoryId
 * @param {'expense'|'income'} type
 * @returns {string} hex color
 */
export const getCategoryColor = (categoryId, type = 'expense') => {
  return getCategoryByType(type, categoryId)?.color || '#64748B';
};

/**
 * Resolve legacy free-text category names to the new preset IDs.
 * Used when importing old data that stored strings instead of IDs.
 *
 * @param {string} legacyName
 * @returns {string} category ID
 */
export const normalizeCategoryId = (legacyName) => {
  if (!legacyName) return 'other';
  const lower = legacyName.toLowerCase();

  const mapping = {
    'makanan': 'makanan',
    'makan': 'makanan',
    'minuman': 'makanan',
    'makanan & minuman': 'makanan',
    'transportasi': 'transport',
    'transport': 'transport',
    'hiburan': 'entertainment',
    'entertainment': 'entertainment',
    'listrik': 'utilities',
    'internet': 'utilities',
    'air': 'utilities',
    'listrik, air, internet': 'utilities',
    'kesehatan': 'health',
    'health': 'health',
    'belanja': 'shopping',
    'shopping': 'shopping',
    'pendidikan': 'education',
    'education': 'education',
    'tagihan': 'tagihan',
    'investasi': 'investasi',
    'donasi': 'donasi',
    'gaji': 'salary',
    'salary': 'salary',
    'bonus': 'bonus',
    'freelance': 'freelance',
  };

  return mapping[lower] || 'other';
};
