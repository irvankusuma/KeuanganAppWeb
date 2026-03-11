# 🖼️ PreviewApp - Dokumentasi Tampilan Aplikasi

Dokumen ini menjelaskan tampilan setiap halaman utama KeuanganApp Web, komponen yang terlihat, dan kegunaan tiap bagian dari sudut pandang pengguna.

---

## 1) Gambaran Umum Tampilan

KeuanganApp Web menggunakan tema gelap (dark UI) dengan fokus:
- teks dan angka finansial tetap mudah dibaca,
- tombol aksi utama mudah dijangkau di layar mobile,
- struktur halaman ringkas agar input cepat.

Secara layout:
- **Header atas**: identitas aplikasi + akses export/import.
- **Area konten utama**: isi halaman aktif.
- **Navigasi bawah (mobile)**: perpindahan menu cepat.

---

## 2) Header Aplikasi (Bagian Atas)

### Komponen
- Judul aplikasi (Catatan/brand aplikasi).
- Tombol ikon download untuk Export/Import.

### Kegunaan
- Memastikan pengguna selalu punya akses cepat backup/restore data.
- Menjadi anchor visual yang konsisten di semua halaman.

---

## 3) Navigasi Aplikasi

## A. Navigasi Desktop
- Berada di atas konten (horizontal tabs/menu).
- Menampilkan menu: Beranda, Hutang, Piutang, Pemasukan, Pengeluaran, Catatan, Perbaikan.

**Kegunaan:**
- Mempermudah perpindahan fitur saat menggunakan layar lebar.

## B. Navigasi Mobile
- Berada di bawah layar (bottom navigation).
- Ikon + label menu untuk akses cepat.

**Kegunaan:**
- Akses menu utama dengan jempol.
- Cepat berpindah modul tanpa scroll panjang.

---

## 4) Preview Halaman Dashboard

### Elemen Tampilan
1. **Kartu Saldo Bersih**
   - Menampilkan total kondisi keuangan saat ini.
2. **Kartu Ringkasan**
   - Hutang, Piutang, Pemasukan, Pengeluaran.
3. **Ringkasan Cepat**
   - Nilai aset/kewajiban/ringkasan rasio.
4. **Tren Transaksi**
   - Grafik per bulan untuk melihat pola.
5. **Ringkasan Catatan**
   - Jumlah catatan dan akses ke halaman Catatan.

### Kegunaan Dashboard
- Memberi pandangan cepat kondisi finansial tanpa membuka menu detail.

---

## 5) Preview Halaman Hutang

### Elemen Tampilan
1. **Filter Hutang**
   - Filter tipe dan status jatuh tempo.
2. **Daftar Kartu Hutang**
   - Nama, nominal, periode, status, total, dibayar, sisa.
3. **Aksi Kartu**
   - Bayar, History, Edit, Hapus.
4. **Modal Bayar Hutang**
   - Input nominal bayar, tanggal, catatan, tombol simpan.
5. **Panel History Pembayaran**
   - Riwayat nominal/tanggal + aksi edit/hapus riwayat.

### Kegunaan
- Membantu kontrol hutang aktif dan cicilan bertahap.

---

## 6) Preview Halaman Piutang

### Elemen Tampilan
1. **Filter Piutang**
   - Filter status jatuh tempo.
2. **Daftar Kartu Piutang**
   - Nama orang, nominal, jatuh tempo, total, diterima, sisa.
3. **Aksi Kartu**
   - Bayar (terima), History, Edit, Hapus.
4. **Modal Bayar Piutang**
   - Input nominal diterima, tanggal, catatan, simpan.
5. **Panel History Pembayaran**
   - Daftar pembayaran masuk + edit/hapus riwayat.

### Kegunaan
- Mempermudah pelacakan piutang yang belum lunas.

---

## 7) Preview Halaman Catatan

### Elemen Tampilan
1. **Filter Catatan**
   - Kategori tipe (standar/list/singkat) + urutan terbaru/terlama.
2. **Search Bar**
   - Cari berdasarkan judul atau isi.
3. **Daftar Catatan**
   - Judul, label tipe, waktu update, isi catatan.
4. **Tombol Tambah (FAB)**
   - Memunculkan pemilih tipe catatan.
5. **Type Picker**
   - Pilih format catatan sesuai kebutuhan.
6. **Modal Form Catatan**
   - Form sesuai tipe (standar/list/singkat), simpan perubahan.

### Kegunaan
- Menyimpan reminder keuangan, daftar kebutuhan, atau catatan keputusan finansial.

---

## 8) Preview Halaman Pemasukan

### Elemen Tampilan
- Daftar transaksi pemasukan.
- Form tambah/edit pemasukan.
- Informasi nominal + kategori/sumber + tanggal.

### Kegunaan
- Melihat arus uang masuk secara terstruktur.

---

## 9) Preview Halaman Pengeluaran

### Elemen Tampilan
- Daftar transaksi pengeluaran.
- Form tambah/edit pengeluaran.
- Kategori pengeluaran untuk analisis kebiasaan belanja.

### Kegunaan
- Mengendalikan biaya rutin dan biaya tak terduga.

---

## 10) Preview Halaman Perbaikan

### Elemen Tampilan
- Daftar item perbaikan.
- Form pencatatan biaya perbaikan dan detail terkait.

### Kegunaan
- Memisahkan biaya perbaikan dari transaksi umum agar evaluasi lebih jelas.

---

## 11) Preview Modal Export/Import

### Komponen
- Tab/opsi export data JSON.
- Tab/opsi import data JSON.

### Kegunaan
- Backup dan restore data aplikasi dengan cepat.

---

## 12) Alur Interaksi Pengguna (Preview UX)

1. Pengguna masuk ke Dashboard untuk melihat ringkasan.
2. Pengguna pindah ke Hutang/Piutang bila ada update pembayaran.
3. Pengguna menambah catatan penting di menu Catatan.
4. Pengguna mencatat pemasukan/pengeluaran harian.
5. Pengguna melakukan export data secara berkala.

---

## 13) Nilai Guna Tampilan Aplikasi

Desain aplikasi dibuat agar:
- **fokus ke data penting** (nominal, tanggal, status),
- **aksi utama jelas** (tambah, bayar, simpan, edit, hapus),
- **mobile-friendly** untuk penggunaan harian,
- **cepat dipahami** oleh pengguna non-teknis.

---

## 14) Catatan Akhir

Dokumen PreviewApp ini berfungsi sebagai referensi tampilan dan kegunaan per halaman. Untuk detail teknis instalasi/jalankan aplikasi, lihat `README.md`.
