# Riset teknologi untuk visual engine baru (24 Nov 2026)

Status: **untuk review, belum ada yang diinstal atau diadopsi.** Tidak ada kode yang disalin dari repo lama.

## 1. Cara membaca laporan ini (tingkat bukti)

Sesi ini hanya bisa menjangkau GitHub dan hasil mesin pencari. Host `remotion.dev`, `threejs.org`, dan `ai.google.dev` **tidak bisa dibuka** (DNS diblokir), jadi halaman dokumentasi resminya belum terbaca.

| Tingkat | Arti |
|---|---|
| **A** | Halaman sumber utama dibaca langsung (GitHub: LICENSE, rilis, README) |
| **B** | Hanya dari ringkasan hasil pencarian web. Masuk akal, tapi belum dicek di halaman resmi |
| **C** | Tidak terverifikasi, atau hasil pencarian saling bertentangan |

Semua angka harga dan batas berlabel B/C harus dicek ulang sebelum keputusan bisnis. Cara termudah: izinkan tiga host di atas di jaringan environment, lalu verifikasi diulang.

## 2. Ringkasan per teknologi

### 2.1 Remotion (kerangka video berbasis React)
- **Fungsi:** menyusun video sebagai komponen React yang bergantung pada nomor frame. Cocok untuk teks, caption, transisi, dan komposisi.
- **Lisensi (A, dari LICENSE di GitHub):** gratis untuk individu, perusahaan for-profit **sampai 3 karyawan**, organisasi nirlaba, dan evaluasi. Perusahaan di luar itu butuh Company License. Dilarang menjual atau melisensikan ulang turunan Remotion sendiri. LICENSE menyatakan "In Remotion 5.0, the license will slightly change" dan isi perubahannya belum kubaca.
- **Harga (B):** Creators $25 per kursi per bulan, Automators $0,01 per render dengan minimum $100 per bulan, Enterprise mulai $500 per bulan. Ini dari ringkasan pencarian, belum dari halaman harga.
- **Kelebihan:** ekosistem matang, Studio untuk preview, caption dan transisi siap pakai, ada skill resmi untuk agen.
- **Kekurangan:** lisensi bersyarat. Render server-side tanpa GPU lambat (lihat 2.9). Menambah lapisan React di atas Three.js.
- **Pertanyaan terbuka yang menentukan:** apakah workflow otomatis dari naskah sampai video (yang kamu inginkan) jatuh ke kategori "Automators" berbayar. Halaman FAQ-nya belum terbaca.

### 2.2 @remotion/three (Three.js di dalam Remotion)
- **Fungsi (B):** `ThreeCanvas` membungkus React Three Fiber dan sinkron dengan `useCurrentFrame()`.
- **Aturan deterministik (B):** animasi harus ditulis dengan `useCurrentFrame`, bukan `useFrame` milik R3F. Saat render, `frameloop` dipaksa `never`.
- **Catatan:** repo lama sudah memakai kombinasi ini. Dokumentasi resminya belum bisa kubaca.

### 2.3 Three.js
- **Rilis terbaru (A):** r187 (30 Okt), sebelumnya r186 (24 Sep) dan r185 (1 Jul).
- **Lisensi (A):** MIT.
- **Perubahan yang berdampak ke proyek ini (A, dari daftar rilis):**
  - r186: `PCFSoftShadowMap` dihapus dan kini menampilkan peringatan. **ABSEN dan LANTAI 4 memakai `PCFSoftShadowMap` pada Three 0.170**, jadi naik versi menyentuh bayangan, yang bisa mengubah tampilan.
  - r186: `Source` diganti nama jadi `TextureSource`, dan `dispose()` renderer menjadi async.
  - r187: `setViewport` dan `setScissor` mengubah cara pixel ratio diterapkan, dan atlas CubeUV diganti.
- **Pelajaran:** kunci versi tepat, commit lockfile, dan baca migration guide tiap kali naik.
- **WebGPURenderer (C):** tidak ada pernyataan resmi "siap produksi". Sumber pihak ketiga menyebutnya belum final, tapi sumber itu lebih tua dari r187. Jangan jadikan dasar.

### 2.4 GSAP
- **Lisensi (B):** sejak 30 Apr 2025 gratis untuk penggunaan komersial, termasuk plugin yang dulu berbayar. Dilarang dipakai di alat animasi no-code yang bersaing dengan Webflow.
- **Cocok?** Kurang. Engine ini butuh waktu yang ditentukan frame, sedangkan GSAP punya jam sendiri. Bisa di-scrub, tapi menambah sumber waktu kedua yang berisiko merusak determinisme. Easing dan interpolasi cukup dibuat kecil sendiri, seperti `ease` dan `seg` yang sudah ada di ABSEN.
- **Rekomendasi:** jangan diadopsi untuk inti. Boleh dievaluasi untuk komposisi 2D saja.

### 2.5 Theatre.js
- **Lisensi (B):** `@theatre/core` Apache-2.0, `@theatre/studio` (editor) AGPL-3.0. Studio hanya dipakai saat pengembangan, jadi bundel produksi cukup core.
- **Kelebihan:** timeline visual untuk kamera dan objek Three.js.
- **Kekurangan:** AGPL pada editor menambah beban hukum. Status pemeliharaan `@theatre/r3f` belum terverifikasi (C).
- **Rekomendasi:** evaluasi saja kalau kamu ingin menyunting kamera secara visual. Untuk alur otomatis dari naskah, data JSON lebih cocok.

### 2.6 pmndrs/postprocessing
- **Lisensi (B):** Zlib, berbasis kode MIT dari Three.js.
- **Fungsi:** pengganti `EffectComposer` bawaan dengan penggabungan efek otomatis dan SMAA. Tidak kompatibel dengan composer bawaan Three.js, jadi tidak boleh dicampur.
- **Relevansi:** ABSEN memakai composer bawaan (bloom, aberasi kromatik, vinyet). Bloom yang terlalu terang di adegan lift dan papan adalah masalah nyata di situ.
- **Rekomendasi:** kandidat untuk dievaluasi di pilot, dengan perbandingan piksel terhadap baseline.

### 2.7 Rapier (fisika)
- **Lisensi (B):** Apache-2.0. Build JS/WASM-nya **deterministik lintas platform** menurut dokumentasinya, tapi build npm utama tidak menjamin itu (harus pakai build deterministik, yang kurang teroptimasi).
- **Relevansi:** jatuh, ragdoll, dan benda yang dibanting.
- **Rekomendasi:** tunda sampai Fase 4. Untuk adegan stickman, animasi berbasis keyframe biasanya lebih terkontrol daripada fisika.

### 2.8 Pilihan non-konvensional
| Opsi | Temuan | Penilaian |
|---|---|---|
| **three-gpu-pathtracer** | MIT (B). Path tracing GPU, mendukung lampu area dan kabut volumetrik. Kualitas "offline" belum terbukti (C). Di mesin tanpa GPU kemungkinan sangat lambat | Menarik untuk still atau shot close-up kualitas tinggi. Bukan untuk render penuh |
| **Godot Movie Maker** | Merekam dengan delta waktu tetap, sehingga deterministik, lewat `--write-movie` (B). Apakah jalan tanpa layar belum jelas (C) | Mekanisme waktunya elegan, tapi memaksa menulis ulang semua dari nol tanpa Three.js. Tidak direkomendasikan |
| **Blender bpy** | GPL untuk perangkat lunaknya (B). Kepemilikan hasil render belum terverifikasi dari sumber yang kudapat | Kualitas dan toon outline bagus, tapi pipeline berat dan terpisah dari ekosistem web. Tidak untuk fase awal |
| **@remotion/web-renderer** | Alpha, "very experimental", encoding lewat WebCodecs (B). Ada laporan artefak piksel acak per frame pada ekspor WebCodecs dengan EffectComposer (B, forum Three.js) | Jangan dipakai untuk produksi sekarang |

### 2.9 Render tanpa GPU (data dari pengalamanmu sendiri)
- Repo lama (A, dibaca langsung): render `swangle`, 9 menit 11 detik untuk video 58 detik pada #01. Dokumen alurnya menyebut ±25 menit per 50 detik di container tanpa GPU. Render awal ±20 sampai 30 menit.
- ABSEN (A, kuukur di sesi ini): render sendiri lewat Playwright dengan SwiftShader, 720×1280, sekitar 0,4 sampai 1,9 detik per frame termasuk screenshot PNG (sampel 6 still). Kasarnya, film ±80 detik × 30 fps ≈ 2.400 frame ≈ 16 sampai 75 menit. Ini perkiraan kasar dari sampel kecil, bukan hasil render penuh.
- Remotion 5.0 disebut menjadikan `angle` dengan fallback SwiftShader sebagai bawaan (B).

### 2.10 Gemini TTS
- Dokumentasi resmi **belum terbaca** (host diblokir). Dari hasil pencarian (B/C): model `gemini-2.5-flash-preview-tts` berstatus preview dengan batas input 8.192 token dan output 16.384 token, serta ada model yang lebih baru (3.1 Flash TTS preview). Harga sekitar $0,50 per juta token input dan $10 per juta token output audio, free tier tidak tersedia. Sumber saling tidak konsisten.
- Kode lama (A) sudah mencoba tiga model berurutan sebagai cadangan, memecah teks per 900 karakter, dan menyimpan hash agar teks yang tidak berubah tidak dibuat ulang.
- **Wajib diverifikasi ulang** sebelum Fase 5: model aktif, harga, dukungan Bahasa Indonesia, jumlah suara.

### 2.11 Skill dan agen
- **remotion-dev/skills (A):** repo "Agent Skills" resmi, sekitar 7,9 ribu bintang, 13 skill (best-practices, create, markup, render, captions, docs, license, dan lainnya). Dipasang lewat `npx remotion skills add` atau `npx skills add remotion-dev/skills`. **Lisensi repo ini tidak tercantum** (tidak ada file LICENSE di `main`). Jangan salin isinya ke repo kita sebelum lisensinya jelas.
- **Standar Agent Skills (B):** `SKILL.md` dengan `name` dan `description`, isi di bawah sekitar 500 baris, detail dipecah ke `references/` supaya dimuat bertahap. Skill di repo ini sudah mengikuti pola itu, tapi SKILL.md-nya padat dan bercabang banyak.
- **Rekomendasi:** pakai standar bentuknya. Tulis skill kita sendiri yang pendek dan tegas, bukan menyalin skill orang lain.

## 3. Hal yang belum terverifikasi

1. Halaman FAQ dan harga Remotion, dan isi perubahan lisensi v5.
2. Dokumentasi `@remotion/three` dan `webgl` (batasan, concurrency, tekstur).
3. Manual WebGPURenderer di threejs.org.
4. Seluruh dokumentasi Gemini TTS dan harga.
5. Lisensi repo `remotion-dev/skills`.
6. Status pemeliharaan `@theatre/r3f`.

Semuanya bisa ditutup dengan satu keputusan: mengizinkan `remotion.dev`, `threejs.org`, dan `ai.google.dev` di environment.
