import glob
parts=sorted(glob.glob('parts/*.js'))
src='\n'.join(open(p).read() for p in parts)
# hoist ES imports to the top
lines=src.split('\n'); imps=[l for l in lines if l.startswith('import ')]; rest=[l for l in lines if not l.startswith('import ')]
open('scene.js','w').write('\n'.join(imps+rest))
print('built', len(parts), 'parts')
