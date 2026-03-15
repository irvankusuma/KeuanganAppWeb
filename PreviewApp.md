# 🖼️ PreviewApp - Panduan Visual & Arsitektur Logika

Dokumen ini berfungsi sebagai pelengkap **[README.md](file:///c:/Users/irfan/OneDrive/Dokumen/Website/KeuanganAppWeb/README.md)**. Jika `README.md` menjelaskan *apa* yang dilakukan aplikasi, `PreviewApp.md` menjelaskan *bagaimana* tampilan dan logika internalnya bekerja secara mendetail.

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
1.  **Layout Shell**: Menggunakan `flex-col` dengan tinggi layar penuh (`min-h-screen`). Area konten memiliki `padding-bottom` pada mobile (pb-20) untuk memberi ruang bagi *Bottom Navigation*.
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
*   **Logika Data**: Dashboard melakukan kalkulasi *real-time* saat halaman dimuat.
    *   `Saldo Bersih = (Pemasukan + Pembayar Piutang) - (Pengeluaran + Pembayar Hutang)`.
*   **Logika Visual**: Menggunakan `Recharts` untuk menganalisis array transaksi dan mengelompokkannya berdasarkan bulan untuk ditampilkan dalam grafik tren.
*   **Alur Kerja**: User memantau Dashboard untuk mengetahui apakah mereka "surplus" atau "defisit" bulan ini.

---

## 💸 3) Detail Halaman: Hutang & Piutang

Manajemen kewajiban dan aset yang mendukung sistem pembayaran bertahap (cicilan).

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
*   **Logika Pembayaran**: Menekan `[ Bayar ]` membuka modal untuk input nominal cicilan. Data ini disimpan dalam array riwayat pembayaran yang terikat pada ID hutang/piutang tersebut.
*   **Penghitungan Sisa**: `Sisa` tidak diambil dari input manual, melainkan hasil pengurangan otomatis: `Total - Sum(Riwayat Pembayaran)`.
*   **Logika Status**: Jika `Sisa <= 0`, status otomatis berubah menjadi "LUNAS" (Hijau). Jika melewati tanggal tempo tanpa lunas, status menjadi "OVERDUE" (Merah).
*   **Alur Kerja**: Catat hutang baru → Bayar cicilan saat ada uang → Pantau sisa hingga lunas.

---

## 📝 4) Detail Halaman: Catatan (Notes)

Modul fleksibel untuk menyimpan informasi non-transaksional.

### 🎨 Denah UI
```text
┌───────────────────────────────────────────────────────────┐
│ [Semua] [Standar] [List] [Singkat]         Search: [ ... ]│
├───────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐    ┌──────────────────────────┐  │
│ │ Rencana Belanja      │    │ Bayar Listrik!           │  │
│ │ [Tipe: List]         │    │ [Tipe: Singkat]          │  │
│ │ • Beras              │    │ *Jangan telat tgl 20*    │  │
│ │ • Minyak             │    └──────────────────────────┘  │
│ └──────────────────────┘                                  │
└─────────────────────────────────────────────────────[ + ]─┘
```

### 🧠 Logika UI & Data
*   **Smart Rendering**: 
    1.  Tipe `List` secara otomatis memproses teks baris baru menjadi poin-poin.
    2.  Tipe `Singkat` membatasi input hingga 100 karakter untuk efisiensi.
*   **Pencarian**: Menggunakan filter array JavaScript untuk mencocokkan kata kunci pada judul dan isi secara *case-insensitive*.
*   **Alur Kerja**: Pilih tipe catatan → Masukkan konten → Simpan.

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

*Kembali ke panduan utama:* **[README.md](file:///c:/Users/irfan/OneDrive/Dokumen/Website/KeuanganAppWeb/README.md)**
