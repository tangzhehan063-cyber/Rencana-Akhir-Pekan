import subprocess, json, base64, os, urllib.request, re, sys
L=json.load(open('layout.json'))
phr={
'c1t.wav':["Sejak malam itu, Rudi tidak pernah pulang.","Tapi setiap pagi,","tepat jam tujuh,","mesin absen di lobi berbunyi:"],
'c2t.wav':["Pak Darto, satpam gedung itu,","sudah tiga kali memeriksa.","Tidak pernah ada siapa pun di depan mesin.","Pagi keempat,","dia menunggu di lobi sambil memegang senter.","Jam tujuh kurang satu menit,","lift di belakangnya berdenting.","Pintunya terbuka.","Kosong.","Lalu mesin absen menyala sendiri."],
'c3t.wav':["Di layar CCTV,","lift itu naik lagi dan berhenti di lantai empat.","Pak Darto menyusul lewat tangga darurat.","Pintu lantai empat sudah terbuka sedikit,","seperti sedang menunggunya.","Lampu kerja masih menyala di ujung lorong.","Dinding bata yang kemarin setengah jadi,","sekarang sudah tertutup rapat.","Semennya sudah kering.","Di depannya,","papan jadwal tukang punya tulisan baru:","\"Besok, jam tujuh pagi.","Tutup dinding.","Satpam.\"","Dari balik dinding terdengar ketukan pelan.","Tiga kali.","Pak Darto mundur.","Ponselnya bergetar.","Notifikasi dari mesin absen di lobi:"],
'c4t.wav':["Padahal dia masih berdiri di lantai empat."],
'm1fx.wav':["Terima kasih, Rudi."],'m3phone.wav':["Absen pulang berhasil.","Terima kasih, Darto."]}
def chunks(f,d=0.22):
    out=subprocess.run(['ffmpeg','-hide_banner','-i',f,'-af',f'silencedetect=n=-38dB:d={d}','-f','null','-'],capture_output=True,text=True).stderr
    dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
    ev=re.findall(r'silence_(start|end): ([0-9.]+)',out); cs=[];cur=0.0
    for k,t in ev:
        t=float(t)
        if k=='start':
            if t-cur>0.08: cs.append([cur,t])
        else: cur=t
    if dur-cur>0.08: cs.append([cur,dur])
    return cs
caps=[]; report=[]
for f,st in L['place']:
    if f=='beep' or f in [c['f'] for c in report]: 
        if f!='beep' and f=='m1fx.wav': pass
        else: continue
    ps=phr[f]; raw=chunks(f,0.12)
    a0,b0=raw[0][0],raw[-1][1]; sil=[(raw[i][1]+raw[i+1][0])/2 for i in range(len(raw)-1)]
    tot=sum(len(p) for p in ps); acc=0; bounds=[a0]; pest=a0
    for p in ps[:-1]:
        acc+=len(p); est=a0+(b0-a0)*acc/tot
        near=min(sil,key=lambda x:abs(x-est)) if sil else est
        v=near if abs(near-est)<0.9 else est
        if v-bounds[-1] < 0.7*(est-pest): v=est
        bounds.append(v); pest=est
    bounds.append(b0); cs=[[bounds[i],bounds[i+1]] for i in range(len(ps))]
    report.append({'f':f})
    for (a,b),p in zip(cs,ps): caps.append({'start':round(st+a,3),'end':round(st+b,3),'text':p,'machine':f.startswith('m')})
caps.sort(key=lambda c:c['start'])
for i,c in enumerate(caps):
    if c['end']-c['start']<0.85:
        c['end']=round(c['start']+0.85,3)
        if i+1<len(caps) and caps[i+1]['start']<c['end']: caps[i+1]['start']=c['end']
for a,b in zip(caps,caps[1:]): a['hold']=min(b['start'],a['end']+0.6)
caps[-1]['hold']=caps[-1]['end']+1.5
json.dump(caps,open('captions.json','w'),ensure_ascii=False,indent=0)
print(report); [print(c['start'],c['end'],c['text']) for c in caps]
