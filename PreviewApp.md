# 🖼️ PreviewApp - Panduan Visual & Arsitektur Logika

Dokumen ini berfungsi sebagai pelengkap **[README.md](file:///c:/Users/irfan/OneDrive/Dokumen/Website/KeuanganAppWeb/README.md)**. Jika `README.md` menjelaskan _apa_ yang dilakukan aplikasi, `PreviewApp.md` menjelaskan _bagaimana_ tampilan dan logika internalnya bekerja secara mendetail.

---

## 🏗️ 1) Arsitektur Layout Utama

Aplikasi menggunakan layout responsif yang beradaptasi antara perangkat Desktop dan Mobile.

```text
┌───────────────────────────────────────────────────────────┐
│ [LOGO] KeuanganApp                                [📤][📥] │ ← Header (Global)
├───────────────────────────────────────────────────────────┤
│ Beranda | Hutang | Piutang | Pemasukan | Pengeluaran | ... │ ← Navigasi Desktop
├───────────────────────────────────────────────────────────┤
│                                                           │
│   (AREA KONTEN AKTIF)                                     │ ← Rendered Page
│   Statistik, List Data, Grafik, Modul CRUD                │
│                                                           │
├───────────────────────────────────────────────────────────┤
│ (Navigasi Mobile: Home | Hutang | Piutang | Menu)         │ ← Bottom Nav (Mobile)
└───────────────────────────────────────────────────────────┘
```

### 🧠 Logika Global

1.  **Layout Shell**: Menggunakan `flex-col` dengan tinggi layar penuh (`min-h-screen`). Area konten memiliki `padding-bottom` pada mobile (pb-20) untuk memberi ruang bagi _Bottom Navigation_.
2.  **State Persistence**: Data dimuat sekali saat aplikasi pertama kali dibuka (di `App.jsx`) dan didistribusikan ke komponen-komponen yang membutuhkan melalui props atau context (internal React).
3.  **Responsivitas**: Menyembunyikan navigasi atas pada layar kecil dan menampilkan navigasi bawah (Icon-based) untuk kenyamanan jempol pengguna mobile.

---

## 📊 2) Detail Halaman: Dashboard

Dashboard adalah pusat agregasi data dari semua modul lain untuk memberikan ringkasan kesehatan finansial.

### 🎨 Denah UI

```text
┌───────────────────────────────────────────────────────────┐
│ [   Kartu Saldo Bersih: Rp 12.500.000 (Gradient Card)   ] │
├───────────────────────────┬───────────────────────────────┤
│ [ Hutang: Rp 2jt ]        │ [ Piutang: Rp 5jt ]           │
├───────────────────────────┼───────────────────────────────┤
│ [ Pemasukan: Rp 15jt ]    │ [ Pengeluaran: Rp 8jt ]       │
├───────────────────────────┴───────────────────────────────┤
│ Grafik Tren Transaksi (Chart Area)                        │
│ 📈 (Line/Bar Chart menunjukkan naik turun kas bulanan)    │
├───────────────────────────────────────────────────────────┤
│ Ringkasan Catatan: 5 Catatan Baru          [Buka Catatan] │
└───────────────────────────────────────────────────────────┘
```

### 🧠 Logika UI & Data

- **Logika Data**: Dashboard melakukan kalkulasi _real-time_ saat halaman dimuat.
  - `Saldo Bersih = (Pemasukan + Pembayar Piutang) - (Pengeluaran + Pembayar Hutang)`.
- **Logika Visual**: Menggunakan `Recharts` untuk menganalisis array transaksi dan mengelompokkannya berdasarkan bulan untuk ditampilkan dalam grafik tren.
- **Alur Kerja**: User memantau Dashboard untuk mengetahui apakah mereka "surplus" atau "defisit" bulan ini.

---

## 💸 3) Detail Halaman: Hutang & Piutang

Manajemen kewajiban and aset yang mendukung sistem pembayaran bertahap (cicilan).

### 🎨 Denah UI (Representasi Hutang/Piutang)

```text
┌───────────────────────────────────────────────────────────┐
│ Search: [ Cari nama... ]   Filter: [Belum Lunas/Lunas]    │
├───────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Nama: Pinjaman Bank XYZ              [STATUS: CICIL]  │ │
│ │ Total: Rp 10.000.000      Dibayar: Rp 4.000.000       │ │
│ │ Sisa : Rp 6.000.000       Tempo  : 15 Apr 2026        │ │
│ │ ----------------------------------------------------- │ │
│ │ [ Bayar ]   [ Riwayat ]   [ Edit ]   [ Hapus ]        │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────[ + ]─┘
```

### 🧠 Logika UI & Data

- **Logika Pembayaran**: Menekan `[ Bayar ]` membuka modal untuk input nominal cicilan. Data ini disimpan dalam array riwayat pembayaran yang terikat pada ID hutang/piutang tersebut.
- **Penghitungan Sisa**: `Sisa` tidak diambil dari input manual, melainkan hasil pengurangan otomatis: `Total - Sum(Riwayat Pembayaran)`.
- **Logika Status**: Jika `Sisa <= 0`, status otomatis berubah menjadi "LUNAS" (Hijau). Jika melewati tanggal tempo tanpa lunas, status menjadi "OVERDUE" (Merah).
- **Alur Kerja**: Catat hutang baru → Bayar cicilan saat ada uang → Pantau sisa hingga lunas.

---

## 📝 4) Detail Halaman: Catatan (Notes)

Modul fleksibel untuk menyimpan informasi non-transaksional.

### 🎨 Denah UI

```text
┌───────────────────────────────────────────────────────────┐
│ [Semua] [Standar] [List] [Singkat]         Search: [ ... ]│
├───────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐    ┌──────────────────────────┐  │
 filtrate Ide Bisnis      │    │ Bayar Listrik!           │  │
│ │ [Tipe: List]         │    │ [Tipe: Singkat]          │  │
│ │ • Beras              │    │ *Jangan telat tgl 20*    │  │
│ │ • Minyak             │    └──────────────────────────┘  │
│ └──────────────────────┘                                  │
└─────────────────────────────────────────────────────[ + ]─┘
```

### 🧠 Logika UI & Data

- **Smart Rendering**:
  1.  Tipe `List` secara otomatis memproses teks baris baru menjadi poin-poin.
  2.  Tipe `Singkat` membatasi input hingga 100 karakter untuk efisiensi.
- **Pencarian**: Menggunakan filter array JavaScript untuk mencocokkan kata kunci pada judul dan isi secara _case-insensitive_.
- **Alur Kerja**: Pilih tipe catatan → Masukkan konten → Simpan.

---

## 📥 5) Logika Background: Import & Export

Sistem keamanan data tanpa database cloud.

### 🧠 Mekanisme Data

1.  **Export**:
    - Mengumpulkan seluruh data object dari `localStorage`.
    - Mengonversinya menjadi format `.json`.
    - Memicu fungsi `download` browser untuk menyimpan file di perangkat user.
2.  **Import**:
    - Meminta user mengunggah file `.json`.
    - Melakukan validasi kunci (misal: memastikan ada field `hutang` dan `transaksi`).
    - Menulis ulang data ke `localStorage`.
    - Melakukan sinkronisasi ulang state aplikasi.

---

## 📈 6) Relasi Antar Data (Data Connection)

- **Transaksi (In/Out)** mempengaruhi **Saldo Dashboard**.
- **Riwayat Bayar Hutang** mempengaruhi **Sisa Hutang** AND **Saldo Dashboard** (sebagai pengeluaran).
- **Riwayat Bayar Piutang** mempengaruhi **Sisa Piutang** AND **Saldo Dashboard** (sebagai pemasukan).
- **Catatan** berdiri sendiri namun sering digunakan pengguna untuk mencatat detail transaksi yang terlalu panjang.

---

## 🏁 7) Kesimpulan

Aplikasi ini didesain agar user menghabiskan waktu seminimal mungkin untuk menginput (kecepatan), namun mendapatkan informasi semaksimal mungkin (detail dashboard). Integrasi antara riwayat pembayaran dan total nilai memastikan akurasi data finansial pengguna tetap terjaga.

_Kembali ke panduan utama:_ **[README.md](file:///c:/Users/irfan/OneDrive/Dokumen/Website/KeuanganAppWeb/README.md)**
�─────┐
│ Bayar Hutang │
├───────────────────────────────────────────────┤
│ Nama Hutang │
│ Nominal pembayaran │
│ Tanggal pembayaran │
│ Catatan pembayaran (opsional) │
│ [Simpan Pembayaran] │
└───────────────────────────────────────────────┘

````

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
````

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

> > > > > > > 3bf18bf684fcf3ad42d6cc01a9c158af36f417b0
