# PWA IntheraNotes

IntheraNotes dapat dipasang ke layar utama Android/iPhone atau sebagai aplikasi desktop. Tidak ada paket berbayar, migration database, ataupun environment variable baru untuk mengaktifkan PWA.

## Mengaktifkan di website

Deploy source terbaru ke Vercel dan buka melalui HTTPS, misalnya `https://inthera-notes.inthera.tech`. Gunakan satu domain utama secara konsisten: instalasi, cache, dan sesi browser terpisah untuk setiap origin.

- Buka **Pengaturan → Lebih dekat dengan harimu → Pasang aplikasi**, atau tombol pemasangan di halaman login/menu samping.
- Chrome/Edge: gunakan **Pasang sekarang** jika browser menawarkan instalasi. Jika belum, dialog menjelaskan cara memasang melalui menu browser. Browser menentukan ketersediaan prompt.
- iPhone/iPad: buka di Safari, pilih **Bagikan → Tambahkan ke Layar Utama → Tambah**. Aplikasi menyediakan panduan ini karena Safari tidak menyediakan `beforeinstallprompt`.
- Buka IntheraNotes melalui ikon yang baru ditambahkan. Halaman awal adalah dashboard; sesi yang belum login tetap diarahkan ke login.
- Pemasangan tidak membuat akun baru. Perangkat/browser tertentu dapat meminta login kembali.

Banner pemasangan hanya muncul ketika browser menyediakan prompt atau pada iOS. Menutup banner menyembunyikannya selama tujuh hari di browser tersebut; tombol di Pengaturan tetap tersedia. Saat dibuka dalam mode aplikasi, banner dan ajakan pemasangan ringkas disembunyikan.

## Perilaku offline

Service worker aktif pada **build produksi**. Setelah kunjungan online pertama berhasil menyiapkan worker, navigasi tanpa koneksi menampilkan halaman offline dengan tombol **Coba lagi**. Halaman ini berdiri sendiri dan tidak bergantung pada JavaScript/CSS server Next.js untuk tampil.

Jika halaman sudah terbuka, indikator koneksi muncul ketika browser mendeteksi offline. Form dan tombol mutasi menolak pengiriman saat offline serta mempertahankan isian di halaman yang sedang terbuka. Ketika koneksi kembali, pengguna dapat menyimpan ulang sendiri. Tidak ada reload otomatis saat jaringan pulih.

**Memuat, mengubah, dan menyimpan tugas serta keuangan membutuhkan internet.** PWA ini belum menyediakan penyimpanan draft offline lintas restart, antrean sinkronisasi, atau penyelesaian konflik. Isian yang belum disimpan dapat hilang jika halaman ditutup/dimuat ulang. Status online browser juga tidak menjamin Supabase dapat dijangkau; penanganan error jaringan yang sudah ada tetap digunakan.

Cache worker hanya berisi halaman offline dan empat ikon publik. HTML autentikasi/workspace, respons React Server Components, API, mutasi, dan request Supabase tidak masuk Cache Storage. Data aplikasi tetap persisten di Supabase dengan autentikasi/RLS yang sudah ada.

## Tampilan dan pembaruan

- Manifest stabil (`id: /`), mode standalone, nama aplikasi, ikon PNG 192/512, ikon maskable dengan ruang aman, Apple touch icon 180, warna peluncuran, dan shortcut Tugas Hari Ini/Tugas/Keuangan.
- Dukungan safe area untuk notch/home indicator, navigasi bawah, header melekat di mobile, ukuran input sentuh yang menghindari zoom otomatis, serta reduced motion.
- Worker baru menunggu pengguna menekan **Perbarui aplikasi**. Form yang sedang menyimpan menunda pembaruan; isian belum tersimpan meminta konfirmasi sebelum reload.
- Worker memeriksa pembaruan saat aplikasi kembali terlihat atau jaringan pulih. Halaman privat selalu diambil dari jaringan.
- Di Vercel, worker memakai `VERCEL_GIT_COMMIT_SHA` agar commit baru menghasilkan revisi worker baru. Pada build lokal, ubah baseline di `app/sw.js/route.ts` ketika ingin menguji pergantian worker antar-build.
- Ikon PNG berasal dari `public/icons/app-icon.svg`; artwork berada di area aman agar tidak terpotong mask launcher.

Pemasangan PWA tidak otomatis mengaktifkan push notification. Pengingat yang tersedia tetap lonceng di aplikasi dan email opt-in sesuai [REMINDERS.md](REMINDERS.md).

## Pengujian lokal

PowerShell dapat memakai `npm.cmd` jika `npm.ps1` diblokir execution policy.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:pwa
npm.cmd run test:production
```

`test:pwa` menggunakan build produksi yang sudah dibuat, menjalankan server sementara pada port 3141, dan menguji worker sesungguhnya dengan Edge/Chromium. Test tidak login, menulis data Supabase, atau mengirim email. Pengujian mencakup manifest/ukuran PNG/header worker, cache publik, navigasi offline/retry, mempertahankan isian tanpa POST saat offline, prompt instalasi simulasi, dan panduan iPhone pada viewport kecil.

Untuk melihat secara manual: `npm.cmd run build`, lalu `npm.cmd start`. `localhost` dipercaya browser untuk service worker; alamat IP LAN melalui HTTP umumnya tidak. `npm.cmd run dev` tetap menampilkan UI PWA tetapi sengaja tidak mendaftarkan worker agar tidak mengganggu hot reload.

Test instalasi OS dan Safari pada perangkat fisik tetap perlu dilakukan. Emulasi user agent iPhone memeriksa panduan dan layout, bukan menjalankan Safari atau memasang aplikasi pada iOS.

Referensi: [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps), [MDN instalasi](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt), [MDN service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers). Implementasi mengikuti panduan Next.js versi lokal di `node_modules/next/dist/docs/`.
