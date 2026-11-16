export type ResultStatus = 'Selesai' | 'Cancel' | 'Rencana';

export type PlaceCategory =
  | 'Tempat Makan'
  | 'Potong Rambut & Perawatan'
  | 'Belanja & Hiburan'
  | 'Olahraga & Kesehatan'
  | 'Wisata & Perjalanan'
  | 'Kantor & Lainnya';

export type ViewMode = 'timeline' | 'sheet' | 'locations';

export interface ScheduleItem {
  id: string;
  /** ISO date string YYYY-MM-DD (resolved from merged/empty Waktu mulai cells) */
  dateIso: string;
  /** Original DD/MM/YYYY string */
  waktuMulaiDisplay: string;
  /** Indonesian day name: Sabtu, Minggu, Senin, etc. */
  hari: string;
  /** Duration in minutes */
  durasi: number;
  /** Normalized 24h HH:MM string */
  jamMulai: string;
  /** Normalized 24h HH:MM string */
  jamSelesai: string;
  lokasi: string;
  /** Place category (Tempat Makan, Potong Rambut & Perawatan, etc.) */
  kategori: PlaceCategory;
  /** Verified Google Maps address if selected via Places Autocomplete */
  alamat?: string;
  /** Google Place ID if selected via Places Autocomplete */
  placeId?: string;
  /** Optional coordinates from Place selection for map preview */
  lat?: number;
  lng?: number;
  /** Google Maps price tier (Gratis, Terjangkau ($), Menengah ($$), Mahal ($$$)) */
  mapsPriceLevel?: string;
  /** Google Maps average spending range per person (e.g. Rp 25.000 – Rp 50.000 / orang) */
  mapsPriceRangeLabel?: string;
  /** Numeric midpoint from Google Maps priceRange when provided */
  mapsPriceAvg?: number;
  mapsPriceCurrency?: string;
  /** User-entered actual expense in IDR */
  pengeluaranReal?: number;
  pemilik: string;
  catatan: string;
  result: ResultStatus;
  plan: string;
  /** Original row order index for stable sorting / sheet export */
  rowOrder: number;
}

export interface DayGroup {
  dateIso: string;
  dateLabel: string;
  shortDateLabel: string;
  hari: string;
  planTitle: string | null;
  items: ScheduleItem[];
  totalMinutes: number;
  totalRealSpend: number;
  completedCount: number;
  plannedCount: number;
  cancelledCount: number;
}

export interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  days: DayGroup[];
  totalActivities: number;
  totalMinutes: number;
  totalRealSpend: number;
}

export interface LocationStat {
  lokasi: string;
  kategori: PlaceCategory;
  visitCount: number;
  totalMinutes: number;
  completedCount: number;
  plannedCount: number;
  cancelledCount: number;
  lastDateIso: string;
  owners: string[];
  mapsPriceRangeLabel?: string;
  mapsPriceLevel?: string;
  mapsPriceAvg?: number;
  realSpendCount: number;
  totalRealSpend: number;
  avgRealSpend: number | null;
}

export interface OwnerStat {
  pemilik: string;
  activityCount: number;
  totalMinutes: number;
  totalRealSpend: number;
  completedCount: number;
  plannedCount: number;
  cancelledCount: number;
}
