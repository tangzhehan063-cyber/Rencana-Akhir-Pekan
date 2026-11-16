import { ChangeEvent, useMemo, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { ScheduleItem } from '../types/schedule';
import { parseScheduleCsv } from '../utils/csv';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (items: ScheduleItem[], mode: 'replace' | 'append') => void;
}

export function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [errorMsg, setErrorMsg] = useState('');

  const parsedPreview = useMemo(() => {
    if (!rawText.trim()) return [];
    try {
      return parseScheduleCsv(rawText);
    } catch {
      return [];
    }
  }, [rawText]);

  if (!open) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setRawText(content);
    };
    reader.onerror = () => {
      setErrorMsg('Gagal membaca file. Pastikan file berupa teks CSV atau TSV.');
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    if (parsedPreview.length === 0) {
      setErrorMsg('Tidak ditemukan baris jadwal yang valid.');
      return;
    }
    onImport(parsedPreview, mode);
    setRawText('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="import-modal-title" className="text-base font-semibold text-slate-900">
            Impor dari Google Sheets / CSV
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Unggah file <span className="font-mono">.csv</span> hasil ekspor Google Sheets atau
            salin-tempel langsung sel dari Google Sheets (mendukung kolom{' '}
            <span className="font-medium text-slate-800">
              Waktu mulai, Hari, Durasi, Jam mulai, Jam selesai, Lokasi, Pemilik, Catatan, Result, Plan
            </span>
            ).
          </p>

          <div>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Pilih File CSV / TSV</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>

          <div>
            <label htmlFor="csv-paste-area" className="block text-xs font-medium text-slate-700 mb-1.5">
              Atau tempel teks CSV / Google Sheets di sini
            </label>
            <textarea
              id="csv-paste-area"
              rows={7}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setErrorMsg('');
              }}
              placeholder="Waktu mulai,Hari,Durasi,Jam mulai,Jam selesai,Lokasi,Pemilik,Catatan,Result,Plan&#10;14/11/2026,Sabtu,60,09:00:00,10:00:00,Paragon Mall,,Sarapan,,"
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          {rawText.trim() && (
            <div className="text-xs text-slate-700 tabular-nums">
              Terdeteksi <span className="font-semibold text-slate-900">{parsedPreview.length}</span>{' '}
              baris kegiatan siap diimpor.
            </div>
          )}

          {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}

          <div className="flex items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="import-mode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="text-blue-600 focus:ring-blue-600"
              />
              <span>Ganti seluruh jadwal saat ini</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="import-mode"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
                className="text-blue-600 focus:ring-blue-600"
              />
              <span>Tambahkan ke jadwal yang ada</span>
            </label>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={parsedPreview.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Impor {parsedPreview.length > 0 ? `(${parsedPreview.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
