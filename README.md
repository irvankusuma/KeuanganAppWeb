# KeuanganApp Web

Aplikasi pencatatan keuangan berbasis React dan Vite. Firebase Authentication mengelola akun, sedangkan Cloud Firestore menjadi penyimpanan utama transaksi, profil, dan pengaturan.

## Penyimpanan dan sinkronisasi

- Data transaksi tidak disimpan permanen di `localStorage`; aplikasi menyimpannya di Firestore dan menahan salinan sementara di memori selama aplikasi terbuka.
- Setiap perubahan dikirim ke Firestore. `onSnapshot` menerima perubahan dari perangkat lain secara realtime.
- Perangkat harus online untuk membaca dan menyimpan data. Indikator cloud menunjukkan status koneksi dan penyimpanan.
- Sesi autentikasi Firebase disimpan di IndexedDB browser. Ini hanya sesi login, bukan data transaksi.
- Data lama di browser dan backup Firestore lama (`backups/{uid}`) dimigrasikan satu kali setelah login. Salinan transaksi browser dihapus hanya setelah pengiriman ke Firestore berhasil.

## Menyiapkan Firebase

1. Pastikan konfigurasi proyek pada `src/firebaseConfig.js` sesuai dengan Firebase Web App yang digunakan.
2. Di Firebase Console, aktifkan **Authentication → Email/Password**.
3. Buat **Cloud Firestore Database**.
4. Publikasikan aturan keamanan dari `firestore.rules`. Aturan membatasi setiap pengguna ke profil dan datanya sendiri. Aturan lama yang hanya mengizinkan `backups/{uid}` tidak cukup untuk sinkronisasi baru.
5. Jalankan aplikasi:

```bash
npm install
npm run dev
```

> Jika memakai Firebase CLI, `firebase.json` sudah menunjuk ke `firestore.rules`. Tanpa CLI, salin isi file tersebut ke tab **Firestore Database → Rules** di Firebase Console lalu klik **Publish**. Jangan gunakan aturan terbuka seperti `allow read, write: if true`.

## Migrasi dari versi lokal

- Masuk dengan email yang sama di perangkat yang masih memiliki data lama. Untuk akun lokal lama yang belum ada di Firebase Authentication, aplikasi memverifikasi sandi lama lalu membuat identitas cloud dengan email dan sandi itu.
- Jika data lama terikat pada akun lokal dengan email berbeda, masuklah memakai email lama terlebih dahulu agar data tidak tercampur ke akun lain.
- Data diunggah sebelum kunci transaksi lama di browser dibersihkan. Jika koneksi atau izin Firestore gagal, aplikasi menampilkan kesalahan dan tidak menghapus salinan lokal.
- Di perangkat baru, masuk dengan akun Firebase yang sama untuk memuat data cloud.

## Fitur

- Dashboard, pemasukan, pengeluaran, hutang, piutang, tagihan, anggaran, transaksi rutin, laporan, perbaikan, dan catatan.
- Sinkronisasi realtime antar perangkat menggunakan Firestore listeners.
- Ekspor dan impor JSON, Excel, dan TXT.
- Profil dan penggantian sandi melalui Firebase Authentication.

## Teknologi

- React 18, Vite, Tailwind CSS
- Firebase Authentication dan Cloud Firestore
- Recharts dan Lucide React
