# Hasil verifikasi implementasi

Tanggal: 29 Oktober 2026 (Asia/Jakarta).

## Pemeriksaan otomatis

| Pemeriksaan                             | Hasil                                                            |
| --------------------------------------- | ---------------------------------------------------------------- |
| ESLint                                  | Lulus, tanpa warning/error                                       |
| Next route type generation + TypeScript | Lulus                                                            |
| Unit dan integrasi PostgreSQL           | 75 test lulus dalam 4 suite                                      |
| Build produksi Next.js                  | Lulus                                                            |
| Playwright/Edge lokal                   | 6 test lulus, 2 test backend live skipped                        |
| Smoke server produksi                   | 7 pemeriksaan HTTP lulus; fixture development ditolak dengan 404 |
| Prettier                                | Lulus                                                            |

Pengujian browser mencakup halaman konfigurasi dan redirect, layout workspace fixture pada lebar 320/390/768/1440, modal tugas/transaksi, label dan fokus awal/kembali, keyboard Escape, konfirmasi isian belum tersimpan, kontrol transfer, sidebar collapse, drawer mobile, tema gelap, tanpa horizontal overflow dan tanpa error JavaScript.

Fixture UI hanya tersedia di development dengan flag test eksplisit. Tidak dipakai pada dashboard pengguna; `/dev-preview` mengembalikan 404 di produksi.

## Database dan keamanan

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
