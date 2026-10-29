# Pengingat tugas IntheraNotes

Pengingat mencakup tugas aktif (`todo` / `in_progress`) yang jatuh tempo hari ini atau sudah terlambat menurut Asia/Jakarta. Tugas selesai, tanpa tenggat, dan tugas masa depan tidak disertakan. Pengingat mengikuti akun login masing-masing.

## Di aplikasi

Ikon lonceng di header menunjukkan jumlah tugas hari ini dan terlambat. Dialog menampilkan delapan tugas pertama dan tautan ke daftar lengkap. Angka dihitung dari database, bukan notifikasi contoh. Pengingat diperbarui saat halaman dimuat/navigasi atau setelah perubahan tugas yang me-refresh data; ini bukan push notification ketika browser ditutup. Preferensi dapat dimatikan melalui Pengaturan → Pengingat tugas.

Pengingat di aplikasi aktif secara default. Jika migration baru belum dijalankan, lonceng tetap dapat menampilkan tugas dari tabel lama, dan halaman pengaturan menjelaskan bahwa penyimpanan preferensi belum tersedia. Fitur inti tetap berjalan.

## Mengaktifkan email (pemilik aplikasi)

1. Terapkan migration baru **setelah** migration awal: `supabase/migrations/202610290002_task_reminders.sql`. Gunakan migration runner yang ada atau jalankan seluruh file sekali di SQL Editor Supabase. Jangan menjalankan ulang migration awal pada database yang sudah digunakan.
2. Siapkan akun Resend dan verifikasi domain pengirim yang Anda miliki. Jika memakai `inthera.tech`, tambahkan record verifikasi pengirim sesuai instruksi Resend pada pengelola DNS domain. Konfigurasi ini terpisah dari pengaturan redirect Supabase Auth. Email pengingat dikirim menggunakan Resend API; pengirim SMTP bawaan Supabase Auth tidak digunakan.
3. Tambahkan environment berikut di Vercel **Production**. Semuanya khusus server dan tidak memakai awalan `NEXT_PUBLIC_`:

   ```dotenv
   SUPABASE_SERVICE_ROLE_KEY=
   RESEND_API_KEY=
   REMINDER_EMAIL_FROM=IntheraNotes <pengingat@inthera.tech>
   CRON_SECRET=
   ```

   Gunakan service-role key project Supabase yang sama, API key pengiriman Resend, alamat dari domain yang sudah diverifikasi, dan `CRON_SECRET` acak minimal 16 karakter. Jangan menggunakan publishable/anon key sebagai service-role key. Pastikan `NEXT_PUBLIC_APP_URL` tetap origin produksi yang benar, misalnya `https://inthera-notes.inthera.tech`.

4. Push source beserta `vercel.json`, lalu deploy ulang. Cron terdaftar pada `/api/cron/task-reminders` dengan ekspresi `0 1 * * *` (01.00 UTC = 08.00 WIB). Vercel menyertakan `Authorization: Bearer <CRON_SECRET>` otomatis. Jadwal Vercel berjalan pada deployment Production; `npm run dev` tidak menjalankan scheduler otomatis.
5. Pengguna masuk dengan email terverifikasi, membuka Pengaturan → Pengingat tugas, mencentang **Email ringkasan pagi**, lalu menyimpan. Default email **mati**, tidak ada opt-in massal otomatis. Pengguna bisa mematikannya kapan saja, termasuk ketika konfigurasi pengirim sedang tidak tersedia.

Jadwal ditampilkan **sekitar pukul 08.00 WIB** karena Vercel Hobby memiliki presisi per jam. Gunakan paket/scheduler yang mendukung presisi menit jika jam tepat merupakan kebutuhan. [Vercel Cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Isi dan konsistensi pengiriman

- Maksimal satu ringkasan per akun login per tanggal WIB. Tidak ada email jika tidak ada tugas yang memenuhi syarat.
- Email berisi jumlah tugas hari ini/terlambat, sepuluh tugas pertama, tautan daftar tugas, dan tautan pengaturan untuk berhenti menerima email. Tidak ada nominal atau catatan keuangan dalam email pengingat.
- Antrean dan status pengiriman persisten di `task_reminder_deliveries`. Unique `(user_id, reminder_date)`, claim token, dan `FOR UPDATE SKIP LOCKED` mencegah dua worker mengklaim pengiriman yang sama.
- Sebelum pengiriman, database memeriksa ulang consent, alamat email terverifikasi yang sama, serta apakah tugas dalam snapshot masih aktif dengan tenggat yang sama. Opt-out, penyelesaian, atau perubahan tenggat dapat membatalkan email yang sudah antre. Seperti email terjadwal pada umumnya, perubahan sesudah request pengiriman diterima provider tidak dapat menarik kembali email tersebut.
- Body email disimpan sebelum menghubungi provider. Retry memakai body dan idempotency key user/tanggal yang sama. Resend menyimpan key selama 24 jam; antrean hari lalu tidak dikirim ulang. [Idempotency Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).
- Request provider memiliki timeout 12 detik. Worker memberi jeda 600 ms antar pengiriman, berjalan paling lama sekitar empat menit per invocation, dan membatasi tiga percobaan per pengiriman. Jumlah harian aktual tetap mengikuti quota akun Resend.
- Antrean diambil bertahap; respons cron memuat jumlah `sent`, `failed`, `skipped`, dan `pending`, tanpa email/alamat pengguna/judul tugas. HTTP 503 menunjukkan kegagalan atau backlog yang belum selesai. Worker tidak mengklaim sukses jika pencatatan DB gagal setelah provider menerima request.

## Monitoring dan retry

Vercel tidak otomatis mengulang cron gagal. Pantau Settings → Cron Jobs dan log invocation. Jika perlu retry, jalankan ulang job melalui kontrol Vercel atau request server yang menyertakan header Authorization. Jangan menaruh secret di query string. Retry harus dilakukan pada tanggal WIB yang sama; lease worker terputus dapat diklaim ulang setelah sepuluh menit. Untuk banyak pengguna yang melampaui kapasitas satu invocation, jalankan kembali backlog atau pindahkan penjadwalan ke worker/queue yang lebih sesuai. [Pengelolaan Vercel Cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

Operator dapat melihat status tanpa membaca isi email:

```sql
select reminder_date, state, count(*)
from public.task_reminder_deliveries
group by reminder_date, state
order by reminder_date desc, state;
```

User biasa hanya dapat membaca preferensi dan riwayat miliknya sendiri. Fungsi worker dan akses lintas pengguna hanya diberikan kepada `service_role`. Module pengirim memakai `server-only`; secret tidak dikirim sebagai props komponen. Log aplikasi tidak mencatat recipient, judul tugas, body email, atau API key.

## Verifikasi

`npm test` menjalankan migration awal dan migration pengingat pada PostgreSQL WASM, termasuk RLS, opt-in, penerima terverifikasi, hari ini/overdue, status selesai, kepemilikan, retry/fencing, snapshot request, kedaluwarsa, dan kontrol endpoint cron. Pengiriman API memakai mock. Pengujian ini tidak mengirim email sungguhan atau mengubah project Supabase live.

Untuk memverifikasi pengiriman sebenarnya, gunakan project/akun test terverifikasi, aktifkan email pengingat akun test, buat tugas dengan tenggat hari ini, dan jalankan job. Invocation tersebut benar-benar mengirim email ke semua akun opt-in yang memenuhi syarat pada project itu, jadi gunakan lingkungan test khusus. Periksa inbox dan status `sent`; jalankan ulang untuk memastikan tidak ada email ganda.

Status `sent` menandakan Resend menerima request pengiriman. Penerimaan di inbox perlu diverifikasi terpisah. Hingga credentials, domain pengirim, migration, dan cron diisi pemilik, email live belum aktif dan belum diklaim terverifikasi.
