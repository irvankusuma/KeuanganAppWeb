# 📘 KeuanganApp Web (v1.2.0)

KeuanganApp Web adalah aplikasi manajemen keuangan pribadi modern berbasis browser yang dirancang untuk memberikan kendali penuh kepada pengguna atas kesehatan finansial mereka. Aplikasi ini mengutamakan privasi data mutlak (offline-first & LocalStorage), tampilan estetis dark mode yang responsif, visualisasi data interaktif, dan pelacakan anggaran yang cerdas.

---

## 🚀 1) Fitur Unggulan Terbaru (v1.2.0)

### 📊 A. Laporan & Analisis Keuangan (`/reports`)
- **Ringkasan Bulanan**: Pemasukan, pengeluaran, dan sisa saldo bersih bulanan.
- **Distribusi Kategori**: Grafik Pie interaktif pengeluaran per kategori.
- **Top 5 Pengeluaran**: Menyorot pos pengeluaran terbesar setiap bulan.
- **Tren 6 Bulan**: Bar chart perbandingan arus kas historis.

### 💰 B. Pelacakan Anggaran Bulanan (`/budget`) & Budget Alerts
- **Batas Pengeluaran per Kategori**: Tetapkan alokasi anggaran bulanan untuk setiap kategori pengeluaran.
- **Peringatan Otomatis di Dashboard**: Notifikasi visual jika pengeluaran kategori mencapai > 80% (Peringatan) atau > 100% (Melebihi Anggaran).
- **Progres Visual**: Progress bar real-time persentase anggaran terpakai.

### 🔄 C. Transaksi Berulang / Recurring (`/recurring`)
- **Auto-Execution**: Pencatatan otomatis transaksi berkala (harian, mingguan, bulanan, tahunan).
- **Eksekusi Sekali Klik**: Opsi eksekusi manual kapan saja jika ingin mendahului jadwal.
- **Riwayat Eksekusi**: Status pelacakan tanggal eksekusi terakhir dan jadwal berikutnya.

### 🛡️ D. Analisis Kesehatan Hutang & Rencana Pelunasan
- **Skor Kesehatan Hutang**: Analisis Debt-to-Income (DTI) ratio di Dashboard (Sehat, Perhatian, Beban Tinggi).
- **Kalkulator Rencana Cicilan**: Saran nominal cicilan bulanan otomatis di halaman Hutang beserta indikator beban terhadap pemasukan.
- **Distribusi Hutang**: Pie chart pembagian tipe hutang dan peringatan jatuh tempo dalam 7 hari.

### 🏷️ E. Category Picker & Validasi Form Terpadu
- **Pilihan Kategori Standar**: Kategori pemasukan & pengeluaran dengan emoji dan icon yang terstruktur.
- **Validasi Input Real-Time**: Pesan error inline pada nominal, nama, tanggal, dan relasi pembayaran.

---

## 📂 2) Modul & Halaman Aplikasi

| Halaman | Rute | Deskripsi |
|---|---|---|
| **Dashboard** | `/` | Pusat komando finansial, saldo bersih, ringkasan pintar, grafik tren, kalender, peringatan anggaran & kesehatan hutang. |
| **Pemasukan** | `/pemasukan` | Pencatatan pemasukan terintegrasi kategori dan sub-saldo. |
| **Pengeluaran** | `/pengeluaran` | Pencatatan pengeluaran dengan pemilih kategori dan riwayat. |
| **Anggaran** | `/budget` | Pengaturan batas anggaran pengeluaran per kategori bulanan. |
| **Transaksi Berulang** | `/recurring` | Pengelolaan tagihan/transaksi rutin dengan auto-execution. |
| **Laporan** | `/reports` | Visualisasi tren keuangan, pie chart kategori, dan top pengeluaran. |
| **Hutang** | `/hutang` | Pengelolaan pinjaman, pembayaran cicilan, dan saran rencana pelunasan. |
| **Piutang** | `/piutang` | Pelacakan dana yang dipinjamkan dan pencatatan penerimaan cicilan. |
| **Tagihan** | `/tagihan` | Pengingat dan pelacakan pembayaran tagihan rutin bulanan. |
| **Perbaikan** | `/perbaikan` | Pencatatan pemeliharaan aset dan perbaikan perangkat/kendaraan. |
| **Catatan** | `/catatan` | Catatan pengingat finansial cepat dan multi-format. |
| **Backup** | `/backup` | Ekspor dan impor data cadangan JSON lokal. |

---

## 🛠️ 3) Teknologi yang Digunakan

- **Framework**: React 18 & Vite
- **Styling**: Tailwind CSS (Dark theme `#0a0f1a`, `#0c1220`)
- **Iconography**: Lucide React
- **Charts & Data Visualization**: Recharts
- **Storage & State**: Browser LocalStorage API (Offline-first, no external tracking)

---

## ⚙️ 4) Cara Menjalankan Project

```bash
# 1. Install dependensi
npm install

# 2. Jalankan development server
npm run dev

# 3. Build bundle produksi
npm run build
```
