import json,re
chunks=json.load(open('audio/chunks.json'))
lines=["Jam sebelas lewat empat puluh tujuh malam,","dan Rudi tinggal sendirian di lantai lima.","Dia masuk lift dan menekan G.","Tombol empat ditutup lakban,","ada tulisan \"belum jadi\" di atasnya.","Lift tetap berhenti di lantai empat.","Pintunya terbuka ke lantai beton kasar,","dengan kabel menggantung dari langit-langit.","Tirai plastik di ujung sana bergoyang pelan,","padahal tidak ada angin.","Rudi melangkah keluar, dan pintu lift menutup di belakangnya.","Dia cari tangga darurat","dan turun satu lantai.","Angka di pintu bawah:","empat.","Turun lagi.","Empat.","Turun lagi,","masih empat.","Tirai plastik tadi sekarang cuma beberapa langkah darinya.","Di balik plastik itu ada kepala bulat putih,","sama persis dengan kepalanya sendiri.","Rudi lari ke ujung lorong,","ke satu-satunya lampu yang masih menyala.","Di situ tergantung papan jadwal tukang:","\"Besok,","jam tujuh pagi.","Tutup dinding lantai empat.\"","Dinding batanya baru setengah jadi,","dan di tengahnya ada cekungan berbentuk badan orang,","pas seukuran Rudi.","Semennya masih basah,","dan ada bekas sarung tangan putih di permukaannya.","Ditekan dari dalam.","Paginya,","satpam berdiri di trotoar dan menghitung baris jendela gedung itu.","Cuma ada empat.","Gedung ini tidak pernah punya lantai lima.","Tapi di jendela paling atas,","lampu meja Rudi masih menyala."]
assert len(lines)==len(chunks),(len(lines),len(chunks))
script=open('audio/narration-text.txt').read().split()
words=[]
for (a,b),ln in zip(chunks,lines):
    ws=ln.split(); w8=[len(re.sub(r'\W','',w))+1 for w in ws]; tot=sum(w8); t=a
    for w,k in zip(ws,w8):
        d=(b-a)*k/tot; words.append({"word":w,"start":round(t,3),"end":round(t+d,3)}); t+=d
assert [w['word'] for w in words]==script, "script mismatch"
json.dump({"words":words,"method":"silence-segmented chunks (ffmpeg silencedetect -40dB/0.3s), chunk text verified by Gemini transcription; within-chunk word times proportional to letters"},open('audio/words.json','w'),ensure_ascii=False,indent=0)
print(len(words),'words ok')
