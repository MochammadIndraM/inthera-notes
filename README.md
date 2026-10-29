# IntheraNotes

Workspace pribadi berbahasa Indonesia untuk tugas dan catatan keuangan. Dibangun di project Next.js yang sudah ada, tanpa membuat ulang project.

## Menjalankan aplikasi

Gunakan Node.js 22.12+ atau 24 LTS dan npm. Implementasi ini diperiksa dengan Node.js 24.

```powershell
npm ci
Copy-Item .env.example .env.local
# Isi .env.local sesuai langkah Supabase di bawah.
npm run dev
```

Buka `http://localhost:3000`. Tanpa konfigurasi Supabase, route login dan workspace mengarah ke halaman **Konfigurasi database diperlukan**. Tidak ada fallback ke data dummy atau penyimpanan browser untuk data pengguna.

## Konfigurasi Supabase (wajib sekali)

1. Buat project di Supabase, atau gunakan project development yang sudah ada. Aktifkan Email/password pada Authentication → Sign In / Providers.
2. Salin Project URL dan **publishable key** dari halaman Connect / API Keys ke `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ISI_PUBLISHABLE_KEY
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   Jika project memakai legacy anon key, isi `NEXT_PUBLIC_SUPABASE_ANON_KEY` dan kosongkan publishable key. Jangan gunakan secret key atau service-role key. Aplikasi tidak memerlukannya.

3. Buka SQL Editor di project Supabase, jalankan **seluruh** isi `supabase/migrations/202610290001_initial.sql` sekali. Migration membuat tabel, index, trigger onboarding, foreign key komposit, RLS, view saldo, dan RPC laporan/ekspor. File berjalan dalam transaksi: jika gagal, seluruh perubahan dibatalkan. Bila memakai migration runner Supabase, simpan file ini sebagai migration versioned dan jalankan lewat workflow database yang ada. Jangan menerapkan ulang migration yang sudah tercatat; gunakan migration baru untuk perubahan selanjutnya.
4. Di Authentication → URL Configuration, isi **Site URL** dengan origin aplikasi dan tambahkan redirect URL:

   ```text
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/callback?next=/reset-password
   ```

   Untuk browser test backend pada port 3100, tambahkan padanan `http://127.0.0.1:3100`. Gunakan URL HTTPS deployment untuk produksi dan perbarui `NEXT_PUBLIC_APP_URL` sebelum build/deploy. Jangan menambahkan slash penutup pada environment origin.

5. Email template yang direkomendasikan (Authentication → Email Templates):
   - Confirm signup: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
   - Reset password: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

   Callback juga mendukung PKCE `?code=...` dari template default. Token hash memungkinkan verifikasi di perangkat lain. Aktifkan konfirmasi email sesuai kebijakan project; aplikasi menampilkan instruksi verifikasi jika registrasi belum menghasilkan session. Konfigurasikan SMTP dan rate limit pengiriman di Supabase untuk penggunaan nyata.

6. Restart `npm run dev` setelah mengubah env. Daftarkan akun, verifikasi email bila diminta, lalu masuk. Profil dan 15 kategori privat dibuat oleh trigger secara otomatis; tidak ada transaksi, tugas, atau saldo demo. Pengguna lama di Supabase mendapat backfill profil/kategori saat migration dijalankan.

## Fitur yang diimplementasikan

- Email/password: registrasi, login, logout, callback verifikasi, lupa/reset password, proteksi halaman dan mutasi.
- Dashboard gabungan: tugas aktif, selesai hari ini, fokus hari ini/overdue, saldo semua akun, pengeluaran, arus kas, transaksi terbaru, dan quick add.
- Tugas: tambah/edit/hapus, deskripsi, tanggal kalender, prioritas, status, selesai/buka kembali, proyek, search, filter status/prioritas/proyek/tanggal, sorting, dan pagination server.
- Hari Ini memisahkan overdue di bagian **Perlu perhatian**; Mendatang hanya memuat tugas aktif setelah hari ini.
- Proyek: tambah/edit/arsip/aktifkan/hapus. Hapus proyek melepas relasi tugas dalam satu operasi database tanpa menghapus tugas.
- Akun: tunai, bank, e-wallet, lainnya; saldo awal signed integer, tanggal pembukaan, edit, arsip/aktifkan, dan peringatan saldo negatif.
- Pemasukan, pengeluaran, transfer internal: tambah/edit/hapus, tanggal, kategori, akun, judul/catatan; transfer atomik sebagai satu row, dua akun berbeda.
- Riwayat transaksi: pencarian judul/catatan, filter jenis/kategori/akun/bulan/rentang tanggal, urut nominal/tanggal, pagination 25 item.
- Kategori bawaan/kustom: tambah/edit/arsip/aktifkan melalui Pengaturan. Nama unik per pemilik dan jenis, case insensitive. Perubahan jenis kategori yang sudah direferensikan ditolak database.
- Keuangan: ringkasan bulan terpilih, grafik arus kas dengan tabel angka alternatif, kategori pengeluaran, saldo akun, transaksi periode terpilih.
- Anggaran bulanan: tambah/edit/hapus, unique kategori/bulan, realisasi otomatis, threshold 80% dan 100%, toast peringatan saat menyimpan pengeluaran mendekati/melewati limit. Pencatatan tetap diizinkan, tanpa rollover.
- Laporan: bulan atau rentang tanggal hingga 367 hari; total income/expense/net, tren, ranking kategori, CSV UTF-8 dengan BOM dan mitigasi formula injection. Export mengikuti filter transaksi, tanpa batas pagination layar atau cap 1.000 row PostgREST, memakai satu snapshot statement database.
- Pengaturan: profil dan preferensi terang/gelap/sistem tersimpan di database. IDR dan WIB tetap untuk MVP; localStorage hanya menyimpan salinan preferensi tema agar tidak berkedip saat memuat.
- UI responsif, sidebar collapse/drawer, bottom navigation mobile, modal native dengan focus management, label input dan error inline, loading, empty/error/retry state, toast, disabled submit, dan konfirmasi hapus.

## Keputusan arsitektur

- Next.js **16.4.3**, React **19.3**, TypeScript, App Router, dan Tailwind 4 existing dipertahankan. Tidak ada `create-next-app` atau migrasi router.
- Halaman dirender per request (`force-dynamic`), tanpa cache data privat lintas pengguna. `cacheComponents` starter dinonaktifkan agar boundary autentikasi tetap eksplisit. `React.cache` hanya menduplikasi query dalam request yang sama.
- `@supabase/ssr` mengelola cookie; `proxy.ts` menyegarkan token, setiap halaman/query dan Server Action memverifikasi user. Tidak mempercayai `getSession()` untuk otorisasi. Respons sesi diberi `private, no-store`.
- Seluruh tabel privat memiliki RLS `USING` dan `WITH CHECK`. Relasi akun/kategori/proyek memakai foreign key komposit dengan `user_id`. Jenis kategori transaksi/budget juga dikunci database. Validasi server memeriksa kepemilikan dan status arsip sebelum write; trigger DB menolak relasi arsip baru dan mempertahankan histori.
- Nilai uang disimpan `BIGINT`, masuk database sebagai string decimal. View/RPC mengembalikan uang sebagai **text** agar JSON tidak melewati safe integer JavaScript. Kalkulasi uang memakai `bigint`; konversi `number` terbatas pada rasio visual grafik/progress. Saldo dihitung dari ledger, bukan field saldo mutabel. Total saldo termasuk akun arsip dan seluruh tanggal; kartu periode hanya mengacu tanggal transaksi.
- `DATE` tidak dikonversi melalui timezone browser. Batas hari/timestamp tugas memakai Asia/Jakarta. Transfer tidak masuk income, expense, net flow, atau budget.
- UI memakai komponen reusable, Lucide, dan Sonner. Grafik CSS dengan tabel alternatif menghindari dependensi chart tambahan. Font memakai system stack agar build tidak memerlukan unduhan Google Fonts.
- Semua operasi keuangan bersifat pencatatan manual. Transfer internal tidak mengirim uang ke bank.

## Perintah pemeriksaan

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:production
npm run format:check
```

- `typecheck` menjalankan `next typegen` sebelum TypeScript.
- Vitest menguji parser IDR, presisi BIGINT, WIB/date boundary, status tugas, sanitasi CSV, redirect, dan validasi.
- Suite integrasi menjalankan **migration SQL asli di PostgreSQL WASM (PGlite)**, bukan mock query. Bootstrap `auth.users`, role, dan `auth.uid()` test terpisah dari produksi. Diuji: RLS semua entitas/view/RPC, manipulasi pemilik, relasi lintas user, kategori salah tipe, nominal invalid, arsip, ledger/edit/delete, budget, completed_at, penghapusan proyek, export >1.000 baris, dan angka penerimaan PRD.
- Pada Windows, Playwright memakai Edge terpasang. Sistem lain: `npx playwright install chromium`, lalu jalankan test. Browser channel dapat diatur dengan `E2E_BROWSER_CHANNEL`. Suite membuka dev server terisolasi pada port 3100 dan menutupnya setelah selesai.
- Browser test tanpa backend memeriksa setup, redirect tanpa konfigurasi, layout 320/390/768/1440, dialog/label/fokus/keyboard, transfer controls, sidebar/mobile drawer, dan tema gelap.
- `test:production` memerlukan build terlebih dahulu; menjalankan server sementara di port 3101, memeriksa proteksi halaman dan memastikan fixture tidak dapat diakses di produksi. Redirect setelah streaming dapat memiliki HTTP 200 dengan meta redirect; browser tetap diarahkan sebelum konten privat dimuat.

### Fixture UI terpisah

`tests/fixtures/workspace.ts` hanya digunakan route development `/dev-preview`. Route memerlukan `NODE_ENV=development` **dan** `INTHERA_UI_TEST=1`, selalu 404 pada build produksi. Banner menyatakan semua data sebagai fixture. Route tidak digunakan aplikasi pengguna dan tidak menyediakan penyimpanan palsu. Playwright mengaktifkannya sendiri untuk pengujian layout. Screenshot dan trace berada di `test-results/` (diabaikan Git).

### E2E backend asli

Gunakan project Supabase development yang sudah diberi migration serta akun test email/password yang sudah terverifikasi. Isi variabel berikut di `.env.local` (jangan commit):

```dotenv
E2E_TEST_EMAIL=
E2E_TEST_PASSWORD=
# Opsional: gunakan server sendiri (tambahkan redirect Auth yang cocok)
E2E_BASE_URL=
```

`npm run test:e2e` menjalankan login, tugas selesai/reopen setelah reload, akun Tunai/Bank, expense/income/transfer, verifikasi saldo dan delta laporan, edit/hapus, mobile, serta logout. Data diberi nama unik `E2E ...` dan dibersihkan sesudah test. Gunakan akun test khusus karena test memang membuat dan menghapus record. Tanpa credentials, test backend diberi status **skipped**, bukan dianggap lulus. Registrasi/verifikasi dan pengiriman reset email perlu pemeriksaan dengan inbox/SMTP project yang sebenarnya.

## File penting

- `app/(workspace)/`: dashboard, tugas/proyek, keuangan, anggaran/laporan, settings.
- `app/(auth)/`, `app/auth/callback/`, `app/reset-password/`: alur autentikasi.
- `app/setup/`: state konfigurasi belum tersedia.
- `components/`: shell, form, list, dialog, metric, chart, pagination.
- `lib/actions/`, `lib/queries.ts`, `lib/supabase/`: boundary server, auth, validasi, reads/writes.
- `lib/domain.ts`, `lib/validation.ts`, `lib/types.ts`: uang/tanggal/CSV/schema/tipe.
- `supabase/migrations/202610290001_initial.sql`: schema dan keamanan database.
- `tests/`, `playwright.config.ts`, `vitest.config.mts`: pengujian.

## Status dan batas verifikasi

Lihat `VALIDATION.md` untuk hasil pemeriksaan implementasi ini. Supabase live, pengiriman email, dan E2E terhadap layanan tersebut hanya dapat diverifikasi setelah pemilik mengisi credentials dan menerapkan migration. PGlite memverifikasi PostgreSQL/RLS sebenarnya, tetapi bukan layanan Supabase Auth/SMTP/PostgREST hosted.

Halaman histori dipaginasi. Daftar konfigurasi akun/kategori/proyek ditujukan untuk workspace pribadi dan memakai batas respons standar project Supabase (umumnya 1.000 record per daftar); histori transaksi dan export tidak mengandalkan batas itu. Ekspor memuat satu dokumen hasil SQL di memori server; untuk dataset sangat besar, pertimbangkan background export. Tidak ada reminder, sync bank, multiuser, offline sync, atau fitur P2.

Referensi implementasi auth: [Supabase SSR untuk Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client). Konvensi Next.js diperiksa terhadap dokumentasi versi terpasang pada `node_modules/next/dist/docs/`.
