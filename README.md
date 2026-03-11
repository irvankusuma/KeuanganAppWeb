# 📘 KeuanganApp Web

## Catatan Maksud Aplikasi
KeuanganApp Web adalah aplikasi pencatatan keuangan pribadi berbasis browser yang dibuat untuk membantu pengguna:
- mencatat dan memantau hutang/piutang,
- mencatat aktivitas keuangan harian,
- menyimpan catatan pengingat keuangan,
- melihat ringkasan kondisi keuangan dalam satu dashboard.

Aplikasi ini dirancang sederhana, ringan, dan fokus dipakai langsung dari HP maupun desktop tanpa login.

---

## Tujuan Utama
1. **Merapikan pencatatan keuangan pribadi** dalam satu aplikasi.
2. **Mempermudah kontrol hutang/piutang** lewat fitur bayar dan history.
3. **Menyediakan catatan cepat** untuk pengingat kebutuhan/agenda keuangan.
4. **Memberi kontrol data penuh ke pengguna** karena data disimpan lokal di browser.

---

## Gambaran Fitur Aplikasi
- **Dashboard**
  - Menampilkan saldo bersih dan ringkasan data keuangan.
- **Hutang**
  - CRUD data hutang.
  - Fitur bayar dan riwayat pembayaran.
- **Piutang**
  - CRUD data piutang.
  - Fitur bayar/terima dan riwayat pembayaran.
- **Catatan**
  - CRUD catatan.
  - Beberapa tipe catatan (standar, list, singkat).
  - Filter dan pencarian.
- **Export/Import**
  - Backup dan restore data JSON.

---

## Cara Kerja Data
Aplikasi menggunakan `localStorage` browser.

**Konsekuensi penting:**
- Data tersimpan di perangkat/browser yang dipakai.
- Jika data browser dihapus, data aplikasi bisa hilang.
- Disarankan rutin melakukan **Export** sebagai backup.

---

## Teknologi yang Dipakai
- React
- Vite
- Tailwind CSS
- React Router
- lucide-react
- localStorage API

---

## Struktur Halaman Utama
- `/` → Dashboard
- `/hutang` → Manajemen Hutang
- `/piutang` → Manajemen Piutang
- `/pemasukan` → Pemasukan
- `/pengeluaran` → Pengeluaran
- `/catatan` → Catatan
- `/perbaikan` → Perbaikan

---

## Menjalankan Aplikasi
```bash
npm install
npm run dev
```

Build production:
```bash
npm run build
```

---

## Ringkasan
Dokumentasi ini menjelaskan bahwa KeuanganApp Web adalah aplikasi catatan keuangan pribadi untuk membantu pengguna mencatat, mengelola, dan memantau kondisi keuangan secara praktis dengan penyimpanan lokal.
