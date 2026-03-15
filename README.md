# 📘 KeuanganApp Web

KeuanganApp Web adalah aplikasi manajemen keuangan pribadi berbasis browser yang dirancang untuk memberikan kendali penuh kepada pengguna atas kesehatan finansial mereka. Aplikasi ini berfokus pada kesederhanaan, kecepatan akses, dan privasi data tanpa memerlukan akun atau koneksi internet (offline-first).

---

## 🚀 1) Tujuan & Filosofi Aplikasi

Aplikasi ini dibangun dengan beberapa prinsip utama:

1. **Privasi Mutlak**: Data Anda adalah milik Anda. Semua informasi disimpan secara lokal di browser menggunakan `localStorage`. Tidak ada data yang dikirim ke server luar.
2. **Tanpa Hambatan (Barrier-Free)**: Tidak perlu registrasi, login, atau pengaturan yang rumit. Buka aplikasi dan langsung catat.
3. **Sentralisasi Data**: Menyatukan pencatatan hutang, piutang, pemasukan, pengeluaran, dan catatan pengingat dalam satu antarmuka yang kohesif.
4. **Kontrol Arus Kas**: Memandu pengguna untuk memahami pola pengeluaran dan memastikan kewajiban (hutang/piutang) terkelola dengan baik.

---

## ✨ 2) Fitur Utama Per Halaman

Setiap halaman di KeuanganApp Web dirancang dengan logika khusus untuk mendukung manajemen keuangan yang efektif.

### A. Dashboard (`/`) - Pusat Komando

- **Visualisasi Saldo**: Menampilkan "Saldo Bersih" yang dihitung secara dinamis dari (Total Pemasukan + Pembayaran Piutang) - (Total Pengeluaran + Pembayaran Hutang).
- **Kartu Statistik**: Ringkasan cepat untuk Hutang, Piutang, Pemasukan, dan Pengeluaran.
- **Analisis Rasio**: Memberikan gambaran kesehatan keuangan berdasarkan perbandingan aset dan kewajiban.
- **Grafik Interaktif**: Tren transaksi bulanan menggunakan Recharts untuk melihat fluktuasi keuangan secara visual.
- **Akses Cepat**: Tombol pintas ke modul lain dan ringkasan jumlah catatan tersimpan.
- _Lihat detail visual di:_ [PreviewApp.md - Dashboard](file:///c:/Users/irfan/OneDrive/Dokumen/Website/KeuanganAppWeb/PreviewApp.md#--2-detail-halaman-dashboard)

### B. Hutang (`/hutang`) - Manajemen Kewajiban

- **Pencatatan Terstruktur**: Simpan data pemberi pinjaman, nominal total, tanggal pinjam, dan jatuh tempo.
- **Sistem Pembayaran Bertahap**: Fitur "Bayar" memungkinkan Anda mencatat cicilan. Nilai "Sisa Hutang" akan terupdate secara otomatis.
- **Riwayat Transaksi**: Lihat setiap pembayaran yang pernah dilakukan untuk satu item hutang melalui tombol "History".
- _Lihat detail visual di:_ [PreviewApp.md - Hutang & Piutang](file:///c:/Users/irfan/OneDrive/Dokumen/Website/KeuanganAppWeb/PreviewApp.md#--3-detail-halaman-hutang--piutang)

### C. Piutang (`/piutang`) - Manajemen Aset

- **Pelacakan Penagihan**: Catat siapa yang meminjam uang, kapan harus dikembalikan, dan status kelunasannya.
- **Penerimaan Cicilan**: Catat setiap kali Anda menerima pembayaran dari piutang tersebut.
- **Filter Jatuh Tempo**: Identifikasi dengan cepat siapa yang sudah melewati batas waktu pembayaran.
- _Lihat detail visual di:_ [PreviewApp.md - Hutang & Piutang](file:///c:/Users/irfan/OneDrive/Dokumen/Website/KeuanganAppWeb/PreviewApp.md#--3-detail-halaman-hutang--piutang)

### D. Pemasukan & Pengeluaran (`/pemasukan`, `/pengeluaran`)

- **Pencatatan Harian**: Catat setiap nominal uang masuk atau keluar beserta kategori dan sumbernya.
- **Manajemen Arus Kas**: Memberikan basis data untuk perhitungan saldo di Dashboard.
- _Lihat detail visual di:_ [PreviewApp.md - Alur Data](file:///c:/Users/irfan/OneDrive/Dokumen/Website/KeuanganAppWeb/PreviewApp.md#--6-relasi-antar-data-data-connection)

### E. Catatan (`/catatan`) - Reminder & Ide

- **Multi-Format**: Mendukung catatan Standar, List (bullet points), dan Singkat (maks 100 karakter).
- **Pengorganisasian**: Dilengkapi fitur pencarian (search) dan filter berdasarkan tipe catatan.
- _Lihat detail visual di:_ [PreviewApp.md - Catatan](file:///c:/Users/irfan/OneDrive/Dokumen/Website/KeuanganAppWeb/PreviewApp.md#--4-detail-halaman-catatan-notes)

### F. Perbaikan (`/perbaikan`) - Biaya Maintenance

- **Spesifik**: Dikhususkan untuk mencatat biaya-biaya perbaikan (kendaraan, rumah, alat elektronik) agar Anda tahu berapa banyak yang dihabiskan untuk pemeliharaan aset.

---

## 🛠️ 3) Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan stack modern untuk kinerja optimal di browser:

- **Framework**: [React](https://reactjs.org/) - Logika UI yang reaktif.
- **Build Tool**: [Vite](https://vitejs.dev/) - Pengembangan cepat dan build ringan.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Desain responsif dan modern.
- **Iconography**: [Lucide React](https://lucide.dev/) - Ikon yang bersih dan konsisten.
- **Charts**: [Recharts](https://recharts.org/) - Visualisasi data keuangan.
- **Storage**: Browser LocalStorage API - Penyimpanan data lokal yang persisten.

---

## 📖 4) Panduan Penggunaan

### A. Alur Kerja Standar

1.  **Pencatatan**: Masukkan setiap transaksi begitu terjadi (real-time).
2.  **Pemantauan**: Gunakan Dashboard untuk melihat apakah pengeluaran melebihi pemasukan.
3.  **Evaluasi**: Periksa daftar hutang/piutang secara rutin untuk memastikan tidak ada yang terlewat.
4.  **Optimasi**: Gunakan fitur Catatan untuk merencanakan alokasi dana di masa depan.

### B. Keamanan Data (Penting!)

Karena data Anda hanya disimpan di perangkat saat ini, sangat disarankan untuk:

- **Export Berkala**: Gunakan tombol Export (ikon download di header) untuk mengunduh file `.json` sebagai cadangan.
- **Import untuk Pindah Perangkat**: Jika ingin melanjutkan pencatatan di browser lain, cukup upload file cadangan tersebut melalui fitur Import.

---

## ⚙️ 5) Cara Menjalankan Project

### Prasyarat

- Node.js (versi 16 atau terbaru)
- npm atau yarn

### Instalasi & Pengembangan

1.  Clone repository ini (jika menggunakan git).
2.  Buka terminal di folder project.
3.  Jalankan perintah:
    ```bash
    npm install
    npm run dev
    ```
4.  Buka `http://localhost:5173` di browser Anda.

### Build untuk Produksi

```bash
npm run build
```

---

## 📂 6) Dokumentasi Teknis & UI Detail

Untuk penjelasan lebih mendalam mengenai arsitektur visual, diagram ASCII tampilan per halaman, dan logika data "di balik layar", silakan merujuk ke file:
👉 **[PreviewApp.md](file:///c:/Users/irfan/OneDrive/Dokumen/Website/KeuanganAppWeb/PreviewApp.md)**

---

## 📝 7) Ringkasan

Aplikasi ini adalah solusi bagi siapa saja yang menginginkan pencatatan keuangan yang privat, cepat, dan tanpa biaya langganan. Dengan fokus pada manajemen hutang/piutang yang detail dan dashboard yang informatif, KeuanganApp Web membantu Anda mencapai kejelasan finansial setiap hari.
