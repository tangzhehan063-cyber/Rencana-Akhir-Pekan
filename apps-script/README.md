# Apps Script untuk Travel Planning

Membuat Google Sheet "Travel Planning" (tab `TRAVEL PLAN`) jadi database web app.

## Pasang
1. Buka Sheet -> **Extensions -> Apps Script**.
2. Hapus isi `Code.gs` bawaan, tempel isi file `Code.gs` di folder ini.
3. Ganti `TOKEN` di baris atas dengan kata sandi buatanmu (huruf+angka acak, panjang). Jangan di-commit ke GitHub.
4. Klik **Deploy -> New deployment -> Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik Deploy, izinkan akses Sheet saat diminta (lanjutkan lewat "Advanced -> Go to ... (unsafe)", ini script milikmu sendiri).
5. Salin **Web app URL** (berakhiran `/exec`).

## Tes
Buka di browser: `URL_WEB_APP?token=KATA_SANDI_KAMU`
Harus muncul JSON `{"ok":true,"version":"...","rows":[[...]]}` berisi isi tab TRAVEL PLAN.
Kalau muncul `{"ok":false,"error":"UNAUTHORIZED"}`, token belum cocok atau belum diganti.

## Catatan
- Setiap simpan dari app menimpa baris data A2:M, dan salinan sebelumnya disimpan di tab tersembunyi `_BACKUP`.
- Kolom A, D, E ditulis sebagai teks supaya format tanggal/jam tidak berubah oleh locale Sheet.
- Kalau Sheet diubah dari tempat lain saat app terbuka, simpan dari app akan ditolak (`CONFLICT`) dan app harus memuat ulang dulu.
- Setelah mengubah kode, buat deployment baru atau pakai **Manage deployments -> Edit -> New version** agar perubahan berlaku.
