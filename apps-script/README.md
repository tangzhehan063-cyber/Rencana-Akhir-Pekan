# Travel Planning, app di dalam Google Sheet

App (dashboard, timeline, tabel, ringkasan lokasi, tambah/edit/hapus) yang berjalan
langsung dari Google Sheet lewat Apps Script. Data disimpan di tab `TRAVEL PLAN`.
Tanpa Vercel, tanpa token, tanpa API Google Maps.

## Pasang (sekali, sekitar 5 menit)
1. Buka Sheet "Travel Planning" -> **Extensions -> Apps Script**.
2. Isi `Code.gs` bawaan diganti dengan isi file `Code.gs` di folder ini.
3. Klik **+** di sebelah "Files" -> **HTML**, beri nama `Index` (persis), lalu tempel isi file `Index.html`.
4. Klik **Save**. Kembali ke Sheet, refresh halamannya.
5. Menu baru **Travel Planning -> Buka app** muncul. Klik, izinkan akses saat diminta
   (Advanced -> Go to ... (unsafe), karena script ini milikmu sendiri).

## Buka dari HP (Web App)
**Deploy -> New deployment -> Web app**, lalu:
- Execute as: **Me**
- Who has access: **Only myself** (pribadi) atau **Anyone with Google account**
  Kalau dibuka bersama orang lain, pilih "Execute as: User accessing the web app" dan bagikan Sheet ke
  mereka sebagai Editor. Izin Sheet yang menentukan siapa boleh melihat/mengubah data.
Simpan link `/exec` di HP (Add to Home Screen).

Setelah mengubah kode: **Deploy -> Manage deployments -> Edit -> Version: New version -> Deploy**.

## Catatan
- Setiap perubahan dari app menimpa data di A2:M dan menyimpan salinan sebelumnya di tab tersembunyi `_BACKUP`.
- Kalau Sheet diedit di tempat lain saat app terbuka, app menawarkan pilihan: pakai data Sheet, atau timpa dengan perubahanmu.
- Kolom: A Waktu mulai, B Hari, C Durasi, D Jam mulai, E Jam selesai, F Lokasi, G Pemilik, H Catatan, I Result, J Plan, K Kategori, L Estimasi, M Pengeluaran Real.
- Kolom A, D, E ditulis sebagai teks supaya format tanggal/jam tidak berubah oleh locale Sheet.
- Versi lama (Vite + React + Google Maps) ada di git tag `vite-version`.
