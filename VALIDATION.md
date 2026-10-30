# Hasil verifikasi implementasi

Tanggal: 30 Oktober 2026 (Asia/Jakarta); termasuk hasil PWA dari 29 Oktober 2026.

## Pemeriksaan otomatis

| Pemeriksaan                             | Hasil                                                            |
| --------------------------------------- | ---------------------------------------------------------------- |
| ESLint                                  | Lulus, tanpa warning/error                                       |
| Next route type generation + TypeScript | Lulus                                                            |
| Unit dan integrasi PostgreSQL           | 167 test lulus dalam 13 suite                                    |
| Build produksi Next.js                  | Lulus                                                            |
| Playwright/Edge lokal                   | 21 test lulus, 2 test skipped sesuai konfigurasi                 |
| PWA pada build produksi                 | 6 test browser lulus                                             |
| Smoke server produksi                   | 8 pemeriksaan HTTP lulus; fixture development ditolak dengan 404 |
| Prettier                                | Lulus                                                            |

Pengujian browser mencakup halaman konfigurasi dan redirect, layout workspace fixture pada lebar 320/390/768/1440, modal tugas/transaksi, label dan fokus awal/kembali, keyboard Escape, konfirmasi isian belum tersimpan, kontrol transfer, sidebar collapse, drawer mobile, tema gelap, tanpa horizontal overflow dan tanpa error JavaScript.

Tambahan konfirmasi shadcn/ui: Alert Dialog berbasis Radix menggantikan seluruh `window.confirm` untuk membuang isian dan pembaruan PWA, serta dipakai pada semua konfirmasi hapus data. Enam test browser memeriksa lapisan dialog di atas form native pada 320/390/1440px, fokus awal/tahanan fokus/kembali ke pemicu, Escape dan batal yang mempertahankan isian, pembatalan hapus tanpa POST, penolakan penutupan saat menyimpan, dan kegagalan request hapus yang mempertahankan baris serta mengaktifkan kembali tombol. Request hapus pada test kegagalan dicegat dan dibatalkan sebelum mencapai server. Peringatan saat menutup/reload tab tetap memakai mekanisme browser `beforeunload`; tampilannya tidak dapat diubah menjadi komponen aplikasi.

Tambahan input nominal 30 Oktober: 30 test formatter memeriksa titik ribuan langsung, penolakan huruf/pecahan/eksponen, nilai tempelan rupiah, posisi kursor, leading zero, koreksi saldo awal lama, dan presisi di atas Number.MAX_SAFE_INTEGER. Test browser nominal memeriksa pengetikan, Backspace/Delete pada pemisah ribuan, penggantian seleksi di tengah angka, validitas input/form data, dan Select All. Test UI responsif terkait dijalankan ulang; validasi server dan batas saldo tetap diuji melalui suite domain/database/actions.

Tambahan PWA: manifest dan dimensi PNG/Apple/maskable, header worker, service worker produksi sebenarnya, navigasi offline dan retry, cache yang hanya berisi lima aset publik, serta form offline yang mempertahankan isian tanpa mengirim POST. Prompt browser disimulasikan untuk menguji pembatalan; user agent iPhone dipakai untuk memeriksa panduan Safari pada 320px. Worker waiting terkontrol menguji penundaan pembaruan selama penyimpanan dan konfirmasi isian belum disimpan. Banner dapat ditunda dan mode standalone menyembunyikan ajakan pemasangan. Sepuluh test unit worker memeriksa cache publik, penghapusan cache versi lama, respons privat dari jaringan, pengecualian POST/API/RSC/Supabase, fallback, dan aktivasi eksplisit. Detail: [PWA.md](PWA.md).

Suite development memakai cache/lock `.next-e2e` yang terpisah dari server kerja. Dua test yang dilewati adalah CRUD Supabase live tanpa credentials akun test dan redirect tanpa konfigurasi karena Supabase lokal sudah dikonfigurasi. Instalasi OS di perangkat fisik serta Safari sebenarnya belum diuji; tidak ada request signup, email, ataupun perubahan data Supabase dari pengujian PWA.

Fixture UI hanya tersedia di development dengan flag test eksplisit. Tidak dipakai pada dashboard pengguna; `/dev-preview` mengembalikan 404 di produksi.

## Database dan keamanan

Tambahan aturan saldo 30 Oktober: 15 test PostgreSQL menjalankan rantai migration awal, pengingat, dan `202610300001_sufficient_balance.sql`. Diperiksa expense 200k dari saldo 100k, pemakaian tepat sampai nol, transfer atomik, perubahan nominal/akun/jenis transaksi, penghapusan pemasukan/transfer yang dananya telah digunakan, koreksi saldo awal, penulisan multirow yang rollback penuh, presisi BIGINT, perbaikan saldo negatif lama, serta isolasi pengguna. Enam test fungsi saldo dan delapan test Server Actions menguji dampak bersih edit/delete, pembacaan uang sebagai string, penolakan sebelum write, kegagalan guard DB setelah preflight, pesan aman, dan sesi tidak sah.

Trigger mengunci semua akun yang terpengaruh dan membuat versi baris akun untuk serialisasi writer; saldo tetap dihitung dari ledger. Pengujian lokal PGlite tidak membuktikan kontensi dua sesi PostgreSQL independen. Migration hosted dan uji kontensi hosted belum dijalankan. Terapkan migration baru sekali sesuai README untuk mengaktifkan perlindungan database pada deployment.

Tambahan pengingat tugas: migration `202610290002_task_reminders.sql` diuji dengan role authenticated/anon/service_role pada PostgreSQL WASM. Lulus untuk due/overdue WIB, pengecualian task selesai/tanpa tanggal/masa depan, consent dan penerima terverifikasi, isolasi tenant, pembatalan setelah opt-out/selesai, unique user/tanggal, retry snapshot, fencing token, batas percobaan, dan kedaluwarsa. Worker dan endpoint cron diuji tanpa mengirim email nyata; header tidak sah ditolak sebelum mengakses admin DB. UI lonceng/dialog/preferensi diuji pada 320/390/1440px tanpa horizontal overflow. Flag fixture development sementara dikembalikan sesudah pemeriksaan. Konfigurasi pengirim, migration hosted, dan pengiriman email/cron live masih memerlukan setup pemilik menurut REMINDERS.md.

Tambahan regresi Auth memverifikasi bahwa Server Action mempertahankan pesan limit email dan kegagalan SMTP, bahwa registrasi tanpa session tetap meminta verifikasi, dan bahwa pesan publik/log diagnostik tidak memuat email, password, token, pesan SQL mentah, atau konfirmasi keberadaan akun. Pengujian menggunakan mock SDK tanpa request signup atau email sungguhan.

Migration asli dijalankan pada PostgreSQL WASM (PGlite), memakai role `authenticated` dan `anon`, serta identitas A/B yang berganti melalui simulasi `auth.uid()` test. Pemeriksaan memakai query SQL sebenarnya.

- Seluruh 7 tabel mengaktifkan RLS; select/update/delete lintas pemilik ditolak/dikembalikan kosong. Manipulasi `user_id`, relasi akun/kategori/proyek lintas user, kategori salah tipe, serta akses anon ditolak.
- View saldo, riwayat, anggaran, RPC laporan, dan ekspor tetap terisolasi.
- Nominal nol/negatif, transfer ke akun sama, dan struktur transaksi tidak lengkap ditolak DB.
- Arsip menjaga histori, menolak transaksi baru dengan relasi arsip, dan mengizinkan koreksi transaksi historis.
- Nominal melampaui `Number.MAX_SAFE_INTEGER` tidak dibulatkan, termasuk agregasi saldo dan ekspor.
- Edit/hapus transaksi memperbarui saldo, realisasi anggaran, dan laporan tanpa efek ganda.
- Export SQL mengembalikan 1.105 transaksi lengkap dan mengikuti filter serta ownership.
- Tanggal periode, status/completed_at, uniqueness kategori, dan hapus proyek tanpa hapus tugas diverifikasi.

Angka penerimaan PRD yang lulus:

| Nilai           | Hasil       |
| --------------- | ----------- |
| Tunai akhir     | Rp550.000   |
| Bank akhir      | Rp1.100.000 |
| Total saldo     | Rp1.650.000 |
| Pemasukan       | Rp200.000   |
| Pengeluaran     | Rp50.000    |
| Arus kas bersih | +Rp150.000  |

Transfer Rp100.000 tidak dihitung sebagai income/expense/anggaran; saldo awal tidak menjadi pendapatan.

## Belum diverifikasi terhadap layanan eksternal

Pada implementasi awal, credentials Supabase dan akun test belum tersedia sehingga dua test backend live dilewati. Pada investigasi registrasi berikutnya, pengaturan Auth publik berhasil dibaca: signup dan provider email aktif, serta verifikasi email diwajibkan. Pengujian registrasi/verifikasi email, SMTP/password recovery, session refresh, dan CRUD hosted **belum diklaim lulus end-to-end live**. Investigasi ini tidak membuat akun, mengirim email, atau mengubah pengaturan Auth. Penyebab kegagalan pendaftaran live tetap memerlukan kode dari log Auth.

Pemeriksaan responsif/tema menggunakan fixture lokal, sedangkan persistensi, kalkulasi, serta RLS diuji di PostgreSQL sebenarnya yang berjalan lokal. Browser yang diperiksa adalah Edge; Safari/Firefox dan perangkat fisik belum diperiksa. Gunakan README untuk konfigurasi dan perintah pengujian ulang.
