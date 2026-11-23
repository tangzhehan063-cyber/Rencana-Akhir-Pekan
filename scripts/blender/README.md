# Blender headless (tanpa GUI, tanpa MCP)

Blender dijalankan sebagai modul Python (`bpy` dari PyPI, Blender 5.x). Scene dibangun
dari kode, jadi bisa diulang, di-*diff*, dan dijalankan di server/cloud tanpa layar.

```bash
chmod +x run.sh
./run.sh stickman_scene.py --out render.png --blend scene.blend        # still 1280x720
./run.sh stickman_scene.py --animate --frames 48 --res 640x360 --samples 12 --out frames/
ffmpeg -framerate 24 -i frames/frame_%04d.png -c:v libx264 -pix_fmt yuv420p stickman.mp4
```

Opsi: `--samples` (kualitas Cycles), `--res WxH`, `--blend` (simpan file .blend untuk
dibuka di Blender desktop), `--animate`, `--frames`.

Patokan waktu (CPU 4 core): still 1280x720 @48 sampel ≈ 30 dtk; animasi 48 frame
640x360 @12 sampel ≈ 2,5 mnt.

Kenapa bukan BlenderMCP? MCP butuh aplikasi Blender yang terbuka di mesin yang sama.
Pendekatan skrip ini jalan di mana saja (termasuk CI), dan hasilnya deterministik.
