/// <reference types="google.maps" />
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { ExternalLink, Loader2, MapPin, Search, Sparkles, X } from 'lucide-react';
import { useAutocompleteSuggestions } from '../hooks/useAutocompleteSuggestions';
import { PlaceCategory, ResultStatus, ScheduleItem } from '../types/schedule';
import { inferCategoryFromText, PLACE_CATEGORIES } from '../utils/categories';
import {
  computeDurationMinutes,
  getIndonesianDayFromIso,
  isoToDmy,
} from '../utils/csv';
import {
  fetchPlaceDetailsWithPrice,
  isGoogleQuotaError,
  searchPlaceByNameWithPrice,
} from '../utils/googlePlacesLookup';

interface ActivityModalProps {
  open: boolean;
  editingItem: ScheduleItem | null;
  defaultDateIso?: string | null;
  knownLocations: string[];
  knownOwners: string[];
  hasMapsApiKey: boolean;
  onClose: () => void;
  onSave: (data: Omit<ScheduleItem, 'id' | 'rowOrder'>, existingId?: string) => void;
}

export function ActivityModal({
  open,
  editingItem,
  defaultDateIso,
  knownLocations,
  knownOwners,
  hasMapsApiKey,
  onClose,
  onSave,
}: ActivityModalProps) {
  const placesLib = useMapsLibrary('places');

  const [dateIso, setDateIso] = useState('2026-11-07');
  const [hari, setHari] = useState('Sabtu');
  const [jamMulai, setJamMulai] = useState('09:00');
  const [jamSelesai, setJamSelesai] = useState('10:00');
  const [durasi, setDurasi] = useState(60);
  const [lokasi, setLokasi] = useState('');
  const [kategori, setKategori] = useState<PlaceCategory>('Kantor & Lainnya');
  const [categoryManual, setCategoryManual] = useState(false);
  const [alamat, setAlamat] = useState<string | undefined>(undefined);
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(
    undefined
  );
  const [mapsPriceLevel, setMapsPriceLevel] = useState<string | undefined>(undefined);
  const [mapsPriceRangeLabel, setMapsPriceRangeLabel] = useState<string | undefined>(
    undefined
  );
  const [mapsPriceAvg, setMapsPriceAvg] = useState<number | undefined>(undefined);
  const [mapsPriceCurrency, setMapsPriceCurrency] = useState<string | undefined>(
    undefined
  );
  const [pengeluaranRealText, setPengeluaranRealText] = useState('');
  const [pemilik, setPemilik] = useState('');
  const [catatan, setCatatan] = useState('');
  const [result, setResult] = useState<ResultStatus>('Rencana');
  const [plan, setPlan] = useState('');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const locationWrapperRef = useRef<HTMLDivElement | null>(null);

  const {
    suggestions,
    isLoading: suggestionsLoading,
    error: autocompleteError,
    isPlacesReady,
    resetSession,
  } = useAutocompleteSuggestions(lokasi, open && dropdownOpen && hasMapsApiKey);

  useEffect(() => {
    if (!open) return;

    setDropdownOpen(false);
    setPlaceError(null);
    setFetchingDetails(false);

    if (editingItem) {
      setDateIso(editingItem.dateIso);
      setHari(editingItem.hari);
      setJamMulai(editingItem.jamMulai);
      setJamSelesai(editingItem.jamSelesai);
      setDurasi(editingItem.durasi);
      setLokasi(editingItem.lokasi);
      setKategori(
        editingItem.kategori ||
          inferCategoryFromText(
            editingItem.lokasi,
            editingItem.catatan,
            editingItem.plan
          )
      );
      setCategoryManual(true);
      setAlamat(editingItem.alamat);
      setPlaceId(editingItem.placeId);
      setCoords(
        editingItem.lat !== undefined && editingItem.lng !== undefined
          ? { lat: editingItem.lat, lng: editingItem.lng }
          : undefined
      );
      setMapsPriceLevel(editingItem.mapsPriceLevel);
      setMapsPriceRangeLabel(editingItem.mapsPriceRangeLabel);
      setMapsPriceAvg(editingItem.mapsPriceAvg);
      setMapsPriceCurrency(editingItem.mapsPriceCurrency);
      setPengeluaranRealText(
        editingItem.pengeluaranReal !== undefined
          ? String(editingItem.pengeluaranReal)
          : ''
      );
      setPemilik(editingItem.pemilik);
      setCatatan(editingItem.catatan);
      setResult(editingItem.result);
      setPlan(editingItem.plan);
    } else {
      const initDate = defaultDateIso || '2026-11-14';
      setDateIso(initDate);
      setHari(getIndonesianDayFromIso(initDate) || 'Sabtu');
      setJamMulai('09:00');
      setJamSelesai('10:30');
      setDurasi(90);
      setLokasi('');
      setKategori('Kantor & Lainnya');
      setCategoryManual(false);
      setAlamat(undefined);
      setPlaceId(undefined);
      setCoords(undefined);
      setMapsPriceLevel(undefined);
      setMapsPriceRangeLabel(undefined);
      setMapsPriceAvg(undefined);
      setMapsPriceCurrency(undefined);
      setPengeluaranRealText('');
      setPemilik('');
      setCatatan('');
      setResult('Rencana');
      setPlan('');
    }
  }, [open, editingItem, defaultDateIso]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationWrapperRef.current &&
        !locationWrapperRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  if (!open) return null;

  const handleDateChange = (newIso: string) => {
    setDateIso(newIso);
    const computedDay = getIndonesianDayFromIso(newIso);
    if (computedDay) setHari(computedDay);
  };

  const handleStartTimeChange = (newStart: string) => {
    setJamMulai(newStart);
    setDurasi(computeDurationMinutes(newStart, jamSelesai));
  };

  const handleEndTimeChange = (newEnd: string) => {
    setJamSelesai(newEnd);
    setDurasi(computeDurationMinutes(jamMulai, newEnd));
  };

  const handleLokasiInput = (val: string) => {
    setLokasi(val);
    setDropdownOpen(true);
    setPlaceError(null);
    setAlamat(undefined);
    setPlaceId(undefined);
    setCoords(undefined);
    setMapsPriceLevel(undefined);
    setMapsPriceRangeLabel(undefined);
    setMapsPriceAvg(undefined);
    setMapsPriceCurrency(undefined);

    if (!categoryManual) {
      setKategori(inferCategoryFromText(val, catatan, plan));
    }
  };

  const handleCatatanInput = (val: string) => {
    setCatatan(val);
    if (!categoryManual && !placeId) {
      setKategori(inferCategoryFromText(lokasi, val, plan));
    }
  };

  const applyResolvedPlace = (resolved: Awaited<ReturnType<typeof fetchPlaceDetailsWithPrice>>) => {
    setLokasi(resolved.lokasi);
    setAlamat(resolved.alamat);
    setPlaceId(resolved.placeId);
    if (resolved.lat !== undefined && resolved.lng !== undefined) {
      setCoords({ lat: resolved.lat, lng: resolved.lng });
    }
    setKategori(resolved.kategori);
    setCategoryManual(true);
    setMapsPriceLevel(resolved.mapsPriceLevel);
    setMapsPriceRangeLabel(resolved.mapsPriceRangeLabel);
    setMapsPriceAvg(resolved.mapsPriceAvg);
    setMapsPriceCurrency(resolved.mapsPriceCurrency);
  };

  const handleSelectPrediction = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    const prediction = suggestion.placePrediction;
    if (!prediction || !placesLib) return;

    setDropdownOpen(false);
    setFetchingDetails(true);
    setPlaceError(null);

    try {
      const place = prediction.toPlace();
      const fallbackName =
        prediction.mainText?.text || prediction.text?.text || lokasi;
      const resolved = await fetchPlaceDetailsWithPrice(place, fallbackName);
      applyResolvedPlace(resolved);
      resetSession();
    } catch (err) {
      if (isGoogleQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        setPlaceError(
          'Kuota Google Maps API tercapai. Lokasi tetap disimpan secara manual.'
        );
      } else {
        setPlaceError('Gagal mengambil detail lokasi dari Google Maps.');
      }
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleLookupCurrentLocation = async () => {
    if (!placesLib || !lokasi.trim()) return;
    setDropdownOpen(false);
    setFetchingDetails(true);
    setPlaceError(null);

    try {
      const resolved = await searchPlaceByNameWithPrice(placesLib, lokasi);
      if (!resolved) {
        setPlaceError('Tempat tidak ditemukan di Google Maps.');
      } else {
        applyResolvedPlace(resolved);
      }
    } catch (err) {
      if (isGoogleQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        setPlaceError('Kuota Google Maps API tercapai.');
      } else {
        setPlaceError('Gagal mencari info lokasi di Google Maps.');
      }
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleSelectSavedLocation = (savedName: string) => {
    setLokasi(savedName);
    setDropdownOpen(false);
    setAlamat(undefined);
    setPlaceId(undefined);
    setCoords(undefined);
    setMapsPriceLevel(undefined);
    setMapsPriceRangeLabel(undefined);
    setMapsPriceAvg(undefined);
    setMapsPriceCurrency(undefined);
    if (!categoryManual) {
      setKategori(inferCategoryFromText(savedName, catatan, plan));
    }
  };

  const filteredSavedLocations = knownLocations
    .filter((loc) =>
      lokasi.trim()
        ? loc.toLowerCase().includes(lokasi.trim().toLowerCase())
        : true
    )
    .slice(0, 5);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanedDigits = pengeluaranRealText.replace(/[^\d]/g, '');
    const pengeluaranReal = cleanedDigits ? parseInt(cleanedDigits, 10) : undefined;

    onSave(
      {
        dateIso,
        waktuMulaiDisplay: isoToDmy(dateIso),
        hari: hari.trim() || getIndonesianDayFromIso(dateIso),
        durasi: Math.max(0, Number(durasi) || 0),
        jamMulai,
        jamSelesai,
        lokasi: lokasi.trim(),
        kategori,
        alamat,
        placeId,
        lat: coords?.lat,
        lng: coords?.lng,
        mapsPriceLevel,
        mapsPriceRangeLabel,
        mapsPriceAvg,
        mapsPriceCurrency,
        pengeluaranReal,
        pemilik: pemilik.trim(),
        catatan: catatan.trim(),
        result,
        plan: plan.trim(),
      },
      editingItem?.id
    );
  };

  const mapsLinkUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}${
        placeId ? `&query_place_id=${encodeURIComponent(placeId)}` : ''
      }`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="activity-modal-title" className="text-base font-semibold text-slate-900">
            {editingItem ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="act-date" className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal (Waktu mulai)
              </label>
              <input
                id="act-date"
                type="date"
                required
                value={dateIso}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="act-day" className="block text-xs font-medium text-slate-700 mb-1">
                Hari
              </label>
              <input
                id="act-day"
                type="text"
                required
                value={hari}
                onChange={(e) => setHari(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="act-start" className="block text-xs font-medium text-slate-700 mb-1">
                Jam mulai
              </label>
              <input
                id="act-start"
                type="time"
                required
                value={jamMulai}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full h-9 px-3 text-sm font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="act-end" className="block text-xs font-medium text-slate-700 mb-1">
                Jam selesai
              </label>
              <input
                id="act-end"
                type="time"
                required
                value={jamSelesai}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full h-9 px-3 text-sm font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="act-dur" className="block text-xs font-medium text-slate-700 mb-1">
                Durasi (menit)
              </label>
              <input
                id="act-dur"
                type="number"
                min={0}
                required
                value={durasi}
                onChange={(e) => setDurasi(parseInt(e.target.value, 10) || 0)}
                className="w-full h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Google Maps Places Autocomplete Location Field */}
          <div ref={locationWrapperRef} className="relative">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label htmlFor="act-location" className="block text-xs font-medium text-slate-700">
                Lokasi (Google Maps)
              </label>
              {hasMapsApiKey && isPlacesReady && lokasi.trim().length > 1 && !placeId && (
                <button
                  type="button"
                  onClick={() => void handleLookupCurrentLocation()}
                  disabled={fetchingDetails}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  <span>Ambil harga & info Maps</span>
                </button>
              )}
            </div>

            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="act-location"
                type="text"
                autoComplete="off"
                value={lokasi}
                onFocus={() => setDropdownOpen(true)}
                onChange={(e) => handleLokasiInput(e.target.value)}
                placeholder="Ketik nama tempat untuk saran Google Maps..."
                className="w-full h-9 pl-9 pr-8 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              {(suggestionsLoading || fetchingDetails) && (
                <Loader2
                  className="w-4 h-4 text-blue-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
              )}
            </div>

            {dropdownOpen &&
              (suggestions.length > 0 ||
                filteredSavedLocations.length > 0 ||
                autocompleteError) && (
                <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {autocompleteError && (
                    <div className="px-3 py-2 text-xs text-amber-700 bg-amber-50">
                      {autocompleteError}
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-50">
                        Saran Google Maps
                      </div>
                      {suggestions.map((suggestion, idx) => {
                        const pred = suggestion.placePrediction;
                        if (!pred) return null;
                        const mainText =
                          pred.mainText?.text || pred.text?.text || '';
                        const secondaryText = pred.secondaryText?.text || '';
                        return (
                          <button
                            key={pred.placeId || idx}
                            type="button"
                            onClick={() => void handleSelectPrediction(suggestion)}
                            className="w-full px-3 py-2.5 text-left hover:bg-blue-50/70 transition-colors flex items-start gap-2.5"
                          >
                            <MapPin
                              className="w-4 h-4 text-blue-600 mt-0.5 shrink-0"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">
                                {mainText}
                              </div>
                              {secondaryText && (
                                <div className="text-xs text-slate-500 truncate">
                                  {secondaryText}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredSavedLocations.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-50">
                        Pernah dikunjungi di Sheet
                      </div>
                      {filteredSavedLocations.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => handleSelectSavedLocation(loc)}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                          <MapPin
                            className="w-3.5 h-3.5 text-slate-400 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">{loc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {placeError && (
              <p className="mt-1 text-xs text-amber-700">{placeError}</p>
            )}

            {(alamat || coords) && (
              <div className="mt-2.5 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                {coords && hasMapsApiKey && (
                  <div style={{ width: '100%', height: '150px' }}>
                    <GoogleMap
                      mapId="DEMO_MAP_ID"
                      defaultCenter={coords}
                      center={coords}
                      defaultZoom={15}
                      gestureHandling="cooperative"
                      disableDefaultUI={true}
                      internalUsageAttributionIds={[
                        'gmp_mcp_codeassist_v1_aistudio',
                      ]}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <AdvancedMarker position={coords} title={lokasi} />
                    </GoogleMap>
                  </div>
                )}
                <div className="px-3 py-2 flex items-start justify-between gap-3 text-xs">
                  <span className="text-slate-600 leading-relaxed">
                    {alamat || `${coords?.lat.toFixed(5)}, ${coords?.lng.toFixed(5)}`}
                  </span>
                  {mapsLinkUrl && (
                    <a
                      href={mapsLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap shrink-0"
                    >
                      <span>Maps</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Category & Expense Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="act-category" className="block text-xs font-medium text-slate-700 mb-1">
                Kategori Tempat
              </label>
              <select
                id="act-category"
                value={kategori}
                onChange={(e) => {
                  setKategori(e.target.value as PlaceCategory);
                  setCategoryManual(true);
                }}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {PLACE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="act-real-spend" className="block text-xs font-medium text-slate-700 mb-1">
                Pengeluaran Real (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                  Rp
                </span>
                <input
                  id="act-real-spend"
                  type="number"
                  min={0}
                  step={1000}
                  value={pengeluaranRealText}
                  onChange={(e) => setPengeluaranRealText(e.target.value)}
                  placeholder="0"
                  className="w-full h-9 pl-9 pr-3 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Google Maps Price Estimate Display */}
          {(mapsPriceRangeLabel || mapsPriceLevel || placeId) && (
            <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 font-medium">
                Rata-rata Pengeluaran (Google Maps):
              </span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {mapsPriceRangeLabel ||
                  mapsPriceLevel ||
                  'Rentang harga tidak tersedia di Google Maps'}
              </span>
            </div>
          )}

          <div>
            <label htmlFor="act-notes" className="block text-xs font-medium text-slate-700 mb-1">
              Catatan / Aktivitas
            </label>
            <input
              id="act-notes"
              type="text"
              value={catatan}
              onChange={(e) => handleCatatanInput(e.target.value)}
              placeholder="Contoh: Nonton conan, Makan malam, Potong rambut"
              className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="act-owner" className="block text-xs font-medium text-slate-700 mb-1">
                Pemilik (kosong = Bersama)
              </label>
              <input
                id="act-owner"
                type="text"
                list="known-owners-list"
                value={pemilik}
                onChange={(e) => setPemilik(e.target.value)}
                placeholder="Dev Rey / Gita Eudora Tadisa"
                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
              <datalist id="known-owners-list">
                {knownOwners.map((owner) => (
                  <option key={owner} value={owner} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="act-result" className="block text-xs font-medium text-slate-700 mb-1">
                Status (Result)
              </label>
              <select
                id="act-result"
                value={result}
                onChange={(e) => setResult(e.target.value as ResultStatus)}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="Rencana">Rencana (Belum selesai)</option>
                <option value="Selesai">Selesai</option>
                <option value="Cancel">Cancel</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="act-plan" className="block text-xs font-medium text-slate-700 mb-1">
              Plan / Judul Perjalanan (opsional)
            </label>
            <input
              id="act-plan"
              type="text"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="Contoh: TRIP TO DIENG"
              className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {editingItem ? 'Simpan Perubahan' : 'Tambahkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
