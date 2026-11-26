#!/usr/bin/env python3
"""Temporal-stability audit for rendered B6 (or any) frames / MP4.

Detects what a contact sheet cannot: pixels that flash for one frame while
their neighbourhood stays still (glitter, twinkling highlights, swimming
texture). Real motion moves a pixel's neighbours too, so it is not flagged.
Also reports non-cut luminance pulses (unmotivated light flicker) per tile.

    b6_temporal_audit.py VIDEO.mp4 [--start S --seconds N] [--max-sparkle-per-frame 3]
Exit 1 when the thresholds are exceeded. Thresholds are not to be raised to
make a render pass; fix the source of the artifact instead.
"""
import argparse, json, subprocess, sys
import numpy as np
import cv2


def _gray(a):
    return np.asarray(a, np.float32).mean(axis=2) if a.ndim == 3 else np.asarray(a, np.float32)


def isolated_sparkles(prev, cur, nxt, threshold=24, calm=2.0):
    """Boolean mask of one-frame spikes whose 7x7 neighbourhood did not move."""
    g0, g1, g2 = _gray(prev), _gray(cur), _gray(nxt)
    spike = ((g1 - g0 > threshold) & (g1 - g2 > threshold)) | ((g0 - g1 > threshold) & (g2 - g1 > threshold))
    activity = np.abs(g1 - g0) + np.abs(g2 - g1)
    neighbours = cv2.boxFilter(activity, -1, (7, 7), normalize=False) - activity
    return spike & (neighbours / 48. < calm)


def luminance_pulses(frames, tile=16, amplitude=2.0):
    """Count tile-frames in a brightness zig-zag (up, down, up or the reverse).

    Motion and lighting changes move monotonically; unmotivated flicker
    alternates direction every frame. Cuts are single steps and never zig-zag.
    """
    h, w = frames[0].shape[:2]
    th, tw = h // tile, w // tile
    t = np.array([_gray(f)[:th * tile, :tw * tile].reshape(th, tile, tw, tile).mean(axis=(1, 3)) for f in frames])
    d = np.diff(t, axis=0)
    a, b, c = d[:-2], d[1:-1], d[2:]
    zig = (np.abs(a) > amplitude) & (np.abs(b) > amplitude) & (np.abs(c) > amplitude) & (a * b < 0) & (b * c < 0)
    cuts = int((np.abs(np.diff(np.array([_gray(f).mean() for f in frames]))) > 3.).sum())
    return int(zig.sum()), cuts


def audit(frames, **kw):
    n = len(frames)
    per = [int(isolated_sparkles(frames[i - 1], frames[i], frames[i + 1]).sum()) for i in range(1, n - 1)]
    pulses, cuts = luminance_pulses(frames)
    return {'frames': n, 'cuts_detected': cuts, 'sparkle_pixels_total': sum(per),
            'sparkle_per_frame_mean': float(np.mean(per)) if per else 0.,
            'sparkle_per_frame_max': max(per) if per else 0, 'worst_frames': sorted(range(len(per)), key=lambda i: -per[i])[:5],
            'luma_pulse_tiles': pulses, 'luma_pulse_tiles_per_frame': pulses / max(1, n)}


def decode(path, start=0., seconds=None, size=None):
    probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                                       '-of', 'json', path], capture_output=True, text=True, check=True).stdout)['streams'][0]
    w, h = probe['width'], probe['height']
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start)] + (['-t', str(seconds)] if seconds else []) + \
          ['-i', path, '-vf', 'fps=30', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('video'); ap.add_argument('--start', type=float, default=0.); ap.add_argument('--seconds', type=float)
    ap.add_argument('--max-sparkle-per-frame', type=float, default=3.0)
    ap.add_argument('--max-luma-pulse-per-frame', type=float, default=0.5)
    a = ap.parse_args()
    r = audit(decode(a.video, a.start, a.seconds))
    r['pass'] = r['sparkle_per_frame_mean'] <= a.max_sparkle_per_frame and r['luma_pulse_tiles_per_frame'] <= a.max_luma_pulse_per_frame
    print(json.dumps(r, indent=2)); return 0 if r['pass'] else 1


if __name__ == '__main__':
    sys.exit(main())
