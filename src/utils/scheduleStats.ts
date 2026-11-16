import { DayGroup, LocationStat, MonthGroup, OwnerStat, PlaceCategory, ScheduleItem } from '../types/schedule';
import { inferCategoryFromText } from './categories';
import { timeToMinutes } from './csv';

const MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const MONTHS_FULL_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatIsoDateFull(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  return `${day} ${MONTHS_FULL_ID[monthIdx] ?? match[2]} ${year}`;
}

export function formatIsoDateShort(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  return `${day} ${MONTHS_ID[monthIdx] ?? match[2]} ${year}`;
}

export function formatMonthLabel(monthKey: string): string {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;
  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  return `${MONTHS_FULL_ID[monthIdx] ?? match[2]} ${year}`;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 mnt';
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours} jam`;
  return `${hours}j ${rem}m`;
}

export function groupItemsByDate(
  items: ScheduleItem[],
  order: 'desc' | 'asc' = 'desc'
): DayGroup[] {
  const map = new Map<string, ScheduleItem[]>();

  for (const item of items) {
    const list = map.get(item.dateIso) ?? [];
    list.push(item);
    map.set(item.dateIso, list);
  }

  const sortedDates = Array.from(map.keys()).sort((a, b) =>
    order === 'desc' ? b.localeCompare(a) : a.localeCompare(b)
  );

  return sortedDates.map((dateIso) => {
    const dayItems = (map.get(dateIso) ?? []).sort((a, b) => {
      const diff = timeToMinutes(a.jamMulai) - timeToMinutes(b.jamMulai);
      return diff !== 0 ? diff : a.rowOrder - b.rowOrder;
    });

    const planTitle = dayItems.find((i) => i.plan.trim().length > 0)?.plan ?? null;
    const hari = dayItems[0]?.hari || '';
    const totalMinutes = dayItems
      .filter((i) => i.result !== 'Cancel')
      .reduce((acc, i) => acc + i.durasi, 0);
    const totalRealSpend = dayItems
      .filter((i) => i.result !== 'Cancel' && typeof i.pengeluaranReal === 'number')
      .reduce((acc, i) => acc + (i.pengeluaranReal || 0), 0);

    return {
      dateIso,
      dateLabel: `${hari}, ${formatIsoDateFull(dateIso)}`,
      shortDateLabel: formatIsoDateShort(dateIso),
      hari,
      planTitle,
      items: dayItems,
      totalMinutes,
      totalRealSpend,
      completedCount: dayItems.filter((i) => i.result === 'Selesai').length,
      plannedCount: dayItems.filter((i) => i.result === 'Rencana').length,
      cancelledCount: dayItems.filter((i) => i.result === 'Cancel').length,
    };
  });
}

export function groupDaysByMonth(
  dayGroups: DayGroup[],
  order: 'desc' | 'asc' = 'desc'
): MonthGroup[] {
  const map = new Map<string, DayGroup[]>();

  for (const day of dayGroups) {
    const monthKey = day.dateIso.slice(0, 7);
    const list = map.get(monthKey) ?? [];
    list.push(day);
    map.set(monthKey, list);
  }

  const sortedMonthKeys = Array.from(map.keys()).sort((a, b) =>
    order === 'desc' ? b.localeCompare(a) : a.localeCompare(b)
  );

  return sortedMonthKeys.map((monthKey) => {
    const days = (map.get(monthKey) ?? []).sort((a, b) =>
      order === 'desc'
        ? b.dateIso.localeCompare(a.dateIso)
        : a.dateIso.localeCompare(b.dateIso)
    );

    return {
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      days,
      totalActivities: days.reduce((sum, d) => sum + d.items.length, 0),
      totalMinutes: days.reduce((sum, d) => sum + d.totalMinutes, 0),
      totalRealSpend: days.reduce((sum, d) => sum + d.totalRealSpend, 0),
    };
  });
}

export function computeLocationStats(items: ScheduleItem[]): LocationStat[] {
  const map = new Map<
    string,
    {
      kategori: PlaceCategory;
      visitCount: number;
      totalMinutes: number;
      completedCount: number;
      plannedCount: number;
      cancelledCount: number;
      lastDateIso: string;
      owners: Set<string>;
      mapsPriceRangeLabel?: string;
      mapsPriceLevel?: string;
      mapsPriceAvg?: number;
      realSpendCount: number;
      totalRealSpend: number;
    }
  >();

  for (const item of items) {
    const key = item.lokasi.trim() || '(Lokasi belum ditentukan)';
    const itemCat =
      item.kategori || inferCategoryFromText(item.lokasi, item.catatan, item.plan);
    const entry = map.get(key) ?? {
      kategori: itemCat,
      visitCount: 0,
      totalMinutes: 0,
      completedCount: 0,
      plannedCount: 0,
      cancelledCount: 0,
      lastDateIso: item.dateIso,
      owners: new Set<string>(),
      mapsPriceRangeLabel: undefined,
      mapsPriceLevel: undefined,
      mapsPriceAvg: undefined,
      realSpendCount: 0,
      totalRealSpend: 0,
    };

    entry.visitCount += 1;
    if (item.result !== 'Cancel') {
      entry.totalMinutes += item.durasi;
    }
    if (item.result === 'Selesai') entry.completedCount += 1;
    else if (item.result === 'Cancel') entry.cancelledCount += 1;
    else entry.plannedCount += 1;

    if (item.dateIso > entry.lastDateIso) {
      entry.lastDateIso = item.dateIso;
    }
    entry.owners.add(item.pemilik.trim() || 'Bersama');

    if (item.mapsPriceRangeLabel && !entry.mapsPriceRangeLabel) {
      entry.mapsPriceRangeLabel = item.mapsPriceRangeLabel;
    }
    if (item.mapsPriceLevel && !entry.mapsPriceLevel) {
      entry.mapsPriceLevel = item.mapsPriceLevel;
    }
    if (typeof item.mapsPriceAvg === 'number' && entry.mapsPriceAvg === undefined) {
      entry.mapsPriceAvg = item.mapsPriceAvg;
    }

    if (typeof item.pengeluaranReal === 'number' && item.result !== 'Cancel') {
      entry.realSpendCount += 1;
      entry.totalRealSpend += item.pengeluaranReal;
    }

    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([lokasi, stats]) => ({
      lokasi,
      kategori: stats.kategori,
      visitCount: stats.visitCount,
      totalMinutes: stats.totalMinutes,
      completedCount: stats.completedCount,
      plannedCount: stats.plannedCount,
      cancelledCount: stats.cancelledCount,
      lastDateIso: stats.lastDateIso,
      owners: Array.from(stats.owners),
      mapsPriceRangeLabel: stats.mapsPriceRangeLabel,
      mapsPriceLevel: stats.mapsPriceLevel,
      mapsPriceAvg: stats.mapsPriceAvg,
      realSpendCount: stats.realSpendCount,
      totalRealSpend: stats.totalRealSpend,
      avgRealSpend:
        stats.realSpendCount > 0
          ? Math.round(stats.totalRealSpend / stats.realSpendCount)
          : null,
    }))
    .sort((a, b) => b.visitCount - a.visitCount || b.totalMinutes - a.totalMinutes);
}

export function computeOwnerStats(items: ScheduleItem[]): OwnerStat[] {
  const map = new Map<
    string,
    {
      activityCount: number;
      totalMinutes: number;
      totalRealSpend: number;
      completedCount: number;
      plannedCount: number;
      cancelledCount: number;
    }
  >();

  for (const item of items) {
    const key = item.pemilik.trim() || 'Bersama / Umum';
    const entry = map.get(key) ?? {
      activityCount: 0,
      totalMinutes: 0,
      totalRealSpend: 0,
      completedCount: 0,
      plannedCount: 0,
      cancelledCount: 0,
    };

    entry.activityCount += 1;
    if (item.result !== 'Cancel') {
      entry.totalMinutes += item.durasi;
      if (typeof item.pengeluaranReal === 'number') {
        entry.totalRealSpend += item.pengeluaranReal;
      }
    }
    if (item.result === 'Selesai') entry.completedCount += 1;
    else if (item.result === 'Cancel') entry.cancelledCount += 1;
    else entry.plannedCount += 1;

    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([pemilik, stats]) => ({
      pemilik,
      ...stats,
    }))
    .sort((a, b) => b.activityCount - a.activityCount);
}
