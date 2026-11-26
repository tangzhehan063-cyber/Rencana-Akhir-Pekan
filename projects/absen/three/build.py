# Concatenate parts/*.js into scene.js (hoisting ES imports to the top).
# Usage: python3 build.py          -> write scene.js
#        python3 build.py --check  -> exit 1 if scene.js differs from parts/ (never writes)
# parts/ is the source of truth. Do not hand-edit scene.js.
import glob, sys
parts = sorted(glob.glob('parts/*.js'))
src = '\n'.join(open(p).read() for p in parts)
lines = src.split('\n'); imps = [l for l in lines if l.startswith('import ')]; rest = [l for l in lines if not l.startswith('import ')]
out = '\n'.join(imps + rest)
if '--check' in sys.argv:
    ok = out == open('scene.js').read()
    print('scene.js is in sync with parts/' if ok else 'OUT OF SYNC: scene.js differs from parts/ (edit parts/, then run build.py)')
    sys.exit(0 if ok else 1)
open('scene.js', 'w').write(out)
print('built', len(parts), 'parts')
