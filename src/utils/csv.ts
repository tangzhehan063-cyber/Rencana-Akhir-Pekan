import { ResultStatus, ScheduleItem } from '../types/schedule';
import { normalizePlaceCategory } from './categories';

export const DEFAULT_TRAVEL_CSV = `Waktu mulai,Hari,Durasi,Jam mulai,Jam selesai,Lokasi,Pemilik,Catatan,Result,Plan
12/09/2026,Sabtu,60,7:00:00,08:00:00,PT. Donlim Technology Indonesia,,Lari 1 Jam,Cancel,
,Sabtu,60,09:00:00,10:00:00,Cut O'Clock Barbershop Semarang,Dev Rey,potong rambut,Selesai,
,Sabtu,90,10:00:00,11:30:00,Calluna Beauty & Wellness,Gita Eudora Tadisa,pedicure,Selesai,
,Sabtu,90,11:30:00,13:00:00,WM Kelengan Sate Babi,,Makan,Selesai,
,Sabtu,300,13:00:00,18:00:00,Java Supermall,,Nonton conan,Selesai,
,Sabtu,45,18:00:00,18:45:00,KFC Java Mall,,makan malam,Selesai,
13/09/2026,Minggu,300,9:00:00,14:00:00,"Pemancingan Resto & Cafe ""TAMBAK SARI """,,Lomba Mancing,Selesai,
,Minggu,300,14:00:00,19:00:00,PT. Donlim Technology Indonesia,,main stardew valley,Selesai,
19/09/2026,Sabtu,60,7:00:00,8:00:00,PT. Donlim Technology Indonesia,,Lari 1 Jam,Selesai,
,Sabtu,120,12:00:00,14:00:00,23 Semarang XXI,,MAKAN DEVITO,Selesai,
,Sabtu,120,14:00:00,16:00:00,ZAP Clinic DP Mall Semarang,Gita Eudora Tadisa,Perawatan,Selesai,
20/09/2026,Minggu,1260,0:00:00,21:00:00,Dieng,,,Selesai,TRIP TO DIENG
27/09/2026,Sabtu,120,6:30:00,8:30:00,Gelanggang Olah Raga Tri Lomba Juang,,,Selesai,
,Sabtu,120,17:00:00,19:00:00,Ayam Bakar Artomoro Demak,,,Selesai,
28/10/2026,Minggu,120,17:00:00,19:00:00,RM. Sambel Sawah Demak,,,Selesai,
03/10/2026,Sabtu,60,7:00:00,8:00:00,PT. Donlim Technology Indonesia,,,,
31/10/2026,Sabtu,30,14:30:00,15:00:00,Paragon Mall,,OTW DR DONLIM NAIK BUS,,
,Sabtu,15,15:00:00,15:15:00,DP Mall Semarang,,JALAN KAKI KE DP,,
,Sabtu,90,15:15:00,16:45:00,ZAP Clinic DP Mall Semarang,,FACIAL,,
07/11/2026,Sabtu,60,14:30:00,15:30:00,Paragon Mall,,OTW DR DONLIM NAIK BUS,,
,Sabtu,120,15:30:00,17:30:00,,,GATAU NGAPAIN,,
,Sabtu,180,17:30:00,20:30:00,STI Vihara Tanah Putih,,GITA KEGIATAN,,
,Sabtu,30,20:30:00,21:00:00,Paragon Mall,,PULANG,,
,Sabtu,30,21:00:00,21:30:00,Paragon Mall,,OTW BALIK KE DONLIM,,`;

const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export function parseDelimitedRows(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  const firstLineEnd = cleanText.search(/\r?\n/);
  const firstLine = firstLineEnd === -1 ? cleanText : cleanText.slice(0, firstLineEnd);
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

export function dmyToIso(dmy: string): string | null {
  const trimmed = dmy.trim();
  if (!trimmed) return null;

  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return trimmed;
  }

  return null;
}

export function isoToDmy(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function getIndonesianDayFromIso(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return INDONESIAN_DAYS[date.getDay()] ?? '';
}

export function normalizeTimeToHHMM(rawTime: string): string {
  const trimmed = rawTime.trim();
  if (!trimmed) return '00:00';
  const parts = trimmed.split(':');
  const hours = Math.min(23, Math.max(0, parseInt(parts[0] || '0', 10) || 0));
  const mins = Math.min(59, Math.max(0, parseInt(parts[1] || '0', 10) || 0));
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function computeDurationMinutes(startHHMM: string, endHHMM: string): number {
  const start = timeToMinutes(startHHMM);
  const end = timeToMinutes(endHHMM);
  if (end >= start) return end - start;
  return 24 * 60 - start + end;
}

export function normalizeResultStatus(raw: string): ResultStatus {
  const v = raw.trim().toLowerCase();
  if (v === 'selesai' || v === 'done' || v === 'completed') return 'Selesai';
  if (v === 'cancel' || v === 'batal' || v === 'cancelled') return 'Cancel';
  return 'Rencana';
}

function parseNumericCell(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  const val = parseInt(digits, 10);
  return Number.isFinite(val) ? val : undefined;
}

export function parseScheduleCsv(csvText: string): ScheduleItem[] {
  const rows = parseDelimitedRows(csvText);
  if (rows.length === 0) return [];

  const firstRowJoined = rows[0].join(' ').toLowerCase();
  const hasHeader =
    firstRowJoined.includes('waktu mulai') ||
    firstRowJoined.includes('jam mulai') ||
    firstRowJoined.includes('lokasi');

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const items: ScheduleItem[] = [];
  let lastDateIso = '';

  dataRows.forEach((cols, index) => {
    if (cols.every((c) => !c)) return;

    const rawDate = cols[0] || '';
    const parsedIso = dmyToIso(rawDate);
    if (parsedIso) {
      lastDateIso = parsedIso;
    }
    const dateIso = parsedIso || lastDateIso || '2026-09-12';
    const hari = cols[1]?.trim() || getIndonesianDayFromIso(dateIso);
    const jamMulai = normalizeTimeToHHMM(cols[3] || '08:00');
    const jamSelesai = normalizeTimeToHHMM(cols[4] || '09:00');
    const parsedDurasi = parseInt(cols[2] || '', 10);
    const durasi =
      Number.isFinite(parsedDurasi) && parsedDurasi >= 0
        ? parsedDurasi
        : computeDurationMinutes(jamMulai, jamSelesai);

    const lokasi = (cols[5] || '').replace(/\s+/g, ' ').trim();
    const pemilik = (cols[6] || '').trim();
    const catatan = (cols[7] || '').trim();
    const result = normalizeResultStatus(cols[8] || '');
    const plan = (cols[9] || '').trim();
    const kategori = normalizePlaceCategory(cols[10], lokasi, catatan, plan);
    const mapsEstimateCol = (cols[11] || '').trim();
    const pengeluaranReal = parseNumericCell(cols[12]);

    items.push({
      id: `item-${index + 1}-${dateIso}-${jamMulai.replace(':', '')}`,
      dateIso,
      waktuMulaiDisplay: isoToDmy(dateIso),
      hari,
      durasi,
      jamMulai,
      jamSelesai,
      lokasi,
      kategori,
      mapsPriceRangeLabel: mapsEstimateCol || undefined,
      pengeluaranReal,
      pemilik,
      catatan,
      result,
      plan,
      rowOrder: index,
    });
  });

  return items;
}

function escapeCsvCell(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function serializeSchedule(
  items: ScheduleItem[],
  options: { delimiter?: ',' | '\t'; sparseDates?: boolean } = {}
): string {
  const delimiter = options.delimiter ?? ',';
  const sparseDates = options.sparseDates ?? true;

  const sorted = [...items].sort((a, b) => {
    if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
    const diff = timeToMinutes(a.jamMulai) - timeToMinutes(b.jamMulai);
    return diff !== 0 ? diff : a.rowOrder - b.rowOrder;
  });

  const headers = [
    'Waktu mulai',
    'Hari',
    'Durasi',
    'Jam mulai',
    'Jam selesai',
    'Lokasi',
    'Pemilik',
    'Catatan',
    'Result',
    'Plan',
    'Kategori',
    'Estimasi Google Maps',
    'Pengeluaran Real',
  ];

  let prevDateIso = '';
  const lines = [headers.join(delimiter)];

  for (const item of sorted) {
    const showDate = !sparseDates || item.dateIso !== prevDateIso;
    prevDateIso = item.dateIso;

    const mapsEstimate =
      item.mapsPriceRangeLabel || item.mapsPriceLevel || '';

    const row = [
      showDate ? isoToDmy(item.dateIso) : '',
      item.hari,
      String(item.durasi),
      `${item.jamMulai}:00`,
      `${item.jamSelesai}:00`,
      item.lokasi,
      item.pemilik,
      item.catatan,
      item.result === 'Rencana' ? '' : item.result,
      item.plan,
      item.kategori,
      mapsEstimate,
      item.pengeluaranReal !== undefined ? String(item.pengeluaranReal) : '',
    ];

    if (delimiter === ',') {
      lines.push(row.map(escapeCsvCell).join(','));
    } else {
      lines.push(row.map((cell) => cell.replace(/\t/g, ' ')).join('\t'));
    }
  }

  return lines.join('\n');
}
