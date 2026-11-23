# Builds voices.wav from trimmed clips + phrase captions (phrase bounds snapped to detected pauses). Run from audio/.
import subprocess, json, re
place=[('m0fx.wav',0.35),('c1t.wav',4.10),('m1fx.wav',30.85),('c2t.wav',33.65),('m2fx.wav',45.85),('c3t.wav',47.85),('m3fx.wav',78.0)]
END=83.5
phr={
'm0fx.wav':["Ada barang tidak dikenal di area kemasan."],
'c1t.wav':["Jam tiga pagi.","Minimarket itu kosong.","Hanya ada Bayu,","penjaga malam,","dan satu mesin kasir mandiri","yang baru dipasang minggu lalu.","Sejak dipasang,","setiap jam tiga,","mesin itu bicara sendiri.","Bayu memeriksa area kemasan.","Kosong.","Tapi timbangannya menunjukkan","dua belas kilo.","Dia menekan tombol batal.","Angkanya malah naik.","Tiga puluh.","Lima puluh."],
'm1fx.wav':["Silakan lanjutkan belanja Anda."],
'c2t.wav':["Bayu melirik monitor CCTV","di meja kasir.","Di layar,","ada antrean di depan mesin itu.","Empat orang.","Dia menoleh.","Di depan mesin,","tidak ada siapa-siapa."],
'm2fx.wav':["Pelanggan berikutnya."],
'c3t.wav':["Di CCTV,","orang pertama melangkah ke mesin,","lalu hilang.","Lalu orang kedua.","Lalu orang ketiga.","Tinggal satu.","Dia memakai seragam","yang sama dengan Bayu.","Bayu mundur menjauh dari mesin.","Tapi waktu dia menunduk,","kakinya sudah berdiri di atas timbangan.","Layar menunjukkan","enam puluh delapan kilo.","Persis berat badannya.","Struk keluar pelan-pelan.","Satu barang.","Penjaga malam.","Lunas."],
'm3fx.wav':["Terima kasih.","Jangan lupa barang Anda."]}
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
    for a,b,text in dp_align(chunks(f),phr[f]): caps.append({'start':round(st+a,3),'end':round(st+b,3),'text':text,'machine':f.startswith('m')})
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
for c in caps: print(f"{c['start']:6.2f} {c['end']:6.2f} {'M' if c['machine'] else ' '} {c['text']}")
