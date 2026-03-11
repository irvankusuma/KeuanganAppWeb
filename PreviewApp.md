# 🖼️ PreviewApp - Peta Tampilan Aplikasi + Logika Penggunaan

Dokumen ini dibuat untuk menjelaskan **tampilan aplikasi seperti denah visual**, lengkap dengan:
- tanda/bagian UI yang terlihat,
- fungsi tiap area,
- alur kerja pengguna,
- logika data yang berjalan di belakang layar.

> Catatan: Diagram ASCII di bawah adalah representasi tampilan aplikasi agar mudah dipahami, terutama untuk review fitur dan UX.

---

## 1) Struktur Umum Tampilan Aplikasi

```text
┌───────────────────────────────────────────────┐
│ 📒 Catatan                           [⬇]     │ ← Header utama (judul + tombol export/import)
├───────────────────────────────────────────────┤
│ Beranda | Hutang | Piutang | ...             │ ← Navigasi Desktop (atas)
├───────────────────────────────────────────────┤
│                                               │
│   (Konten halaman aktif: Dashboard/Hutang/...)│ ← Area kerja utama
│                                               │
└───────────────────────────────────────────────┘

Mobile:
┌───────────────────────────────────────────────┐
│                 Konten halaman                │
│                 (scrollable)                  │
├───────────────────────────────────────────────┤
│ Beranda | Hutang | Piutang | ...              │ ← Bottom navigation (mobile)
└───────────────────────────────────────────────┘
```

### Penjelasan fungsi
1. **Header**
   - Menampilkan identitas aplikasi.
   - Tombol download membuka modal Export/Import.
2. **Navigasi**
   - Memindahkan halaman utama tanpa reload data total.
3. **Konten aktif**
   - Isi halaman sesuai menu yang dipilih.
4. **Bottom-nav mobile**
   - Akses cepat menu dengan jempol.

### Logika UI
- Header dan navigasi bersifat global (muncul di semua halaman).
- Konten tengah berubah berdasarkan route (`/`, `/hutang`, `/piutang`, dst).
- Pada mobile, layout diberi jarak bawah supaya konten tidak tertutup navbar.

---

## 2) Preview Halaman Catatan (Sesuai Gaya yang Anda Minta)

```text
┌─────────────────────────────────┐
│ 📒 Catatan           [Download] │ ← Header (atas)
├─────────────────────────────────┤
│ Beranda | Catatan | Hutang ... │ ← Menu navigasi
├─────────────────────────────────┤
│                                 │
│  (Filter Ringkas)               │
│  Kategori: [Semua] [Standar]    │
│            [List] [Singkat]     │
│  Urut: [Terbaru✓] [Terlama]     │
│                                 │
│  Search: [Cari judul/isi ... ]  │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Ide Bisnis     [Standar] │   │
│  │ 📅 11 Mar 2026           │   │
│  │ Isi catatan...           │   │
│  │ [Edit]  [Hapus]          │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Belanja Bulanan   [List] │   │
│  │ • Beras                  │   │
│  │ • Gula                   │   │
│  │ • Susu                   │   │
│  │ [Edit]  [Hapus]          │   │
│  └──────────────────────────┘   │
│                                 │
│                        [+]      │ ← Tambah catatan baru (FAB)
└─────────────────────────────────┘
```

### Saat tombol `+` ditekan
```text
┌─────────────────────────────────┐
│ Pilih Tipe Catatan              │
├─────────────────────────────────┤
│ [1] Judul + Catatan             │
│ [2] Judul + Catatan Bertitik    │
│ [3] Catatan Singkat (maks 100)  │
└─────────────────────────────────┘
```

### Logika Catatan
1. **Tipe Standar**
   - Input: judul + isi.
   - Dipakai untuk catatan bebas.
2. **Tipe List**
   - Input: judul + isi multiline.
   - Tiap baris baru → ditampilkan sebagai bullet/poin.
3. **Tipe Singkat**
   - Input: isi tanpa judul.
   - Batas karakter maksimum (100).
4. **Filter + Search**
   - Filter kategori dan urutan mengatur daftar tampil.
   - Search memfilter judul/isi.

### Kegunaan halaman Catatan
- Menyimpan reminder pembayaran.
- Menyimpan checklist belanja.
- Menulis ide/agenda keuangan.

---

## 3) Preview Halaman Dashboard

```text
┌───────────────────────────────────────────────┐
│            Saldo Bersih (kartu gradient)      │
│            Rp x.xxx.xxx                        │
├───────────────────────────────────────────────┤
│ [Hutang]   [Piutang]   [Pemasukan] [Pengeluaran]
├───────────────────────────────────────────────┤
│ Ringkasan Cepat                               │
│ - Total Aset Lancar                           │
│ - Total Kewajiban                             │
│ - Rasio Keuangan                              │
├───────────────────────────────────────────────┤
│ Catatan: N catatan               [Buka Catatan]
├───────────────────────────────────────────────┤
│ Grafik Tren Transaksi Bulanan                │
└───────────────────────────────────────────────┘
```

### Logika Dashboard
- Data diambil dari seluruh modul (hutang, piutang, pemasukan, pengeluaran, pembayaran).
- Nilai “sisa hutang/piutang” dihitung dari total minus pembayaran.
- Ringkasan dipakai untuk analisis cepat, bukan input data.

### Kegunaan
- Pusat pantauan kondisi keuangan.
- Shortcut ke halaman catatan.

---

## 4) Preview Halaman Hutang

```text
┌───────────────────────────────────────────────┐
│ Filter: [Semua] [Akan Datang] [Hari Ini] ... │
├───────────────────────────────────────────────┤
│ Nama Hutang                        [Status]   │
│ Tipe: Pribadi                                 │
│ Periode: 12 bln • 2026-03-11                  │
│ Total: Rp 2.000.000 • Dibayar: Rp 500.000     │
│ Sisa: Rp 1.500.000                             │
│ [Bayar] [History] [Edit] [Hapus]              │
├───────────────────────────────────────────────┤
│ Riwayat Pembayaran                             │
│ 2026-03-12  Rp 250.000  [Edit] [Hapus]        │
│ 2026-03-20  Rp 250.000  [Edit] [Hapus]        │
└───────────────────────────────────────────────┘
                          [+]
```

### Modal Bayar Hutang
```text
┌───────────────────────────────────────────────┐
│ Bayar Hutang                                  │
├───────────────────────────────────────────────┤
│ Nama Hutang                                   │
│ Nominal pembayaran                            │
│ Tanggal pembayaran                            │
│ Catatan pembayaran (opsional)                 │
│ [Simpan Pembayaran]                           │
└───────────────────────────────────────────────┘
```

### Logika Hutang
1. Tambah hutang baru → masuk daftar hutang.
2. Saat bayar, data disimpan ke sheet pembayaran hutang.
3. Sistem hitung:
   - `totalDibayar = sum(history pembayaran hutangId)`
   - `sisa = totalHutang - totalDibayar`
4. Edit/hapus history langsung mempengaruhi nilai sisa.

### Kegunaan
- Melacak cicilan secara rinci per hutang.
- Mengurangi risiko salah hitung sisa kewajiban.

---

## 5) Preview Halaman Piutang

```text
┌───────────────────────────────────────────────┐
│ Filter: [Semua] [Akan Datang] [Hari Ini] ... │
├───────────────────────────────────────────────┤
│ Nama Orang                        [Status]    │
│ Tanggal pinjam • Jatuh tempo                   │
│ Total: Rp 3.000.000 • Diterima: Rp 1.000.000   │
│ Sisa: Rp 2.000.000                              │
│ [Bayar] [History] [Edit] [Hapus]               │
├───────────────────────────────────────────────┤
│ Riwayat Pembayaran                              │
│ 2026-03-10  Rp 500.000  [Edit] [Hapus]         │
│ 2026-03-18  Rp 500.000  [Edit] [Hapus]         │
└───────────────────────────────────────────────┘
                          [+]
```

### Logika Piutang
1. Tambah data piutang (siapa + nominal + jatuh tempo).
2. Saat ada pembayaran masuk, simpan ke history pembayaran piutang.
3. Sistem hitung:
   - `totalDiterima = sum(history pembayaran piutangId)`
   - `sisa = totalPiutang - totalDiterima`
4. Edit/hapus history untuk koreksi kesalahan input.

### Kegunaan
- Kontrol penerimaan piutang bertahap.
- Memudahkan penagihan yang belum lunas.

---

## 6) Preview Halaman Pemasukan

```text
┌───────────────────────────────────────────────┐
│ Daftar pemasukan                               │
│ Sumber | Tanggal | Nominal                     │
│ [Edit] [Hapus]                                 │
└───────────────────────────────────────────────┘
                          [+]
```

### Logika
- Tiap transaksi pemasukan disimpan sebagai row.
- Total pemasukan di dashboard mengambil agregasi dari modul ini.

### Kegunaan
- Mengetahui sumber uang masuk per periode.

---

## 7) Preview Halaman Pengeluaran

```text
┌───────────────────────────────────────────────┐
│ Daftar pengeluaran                             │
│ Kategori | Tanggal | Nominal                   │
│ [Edit] [Hapus]                                 │
└───────────────────────────────────────────────┘
                          [+]
```

### Logika
- Tiap pengeluaran disimpan per row.
- Total pengeluaran terhubung ke dashboard.

### Kegunaan
- Memantau pola belanja dan menekan pemborosan.

---

## 8) Preview Halaman Perbaikan

```text
┌───────────────────────────────────────────────┐
│ Daftar perbaikan                               │
│ Nama item | Tanggal | Biaya                    │
│ [Edit] [Hapus]                                 │
└───────────────────────────────────────────────┘
                          [+]
```

### Kegunaan
- Mencatat biaya perbaikan agar tidak tercampur tanpa konteks.

---

## 9) Preview Modal Export / Import

```text
┌───────────────────────────────────────────────┐
│ Export / Import                                │
├───────────────────────────────────────────────┤
│ [Tab Export] [Tab Import]                      │
│ - Export: unduh JSON backup                    │
│ - Import: unggah JSON restore                  │
└───────────────────────────────────────────────┘
```

### Logika Data
- Export membaca semua sheet localStorage.
- Import menimpa data sheet dengan isi file JSON.

### Kegunaan
- Backup berkala.
- Migrasi data antar perangkat.

---

## 10) Logika Besar Aplikasi (End-to-End)

1. Pengguna input data di modul (hutang/piutang/pemasukan/pengeluaran/catatan).
2. Data disimpan lokal di browser.
3. Dashboard membaca semua modul lalu menghitung ringkasan.
4. Riwayat pembayaran hutang/piutang mempengaruhi nilai sisa secara otomatis.
5. Backup/restore menjaga data tetap aman saat ganti perangkat/browser.

---

## 11) Cara Pakai yang Disarankan

### Harian
- Catat pemasukan dan pengeluaran.
- Catat pembayaran hutang/piutang bila ada transaksi.
- Tulis catatan pengingat jika perlu.

### Mingguan
- Cek dashboard (saldo + tren).
- Cek item yang mendekati jatuh tempo.
- Koreksi data dengan edit/hapus jika ada salah input.

### Bulanan
- Review performa keuangan dari tren dan total.
- Export backup JSON.

---

## 12) Nilai Guna Desain

Desain aplikasi fokus pada:
- **kejelasan nominal dan status**,
- **aksi cepat** (Bayar/Edit/Hapus/Simpan),
- **penggunaan mobile-friendly**,
- **navigasi sederhana**,
- **konsistensi antar halaman**.

Dengan begitu pengguna bisa cepat memahami “di mana lihat data”, “di mana input”, dan “di mana memperbaiki kesalahan”.

---

## 13) Penutup

Dokumen ini adalah versi visual + logika dari aplikasi (preview terstruktur). Untuk panduan umum aplikasi, tujuan, dan instruksi menjalankan project, lihat `README.md`.
