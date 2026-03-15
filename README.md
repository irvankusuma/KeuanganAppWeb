# 📘 KeuanganApp Web

<<<<<<< HEAD
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
=======
KeuanganApp Web adalah aplikasi manajemen keuangan pribadi berbasis browser untuk membantu pengguna mencatat, memantau, dan mengevaluasi kondisi keuangan harian secara praktis.

Aplikasi ini dirancang agar:
- mudah dipakai di HP maupun desktop,
- tidak perlu akun/login,
- data tetap milik pengguna (disimpan di browser melalui localStorage),
- mendukung pencatatan hutang, piutang, pemasukan, pengeluaran, perbaikan, dan catatan pribadi.

---

## 1) Tujuan Aplikasi

Tujuan utama KeuanganApp Web:
1. **Menyatukan pencatatan keuangan dalam satu tempat** agar pengguna tidak perlu pindah-pindah aplikasi.
2. **Membantu kontrol arus uang** dengan mencatat pemasukan dan pengeluaran secara rutin.
3. **Mempermudah pengelolaan hutang/piutang** termasuk pembayaran bertahap dan riwayatnya.
4. **Memberi ringkasan cepat kondisi keuangan** lewat dashboard.
5. **Mendukung pengingat personal** lewat fitur Catatan.

---

## 2) Fitur Utama dan Kegunaannya

### A. Dashboard (`/`)
**Isi fitur:**
- Saldo bersih.
- Kartu ringkas total hutang, total piutang, total pemasukan, total pengeluaran.
- Ringkasan cepat rasio/posisi keuangan.
- Grafik tren transaksi bulanan.
- Ringkasan jumlah catatan + tombol menuju halaman Catatan.

**Kegunaan:**
- Melihat kondisi keuangan secara menyeluruh tanpa membuka setiap menu satu per satu.
- Menjadi titik awal analisis harian/mingguan.

---

### B. Hutang (`/hutang`)
**Isi fitur:**
- Tambah, edit, hapus data hutang.
- Filter berdasarkan tipe/status jatuh tempo.
- Tombol **Bayar** untuk mencatat cicilan/pembayaran.
- Tombol **History** untuk melihat riwayat pembayaran per item hutang.
- Aksi edit/hapus pada history pembayaran jika ada salah input.

**Kegunaan:**
- Melacak sisa hutang secara real-time.
- Mengetahui pembayaran yang sudah dilakukan dan kapan dibayar.
- Menghindari keterlambatan pembayaran.

---

### C. Piutang (`/piutang`)
**Isi fitur:**
- Tambah, edit, hapus data piutang.
- Filter berdasarkan status jatuh tempo.
- Tombol **Bayar** (terima pembayaran) untuk mencatat uang masuk dari piutang.
- Tombol **History** untuk riwayat pembayaran per item piutang.
- Aksi edit/hapus pada history pembayaran.

**Kegunaan:**
- Memantau siapa yang belum melunasi piutang.
- Mengetahui total piutang yang masih harus diterima.
- Menjaga akurasi catatan penerimaan piutang.

---

### D. Pemasukan (`/pemasukan`)
**Isi fitur:**
- Catat transaksi pemasukan.
- Edit/hapus transaksi pemasukan.
- Kategori/sumber pemasukan.

**Kegunaan:**
- Mengetahui sumber pendapatan.
- Membandingkan pemasukan per periode.

---

### E. Pengeluaran (`/pengeluaran`)
**Isi fitur:**
- Catat transaksi pengeluaran.
- Edit/hapus transaksi pengeluaran.
- Kategori pengeluaran.

**Kegunaan:**
- Memantau kebocoran pengeluaran.
- Menyusun evaluasi penghematan.

---

### F. Catatan (`/catatan`)
**Isi fitur:**
- CRUD catatan.
- Beberapa tipe catatan:
  - **Standar**: judul + isi.
  - **List**: judul + poin-poin/baris.
  - **Singkat**: catatan pendek (maks. karakter tertentu).
- Filter tipe catatan.
- Urutan terbaru/terlama.
- Pencarian catatan.

**Kegunaan:**
- Menyimpan pengingat keuangan cepat.
- Menyimpan daftar belanja/rencana pembayaran.
- Menulis catatan tindakan keuangan berikutnya.

---

### G. Perbaikan (`/perbaikan`)
**Isi fitur:**
- Pencatatan aktivitas/perbaikan dengan biaya terkait.

**Kegunaan:**
- Mencatat biaya perbaikan agar tetap terukur dalam total pengeluaran.

---

### H. Export / Import Data
**Isi fitur:**
- Export seluruh data ke file JSON.
- Import untuk restore data dari file JSON.

**Kegunaan:**
- Backup data berkala.
- Pindah data antar perangkat/browser.
- Mitigasi kehilangan data saat browser dibersihkan.

---

## 3) Cara Menggunakan Aplikasi (Alur Praktis)

### Langkah Awal
1. Buka aplikasi.
2. Masuk ke menu sesuai kebutuhan (Hutang, Piutang, Pemasukan, dll).
3. Tambah data dari tombol tambah (`+`).

### Rekomendasi Alur Harian
1. Catat pemasukan/pengeluaran hari ini.
2. Cek menu Hutang/Piutang jika ada transaksi pembayaran.
3. Tambahkan Catatan jika ada pengingat penting.
4. Lihat Dashboard untuk evaluasi cepat.

### Rekomendasi Alur Mingguan/Bulanan
1. Tinjau tren pada Dashboard.
2. Cek item hutang/piutang yang mendekati jatuh tempo.
3. Koreksi input jika ada kesalahan melalui edit data/history.
4. Lakukan **Export** sebagai backup rutin.

---

## 4) Penyimpanan Data dan Keamanan

Aplikasi memakai **localStorage browser**.

Konsekuensi:
- Data hanya tersimpan di browser/perangkat yang dipakai.
- Jika cache/data browser dihapus, data aplikasi bisa ikut hilang.
- Tidak ada sinkronisasi cloud bawaan.

Saran:
- Rutin backup menggunakan fitur Export.
- Simpan file backup di tempat aman (mis. cloud drive pribadi).

---

## 5) Teknologi yang Digunakan

- React
- Vite
- Tailwind CSS
- React Router
- lucide-react
- Recharts
- localStorage API

---

## 6) Rute Halaman

- `/` → Dashboard
- `/hutang` → Manajemen Hutang
- `/piutang` → Manajemen Piutang
- `/pemasukan` → Manajemen Pemasukan
- `/pengeluaran` → Manajemen Pengeluaran
- `/catatan` → Catatan Pribadi
- `/perbaikan` → Pencatatan Perbaikan

---

## 7) Menjalankan Aplikasi

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

---

## 8) Catatan Penting Penggunaan

- Jika merasa angka tidak sesuai, cek riwayat pembayaran di Hutang/Piutang.
- Gunakan edit/hapus history untuk koreksi salah input.
- Pastikan nominal selalu diisi dengan benar sebelum simpan.
- Biasakan backup data minimal mingguan.

---


## 9) Dokumentasi Tampilan (Preview)

Untuk penjelasan visual tampilan aplikasi per halaman (dengan diagram/denah UI + logika penggunaan), lihat file:
- `PreviewApp.md`

---

## 10) Ringkasan

KeuanganApp Web adalah alat pencatatan keuangan pribadi yang fokus pada kemudahan, kecepatan, dan kontrol data oleh pengguna. Dengan kombinasi dashboard, manajemen hutang/piutang, transaksi harian, dan catatan, aplikasi ini cocok untuk membantu kebiasaan finansial yang lebih tertib dan terukur.
>>>>>>> 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
