# Build scene.js for ORIENTASI from the shared ABSEN engine parts + this project's own parts.
# Shared (not copied, so the rig/expression/pose/set libraries stay single-sourced): ../../absen/three/parts/{00,10,12,13,15,16,17,18,20}
# Own: parts/30-shots.js, parts/50-main.js.   python3 build.py [--check]
import glob, sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
shared = [p for p in sorted(glob.glob('../../absen/three/parts/*.js')) if os.path.basename(p)[:2] in ('00', '10', '12', '13', '15', '16', '17', '18', '20')]
parts = shared + sorted(glob.glob('parts/*.js'))
src = '\n'.join(open(p).read() for p in parts)
lines = src.split('\n'); imps = [l for l in lines if l.startswith('import ')]; rest = [l for l in lines if not l.startswith('import ')]
out = '\n'.join(imps + rest)
if '--check' in sys.argv:
    ok = os.path.exists('scene.js') and out == open('scene.js').read(); print('in sync' if ok else 'OUT OF SYNC: run build.py'); sys.exit(0 if ok else 1)
open('scene.js', 'w').write(out); print('built', len(parts), 'parts')
