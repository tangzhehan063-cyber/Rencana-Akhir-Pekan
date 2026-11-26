# Template proyek film stickman horor (Three.js, 9:16)

Titik awal untuk film baru. Berisi rig v4.1 (body spec), lapisan ekspresi dan pose, serta pengaturan
cahaya/efek hasil audit ABSEN vs RONDA MALAM. Film lama (ABSEN, dll.) tidak memakai template ini dan tidak berubah.

## Mulai film baru

```bash
cp -r projects/_template projects/<nama-film>
cd projects/<nama-film>/three && npm ci
# edit parts/20-set.js, 30-cast.js, 40-shots.js, film.json, captions.json
python3 build.py                     # gabungkan parts/ -> scene.js (jangan edit scene.js langsung)
node stills.cjs out/check 0.5 4 7    # still untuk dicek
node ../../../skills/directing-stickman-videos/scripts/three-scene-preflight.cjs index.html out/preflight
node render.cjs 0 <durasi> out/video-silent.mp4
```

Setelah shot stabil: `node scripts/frame-baseline.cjs projects/<nama-film>/three record` (dari root repo),
lalu `... check` setiap kali mengubah kode untuk memastikan gambar tidak berubah tanpa sengaja.

## Isi `three/parts/`

| File | Isi |
|---|---|
| `00-base.js` | renderer, scene, kamera, helper (exposure 0.82) |
| `10-rig.js` | rig stickman v4.1 — salinan persis dari ABSEN; jangan diubah per film |
| `12-expressions.js`, `13-poses.js` | ekspresi wajah dan pose/gerak (`expr`, `acting`, `POSE`, `compose`, `poseMix`, ...) |
| `15-look.js` | **`LOOK`**: semua pengaturan cahaya/efek di satu tempat |
| `16-fx.js` | senter (`makeTorch`), debu atmosfer v2 (`placeDust`), `walkToBody` |
| `20-set.js` | set demo (ruangan) — ganti dengan set film |
| `30-cast.js` | pemeran: identitas (kit) + tubuh (`bodySpec`) |
| `40-shots.js` | `reset()` + daftar shot `{name, t0, t1, f(t)}` |
| `50-main.js` | `cam()`, efek (MSAA, bloom, look pass), overlay, `renderAt`, hook lab |

## Tubuh karakter

```js
const tokoh = makeStick({cap: true, body: bodySpec('tall', 'slim', {headR: 0.12})});
tokoh.metrics.eyeY        // tinggi mata -> framing close-up
tokoh.metrics.sitHipY(SEAT_TOP)   // duduk pas di kursi mana pun
```

Preset (bisa digabung, entri belakang menang): `average tall short slim stocky heavy broad longLimbed smallHead largeHead`.
Taruh `{height: ...}` paling akhir kalau tinggi harus pasti. Cek visual: `node scripts/body-sheet.cjs projects/<nama-film>/three out/bodies`.

## Pengaturan look (alasan dari audit)

- **MSAA 8×** pada target efek: tanpa ini garis tipis berkilau (glitter) karena antialias renderer tidak berlaku di composer.
- **Bloom 0.18 / 0.4 / threshold 0.97**, exposure 0.82, pita atas toon 235: wajah dan sarung tangan putih tidak menyala.
- **`screenMat` / `panelMat`** untuk layar dan panel (di bawah ambang bloom); **`glowMat`** hanya untuk cahaya yang memang harus glow.
- **Debu v2**: ukuran bervariasi dengan batas piksel, memudar dekat lensa, terang hanya di sorot senter.
- **Senter** `torch.set(k, jarakSubjek)`: daya dikompensasi supaya wajah dekat tidak terbakar.
- **`fx.rim`** (cahaya tepi) untuk siluet badan hitam di set gelap; **`fx.key`** untuk close-up wajah.
- **`camWarnings`**: peringatan kalau kamera lebih dekat dari `LOOK.minCamDist` ke kepala tokoh.

Aturan shot: `reset()` mengembalikan semua state, setiap shot hanya bergantung pada `t`, dan shot harus bersambung
(t0 = t1 shot sebelumnya). Preflight memeriksa ini.

Belum termasuk: skrip mix audio generik dan skrip `new-project` (lihat `mix.py` film lama sebagai contoh;
catatan: `mix.py` ABSEN memakai path absolut ke repo lain).
