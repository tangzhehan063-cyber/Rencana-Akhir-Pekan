/// <reference types="google.maps" />
import { useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { ArrowRight, Loader2, MapPin, Search, Tag, Users } from 'lucide-react';
import { PlaceCategory, ScheduleItem } from '../types/schedule';
import { PLACE_CATEGORIES } from '../utils/categories';
import { formatIdr } from '../utils/currency';
import {
  isGoogleQuotaError,
  ResolvedGooglePlaceData,
  searchPlaceByNameWithPrice,
} from '../utils/googlePlacesLookup';
import {
  computeLocationStats,
  computeOwnerStats,
  formatDuration,
  formatIsoDateShort,
} from '../utils/scheduleStats';

interface LocationsSummaryViewProps {
  items: ScheduleItem[];
  hasMapsApiKey: boolean;
  onEnrichLocationFromMaps: (
    lokasiName: string,
    resolved: ResolvedGooglePlaceData
  ) => void;
  onFilterByLocation: (lokasi: string) => void;
  onFilterByOwner: (owner: string) => void;
  onFilterByCategory: (category: PlaceCategory) => void;
}

export function LocationsSummaryView({
  items,
  hasMapsApiKey,
  onEnrichLocationFromMaps,
  onFilterByLocation,
  onFilterByOwner,
  onFilterByCategory,
}: LocationsSummaryViewProps) {
  const placesLib = useMapsLibrary('places');
  const [loadingLocation, setLoadingLocation] = useState<string | null>(null);
  const [checkedLocations, setCheckedLocations] = useState<Record<string, boolean>>({});
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const locationStats = computeLocationStats(items);
  const ownerStats = computeOwnerStats(items);

  const categoryStats = PLACE_CATEGORIES.map((category) => {
    const matching = items.filter((i) => i.kategori === category);
    const activeMinutes = matching
      .filter((i) => i.result !== 'Cancel')
      .reduce((sum, i) => sum + i.durasi, 0);
    const totalSpend = matching
      .filter((i) => i.result !== 'Cancel' && typeof i.pengeluaranReal === 'number')
      .reduce((sum, i) => sum + (i.pengeluaranReal || 0), 0);
    return {
      category,
      count: matching.length,
      activeMinutes,
      totalSpend,
    };
  }).filter((c) => c.count > 0);

  const handleCheckLocationMaps = async (lokasiName: string) => {
    if (!placesLib || !hasMapsApiKey) return;
    setLoadingLocation(lokasiName);
    setLookupMessage(null);

    try {
      const resolved = await searchPlaceByNameWithPrice(placesLib, lokasiName);
      setCheckedLocations((prev) => ({ ...prev, [lokasiName]: true }));
      if (!resolved) {
        setLookupMessage(`"${lokasiName}" tidak ditemukan di Google Maps.`);
      } else {
        onEnrichLocationFromMaps(lokasiName, resolved);
        if (!resolved.mapsPriceRangeLabel && !resolved.mapsPriceLevel) {
          setLookupMessage(
            `"${resolved.lokasi}" ditemukan, namun Google Maps belum mencantumkan rentang harga untuk tempat ini.`
          );
        }
      }
    } catch (err) {
      if (isGoogleQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        setLookupMessage('Kuota Google Maps API tercapai.');
      } else {
        setLookupMessage(`Gagal mengambil info Google Maps untuk "${lokasiName}".`);
      }
    } finally {
      setLoadingLocation(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Category Breakdown */}
      <section aria-labelledby="category-summary-heading">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 id="category-summary-heading" className="text-lg font-semibold text-slate-900">
              Kategori Tempat & Pengeluaran
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Klasifikasi otomatis tempat serta total pengeluaran real per kategori
            </p>
          </div>
          <Tag className="w-4 h-4 text-slate-400" aria-hidden="true" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          {categoryStats.map((stat) => (
            <div
              key={stat.category}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 border-b border-slate-100 last:border-b-0"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{stat.category}</div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-slate-500 tabular-nums">
                  <span className="font-mono text-base font-semibold text-slate-900">
                    {stat.count}
                  </span>
                  <span>kegiatan</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{formatDuration(stat.activeMinutes)}</span>
                  {stat.totalSpend > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatIdr(stat.totalSpend)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onFilterByCategory(stat.category)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
              >
                <span>Filter</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Owner Breakdown */}
      <section aria-labelledby="owner-summary-heading">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 id="owner-summary-heading" className="text-lg font-semibold text-slate-900">
              Distribusi Berdasarkan Pemilik
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Akumulasi durasi dan pengeluaran real dari seluruh baris sheet
            </p>
          </div>
          <Users className="w-4 h-4 text-slate-400" aria-hidden="true" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {ownerStats.map((stat) => (
            <div key={stat.pemilik} className="p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{stat.pemilik}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
                    {formatDuration(stat.totalMinutes)}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    ({stat.activityCount} kegiatan)
                  </span>
                </div>
                <div className="mt-1 text-xs font-mono tabular-nums text-slate-800 font-medium">
                  Pengeluaran Real: {formatIdr(stat.totalRealSpend)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 tabular-nums">
                  <span className="text-emerald-700 font-medium">{stat.completedCount} Selesai</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 font-medium">{stat.plannedCount} Rencana</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-red-600 font-medium">{stat.cancelledCount} Cancel</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onFilterByOwner(stat.pemilik)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 self-start"
              >
                <span>Lihat agenda</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Destinations & Google Maps Spending Table */}
      <section aria-labelledby="location-summary-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 id="location-summary-heading" className="text-lg font-semibold text-slate-900">
              Lokasi, Estimasi Google Maps & Pengeluaran Real
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {locationStats.length} lokasi tercatat · Klik &quot;Cek via Maps&quot; untuk melihat rata-rata pengeluaran dari Google Maps
            </p>
          </div>
          <MapPin className="w-4 h-4 text-slate-400 hidden sm:block" aria-hidden="true" />
        </div>

        {lookupMessage && (
          <div className="mb-3 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700">
            {lookupMessage}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Lokasi</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Rata-rata Google Maps</th>
                  <th className="px-4 py-3 text-right">Rata-rata Real</th>
                  <th className="px-4 py-3 text-right">Total Real</th>
                  <th className="px-4 py-3 text-right">Kunjungan</th>
                  <th className="px-4 py-3 text-right">Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {locationStats.map((loc) => {
                  const isUndefinedLoc = loc.lokasi === '(Lokasi belum ditentukan)';
                  const mapsDisplay = loc.mapsPriceRangeLabel || loc.mapsPriceLevel;
                  const isChecking = loadingLocation === loc.lokasi;
                  const wasChecked = checkedLocations[loc.lokasi];

                  return (
                    <tr key={loc.lokasi} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {!isUndefinedLoc ? (
                          <button
                            type="button"
                            onClick={() => onFilterByLocation(loc.lokasi)}
                            className="text-left hover:text-blue-600 hover:underline underline-offset-4 transition-colors"
                          >
                            {loc.lokasi}
                          </button>
                        ) : (
                          <span className="text-slate-400 font-normal">{loc.lokasi}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                        {loc.kategori}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {mapsDisplay ? (
                          <span className="font-mono tabular-nums text-slate-800">
                            {mapsDisplay}
                          </span>
                        ) : isUndefinedLoc ? (
                          <span className="text-slate-400">—</span>
                        ) : wasChecked ? (
                          <span className="text-slate-400">Tidak tersedia di Maps</span>
                        ) : hasMapsApiKey && placesLib ? (
                          <button
                            type="button"
                            disabled={isChecking}
                            onClick={() => void handleCheckLocationMaps(loc.lokasi)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          >
                            {isChecking ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Search className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>{isChecking ? 'Memeriksa...' : 'Cek via Maps'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                        {loc.avgRealSpend !== null ? (
                          formatIdr(loc.avgRealSpend)
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {loc.totalRealSpend > 0 ? (
                          formatIdr(loc.totalRealSpend)
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                        {loc.visitCount}x · {formatDuration(loc.totalMinutes)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                        {formatIsoDateShort(loc.lastDateIso)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
