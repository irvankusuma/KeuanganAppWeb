/**
 * Validation rules for KeuanganApp transaction forms.
 */

/**
 * Check if a date string is a valid calendar date.
 * @param {string} dateString
 * @returns {boolean}
 */
function isValidDate(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate a transaction (pemasukan / pengeluaran).
 *
 * @param {{ nama?: string, jumlah?: string|number, tanggal?: string, kategori?: string }} data
 * @param {'expense'|'income'|'hutang'|'piutang'} type
 * @returns {Record<string, string>} field → error message (empty = valid)
 */
export const transactionValidator = (data, type = 'expense') => {
  const errors = {};

  // ── Nama / Deskripsi ──────────────────────────────────────────
  if (!data.nama?.trim()) {
    errors.nama = 'Nama / deskripsi harus diisi';
  } else if (data.nama.trim().length > 200) {
    errors.nama = 'Nama terlalu panjang (maksimal 200 karakter)';
  }

  // ── Jumlah ─────────────────────────────────────────────────────
  if (!data.jumlah && data.jumlah !== 0) {
    errors.jumlah = 'Jumlah harus diisi';
  } else if (isNaN(Number(data.jumlah))) {
    errors.jumlah = 'Jumlah harus berupa angka';
  } else if (parseFloat(data.jumlah) <= 0) {
    errors.jumlah = 'Jumlah harus lebih dari 0';
  } else if (parseFloat(data.jumlah) > 999_999_999_999) {
    errors.jumlah = 'Jumlah terlalu besar (maks. Rp 999 Triliun)';
  }

  // ── Tanggal ────────────────────────────────────────────────────
  if (!data.tanggal) {
    errors.tanggal = 'Tanggal harus diisi';
  } else if (!isValidDate(data.tanggal)) {
    errors.tanggal = 'Format tanggal tidak valid';
  }

  // ── Kategori (wajib untuk pemasukan & pengeluaran) ─────────────
  if (type !== 'hutang' && type !== 'piutang') {
    if (!data.kategori?.trim()) {
      errors.kategori = 'Kategori harus dipilih';
    }
  }

  return errors;
};

/**
 * Validate a hutang / piutang entry.
 *
 * @param {{ nama?: string, jumlah?: string|number, periode?: string|number, tanggal?: string }} data
 * @returns {Record<string, string>}
 */
export const hutangValidator = (data) => {
  const errors = {};

  if (!data.nama?.trim()) errors.nama = 'Nama hutang harus diisi';
  if (!data.jumlah && data.jumlah !== 0) {
    errors.jumlah = 'Jumlah harus diisi';
  } else if (parseFloat(data.jumlah) <= 0) {
    errors.jumlah = 'Jumlah harus lebih dari 0';
  }
  if (data.periode !== undefined && parseFloat(data.periode) <= 0) {
    errors.periode = 'Periode harus lebih dari 0';
  }
  if (!isValidDate(data.tanggal)) errors.tanggal = 'Tanggal tidak valid';

  return errors;
};

/**
 * Validate a payment (bayar) amount against the remaining debt/receivable.
 *
 * @param {string|number} amount
 * @param {number} sisaHutang
 * @returns {string|null} error message or null if valid
 */
export const validatePaymentAmount = (amount, sisaHutang) => {
  const val = parseFloat(amount);
  if (!val || val <= 0) return 'Nominal harus lebih dari 0';
  if (val > sisaHutang) {
    return `Nominal melebihi sisa (${sisaHutang.toLocaleString('id-ID')})`;
  }
  return null;
};
