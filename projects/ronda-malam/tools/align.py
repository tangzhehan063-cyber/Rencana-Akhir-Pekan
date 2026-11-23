# Builds voices.wav from trimmed clips + phrase captions (phrase bounds snapped to detected pauses). Run from audio/.
import subprocess, json, re
place=[('c1t.wav', 1.7), ('c2t.wav', 30.3), ('h1fx.wav', 45.5), ('c3t.wav', 51.2), ('w1fx.wav', 55.95), ('c4a.wav', 58.32), ('c4b.wav', 61.01), ('c4c.wav', 68.22), ('c5t.wav', 86.54), ('c6t.wav', 96.92)]
END=111.91
phr={
'c1t.wav':["Malam itu,","Dimas pertama kali ikut ronda.","Di dinding pos,","ada selebaran berisi peraturan ronda RT 04.","Aturan pertama.","Ronda harus berempat.","Jangan pernah berjalan sendirian.","Aturan kedua.","Kentongan dua kali berarti aman.","Kalau berbunyi tiga kali,","segera masuk pos dan matikan senter.","Aturan ketiga.","Tepat pukul satu malam,","hitung jumlah peronda."],
'c2t.wav':["Malam itu, Dimas berkeliling","bersama Pak Harjo, Udin, dan Bambang.","Empat orang.","Sesuai aturan.","Tepat pukul satu,","mereka berhenti di ujung gang.","Pak Harjo mulai menghitung."],
'h1fx.wav':["\"Satu...","dua...","tiga...","empat.\""],
'c3t.wav':["Lalu terdengar suara dari belakang mereka.","Berbisik."],
'w1fx.wav':["\"Lima.\""],
'c4a.wav':["Tidak ada yang berani menoleh."],
'c4b.wav':["Tiba-tiba,","dari pos ronda yang kosong,","kentongan berbunyi tiga kali."],
'c4c.wav':["Mereka langsung berlari masuk.","Mengunci pintu.","Mematikan semua senter.","Dalam gelap,","Dimas meraba dinding","untuk mencari selebaran peraturan tadi.","Tapi ada sesuatu yang berubah.","Sekarang, ada aturan keempat.","Tulisan tangan.","Tinta masih basah."],
'c5t.wav':["Aturan keempat.","Jika jumlah peronda lima orang,","jangan pernah menghitung ulang.","Yang kelima akan pulang","bersama orang terakhir yang masuk pos."],
'c6t.wav':["Dimas menelan ludah.","Dia baru sadar...","Dialah orang terakhir yang masuk.","Dan tepat di belakangnya...","Ada seseorang yang ikut menutup pintu."]}
def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
def chunks(f,d=0.15):
    out=subprocess.run(['ffmpeg','-hide_banner','-i',f,'-af',f'silencedetect=n=-38dB:d={d}','-f','null','-'],capture_output=True,text=True).stderr
    D=dur(f); ev=re.findall(r'silence_(start|end): ([0-9.]+)',out); cs=[];cur=0.0
    for k,t in ev:
        t=float(t)
        if k=='start':
            if t-cur>0.08: cs.append([cur,t])
        else: cur=t
    if D-cur>0.08: cs.append([cur,D])
    return cs
def dp_align(raw, ps):
    # Align phrases to speech chunks (boundaries only at detected pauses). Phrases sharing one chunk are merged into one caption.
    n,m=len(raw),len(ps); L=[len(p) for p in ps]
    speech=sum(b-a for a,b in raw); rate=speech/sum(L)
    INF=1e18; dp=[[INF]*(m+1) for _ in range(n+1)]; bk=[[None]*(m+1) for _ in range(n+1)]; dp[0][0]=0
    for i in range(n):
        for j in range(m):
            if dp[i][j]>=INF: continue
            for i2 in range(i+1,n+1):
                d=sum(b-a for a,b in raw[i:i2])
                for j2 in range(j+1,m+1):
                    c=(d-sum(L[j:j2])*rate)**2+0.6*(j2-j-1)
                    if dp[i][j]+c<dp[i2][j2]: dp[i2][j2]=dp[i][j]+c; bk[i2][j2]=(i,j)
    out=[]; i,j=n,m
    while (i,j)!=(0,0):
        pi,pj=bk[i][j]; a,b=raw[pi][0],raw[i-1][1]; grp=ps[pj:j]
        # long merged groups: split back into phrase captions proportionally (keeps captions to one short line)
        if len(grp)>1 and len(' '.join(grp))>34:
            tot=sum(len(p) for p in grp); t=a; seg_=[]
            for p in grp: d=(b-a)*len(p)/tot; seg_.append((t,t+d,p)); t+=d
            out.extend(seg_[::-1])
        else: out.append((a,b,' '.join(grp)))
        i,j=pi,pj
    return out[::-1]
caps=[]
for f,st in place:
    for a,b,text in dp_align(chunks(f),phr[f]): caps.append({'start':round(st+a,3),'end':round(st+b,3),'text':text,'voice':('harjo' if f.startswith('h') else 'whisper' if f.startswith('w') else 'narr')})
caps.sort(key=lambda c:c['start'])
for i,c in enumerate(caps):
    if c['end']-c['start']<0.7:
        c['end']=round(c['start']+0.7,3)
        if i+1<len(caps) and caps[i+1]['start']<c['end']: caps[i+1]['start']=c['end']
for a,b in zip(caps,caps[1:]): a['hold']=round(min(b['start'],a['end']+0.6),3)
caps[-1]['hold']=caps[-1]['end']+1.5
json.dump(caps,open('captions.json','w'),ensure_ascii=False,indent=0)
json.dump({'place':place,'end':END},open('layout.json','w'),indent=1)
args=['ffmpeg','-y','-loglevel','error']
for f,_ in place: args+=['-i',f]
fc=''.join(f'[{i}]adelay={int(s*1000)}|{int(s*1000)}[a{i}];' for i,(f,s) in enumerate(place))+''.join(f'[a{i}]' for i in range(len(place)))+f'amix=inputs={len(place)}:normalize=0,apad,atrim=0:{END}[o]'
subprocess.run(args+['-filter_complex',fc,'-map','[o]','-ar','48000','-ac','1','voices.wav'],check=True)
for c in caps: print(f"{c['start']:6.2f} {c['end']:6.2f} {c['voice'][0]} {c['text']}")
