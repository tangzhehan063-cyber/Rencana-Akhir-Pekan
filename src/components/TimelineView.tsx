import { useState } from 'react';
import { CalendarPlus, Check, MapPin, Pencil, Search, Trash2, X } from 'lucide-react';
import {
  DayGroup,
  MonthGroup,
  PlaceCategory,
  ResultStatus,
  ScheduleItem,
} from '../types/schedule';
import { PLACE_CATEGORIES } from '../utils/categories';
import { formatIdr } from '../utils/currency';
import { formatDuration } from '../utils/scheduleStats';
import { timeToMinutes } from '../utils/csv';
import { StatusControl } from './StatusControl';

interface TimelineViewProps {
  monthGroups: MonthGroup[];
  availableMonths: { monthKey: string; monthLabel: string }[];
  availableDates: DayGroup[];
  allItemsCount: number;
  selectedMonth: string | null;
  onSelectMonth: (monthKey: string | null) => void;
  selectedDateIso: string | null;
  onSelectDate: (dateIso: string | null) => void;
  statusFilter: 'Semua' | ResultStatus;
  onStatusFilterChange: (status: 'Semua' | ResultStatus) => void;
  ownerFilter: string;
  onOwnerFilterChange: (owner: string) => void;
  ownerOptions: string[];
  categoryFilter: 'Semua' | PlaceCategory;
  onCategoryFilterChange: (cat: 'Semua' | PlaceCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCycleStatus: (id: string) => void;
  onUpdateRealSpend: (id: string, amount: number | undefined) => void;
  onEditItem: (item: ScheduleItem) => void;
  onDeleteItem: (id: string) => void;
  onAddOnDate: (dateIso: string) => void;
  onAddActivity: () => void;
}

export function TimelineView({
  monthGroups,
  availableMonths,
  availableDates,
  allItemsCount,
  selectedMonth,
  onSelectMonth,
  selectedDateIso,
  onSelectDate,
  statusFilter,
  onStatusFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  ownerOptions,
  categoryFilter,
  onCategoryFilterChange,
  searchQuery,
  onSearchChange,
  onCycleStatus,
  onUpdateRealSpend,
  onEditItem,
  onDeleteItem,
  onAddOnDate,
  onAddActivity,
}: TimelineViewProps) {
  const [editingSpendId, setEditingSpendId] = useState<string | null>(null);
  const [spendDraft, setSpendDraft] = useState('');

  const allVisibleDays = monthGroups.flatMap((m) => m.days);
  const flatFiltered = allVisibleDays.flatMap((g) => g.items);
  const completedTotal = flatFiltered.filter((i) => i.result === 'Selesai').length;
  const activeMinutesTotal = flatFiltered
    .filter((i) => i.result !== 'Cancel')
    .reduce((sum, i) => sum + i.durasi, 0);

  const realSpendItems = flatFiltered.filter(
    (i) => i.result !== 'Cancel' && typeof i.pengeluaranReal === 'number'
  );
  const totalRealSpend = realSpendItems.reduce(
    (sum, i) => sum + (i.pengeluaranReal || 0),
    0
  );

  const hasActiveFilters =
    statusFilter !== 'Semua' ||
    ownerFilter !== 'Semua' ||
    categoryFilter !== 'Semua' ||
    searchQuery.trim().length > 0 ||
    selectedMonth !== null ||
    selectedDateIso !== null;

  const startInlineSpend = (item: ScheduleItem) => {
    setEditingSpendId(item.id);
    setSpendDraft(
      item.pengeluaranReal !== undefined ? String(item.pengeluaranReal) : ''
    );
  };

  const commitInlineSpend = (id: string) => {
    const digits = spendDraft.replace(/[^\d]/g, '');
    const parsed = digits ? parseInt(digits, 10) : undefined;
    onUpdateRealSpend(id, parsed);
    setEditingSpendId(null);
  };

  const handleResetAllFilters = () => {
    onStatusFilterChange('Semua');
    onOwnerFilterChange('Semua');
    onCategoryFilterChange('Semua');
    onSearchChange('');
    onSelectMonth(null);
    onSelectDate(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Quantitative Summary Strip */}
      <section
        aria-label="Ringkasan jadwal"
        className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
      >
        <div className="p-4 sm:px-5">
          <div className="text-xs font-medium text-slate-500">Total Kegiatan</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {flatFiltered.length}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
            {completedTotal} selesai · {allVisibleDays.length} hari
          </div>
        </div>

        <div className="p-4 sm:px-5">
          <div className="text-xs font-medium text-slate-500">Total Durasi Aktif</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {formatDuration(activeMinutesTotal)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Tidak termasuk cancel</div>
        </div>

        <div className="p-4 sm:px-5">
          <div className="text-xs font-medium text-slate-500">Total Pengeluaran Real</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {formatIdr(totalRealSpend)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
            {realSpendItems.length} kegiatan tercatat biayanya
          </div>
        </div>

        <div className="p-4 sm:px-5">
          <div className="text-xs font-medium text-slate-500">Rata-rata / Kegiatan</div>
          <div className="mt-1 text-2xl font-semibold text-blue-700 font-mono tabular-nums">
            {realSpendItems.length > 0
              ? formatIdr(Math.round(totalRealSpend / realSpendItems.length))
              : 'Rp 0'}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Dari pengeluaran real terisi</div>
        </div>
      </section>

      {/* Interactive Filter Toolbar */}
      <section className="space-y-3">
        <div className="relative md:hidden">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari lokasi, catatan, pemilik..."
            aria-label="Cari aktivitas"
            className="w-full h-10 pl-9 pr-8 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Segmented Tabs */}
            <div
              role="tablist"
              aria-label="Filter status kegiatan"
              className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg"
            >
              {(['Semua', 'Rencana', 'Selesai', 'Cancel'] as const).map((status) => {
                const active = statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onStatusFilterChange(status)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="month-filter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Bulan:
              </label>
              <select
                id="month-filter"
                value={selectedMonth ?? 'Semua'}
                onChange={(e) => {
                  const val = e.target.value === 'Semua' ? null : e.target.value;
                  onSelectMonth(val);
                  if (val && selectedDateIso && !selectedDateIso.startsWith(val)) {
                    onSelectDate(null);
                  }
                }}
                className="h-8 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="Semua">Semua Bulan</option>
                {availableMonths.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    {m.monthLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="date-filter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Tanggal:
              </label>
              <select
                id="date-filter"
                value={selectedDateIso ?? 'Semua'}
                onChange={(e) => {
                  const val = e.target.value === 'Semua' ? null : e.target.value;
                  onSelectDate(val);
                  if (val) {
                    onSelectMonth(val.slice(0, 7));
                  }
                }}
                className="h-8 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="Semua">Semua Tanggal</option>
                {availableDates.map((d) => (
                  <option key={d.dateIso} value={d.dateIso}>
                    {d.shortDateLabel} ({d.hari})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="category-filter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Kategori:
              </label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) =>
                  onCategoryFilterChange(e.target.value as 'Semua' | PlaceCategory)
                }
                className="h-8 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="Semua">Semua Kategori</option>
                {PLACE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Owner Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="owner-filter" className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Pemilik:
              </label>
              <select
                id="owner-filter"
                value={ownerFilter}
                onChange={(e) => onOwnerFilterChange(e.target.value)}
                className="h-8 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="Semua">Semua Pemilik</option>
                {ownerOptions.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap self-start xl:self-auto"
            >
              Reset filter
            </button>
          )}
        </div>
      </section>

      {/* Empty State */}
      {monthGroups.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">
            {allItemsCount === 0
              ? 'Belum ada jadwal tersimpan'
              : 'Tidak ada kegiatan yang cocok dengan filter'}
          </h3>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            {allItemsCount === 0
              ? 'Tambahkan kegiatan pertama Anda atau impor file CSV dari Google Sheets.'
              : 'Coba ubah filter bulan, tanggal, kategori, atau kata kunci pencarian.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {allItemsCount > 0 ? (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Tampilkan Semua Kegiatan
              </button>
            ) : (
              <button
                type="button"
                onClick={onAddActivity}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Tambah Kegiatan Pertama
              </button>
            )}
          </div>
        </div>
      )}

      {/* Month Groups (Newest Month -> Oldest Month) */}
      <div className="space-y-10">
        {monthGroups.map((month) => (
          <section
            key={month.monthKey}
            aria-labelledby={`month-${month.monthKey}`}
            className="space-y-5"
          >
            {/* Month Group Header */}
            <div className="pb-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <h2
                id={`month-${month.monthKey}`}
                className="text-xl font-bold text-slate-900 tracking-tight"
              >
                {month.monthLabel}
              </h2>
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 tabular-nums">
                <span>{month.days.length} hari</span>
                <span aria-hidden="true">·</span>
                <span>{month.totalActivities} kegiatan</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{formatDuration(month.totalMinutes)}</span>
                {month.totalRealSpend > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatIdr(month.totalRealSpend)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Day Groups inside Month (Newest Date -> Oldest Date) */}
            <div className="space-y-6">
              {month.days.map((group) => (
                <div key={group.dateIso} aria-labelledby={`day-${group.dateIso}`}>
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-2.5 px-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3
                        id={`day-${group.dateIso}`}
                        className="text-base font-semibold text-slate-900 tracking-tight"
                      >
                        {group.dateLabel}
                      </h3>
                      {group.planTitle && (
                        <span className="text-xs font-semibold tracking-wide text-blue-700">
                          {group.planTitle}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 tabular-nums">
                      <span>{group.items.length} kegiatan</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{formatDuration(group.totalMinutes)}</span>
                      {group.totalRealSpend > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {formatIdr(group.totalRealSpend)}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => onAddOnDate(group.dateIso)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                    {group.items.map((item, idx) => {
                      const prevItem = idx > 0 ? group.items[idx - 1] : null;
                      const gapMinutes = prevItem
                        ? timeToMinutes(item.jamMulai) - timeToMinutes(prevItem.jamSelesai)
                        : 0;

                      const primaryTitle =
                        item.catatan || item.plan || item.lokasi || 'Kegiatan tanpa judul';
                      const isCancelled = item.result === 'Cancel';
                      const mapsEstimate = item.mapsPriceRangeLabel || item.mapsPriceLevel;
                      const isEditingSpend = editingSpendId === item.id;

                      return (
                        <div key={item.id}>
                          {gapMinutes > 0 && (
                            <div className="px-4 sm:px-5 py-1.5 bg-slate-50/70 border-b border-slate-100 text-xs text-slate-400 font-mono tabular-nums">
                              Jeda {formatDuration(gapMinutes)} ({prevItem?.jamSelesai} – {item.jamMulai})
                            </div>
                          )}

                          <div
                            className={`px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6 transition-colors duration-150 hover:bg-slate-50/60 ${
                              isCancelled ? 'opacity-65' : ''
                            }`}
                          >
                            <div className="lg:w-32 shrink-0 flex lg:flex-col items-baseline lg:items-start justify-between gap-2">
                              <div className="font-mono tabular-nums text-sm font-semibold text-slate-900 whitespace-nowrap">
                                {item.jamMulai} – {item.jamSelesai}
                              </div>
                              <div className="font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                                {formatDuration(item.durasi)}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <h4
                                  className={`text-sm sm:text-base font-medium text-slate-900 ${
                                    isCancelled ? 'line-through text-slate-500' : ''
                                  }`}
                                >
                                  {primaryTitle}
                                </h4>
                                {item.plan && item.catatan && (
                                  <span className="text-xs font-medium text-blue-700">
                                    {item.plan}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                <span className="font-medium text-slate-700">
                                  {item.kategori}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 text-slate-600">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                                  <span>{item.lokasi || 'Lokasi belum ditentukan'}</span>
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{item.pemilik || 'Bersama'}</span>
                                {mapsEstimate && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-slate-600 font-mono tabular-nums">
                                      Est. Maps: {mapsEstimate}
                                    </span>
                                  </>
                                )}
                              </div>

                              {item.alamat && (
                                <div className="mt-0.5 text-[11px] text-slate-400 truncate">
                                  {item.alamat}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                              {isEditingSpend ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-500">
                                      Rp
                                    </span>
                                    <input
                                      type="number"
                                      min={0}
                                      step={1000}
                                      autoFocus
                                      value={spendDraft}
                                      onChange={(e) => setSpendDraft(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          commitInlineSpend(item.id);
                                        } else if (e.key === 'Escape') {
                                          setEditingSpendId(null);
                                        }
                                      }}
                                      aria-label="Masukkan pengeluaran real"
                                      className="w-28 h-8 pl-7 pr-2 text-xs font-mono tabular-nums bg-white border border-blue-600 rounded-md text-slate-900 focus:outline-none"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => commitInlineSpend(item.id)}
                                    aria-label="Simpan pengeluaran"
                                    className="p-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSpendId(null)}
                                    aria-label="Batal"
                                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startInlineSpend(item)}
                                  title="Klik untuk input / ubah pengeluaran real"
                                  className={`text-xs font-mono tabular-nums px-2 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                                    item.pengeluaranReal !== undefined
                                      ? 'font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200'
                                      : 'text-slate-500 hover:text-blue-700 hover:bg-blue-50'
                                  }`}
                                >
                                  {item.pengeluaranReal !== undefined
                                    ? formatIdr(item.pengeluaranReal)
                                    : '+ Catat biaya'}
                                </button>
                              )}

                              <StatusControl
                                status={item.result}
                                onClick={() => onCycleStatus(item.id)}
                              />

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onEditItem(item)}
                                  aria-label={`Edit ${primaryTitle}`}
                                  className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteItem(item.id)}
                                  aria-label={`Hapus ${primaryTitle}`}
                                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
