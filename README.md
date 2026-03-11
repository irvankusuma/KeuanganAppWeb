# 📘 KeuanganApp Web

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

## 9) Ringkasan

KeuanganApp Web adalah alat pencatatan keuangan pribadi yang fokus pada kemudahan, kecepatan, dan kontrol data oleh pengguna. Dengan kombinasi dashboard, manajemen hutang/piutang, transaksi harian, dan catatan, aplikasi ini cocok untuk membantu kebiasaan finansial yang lebih tertib dan terukur.
