import { useEffect, useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { ActivityModal } from './components/ActivityModal';
import { ImportModal } from './components/ImportModal';
import { LocationsSummaryView } from './components/LocationsSummaryView';
import { SheetTableView } from './components/SheetTableView';
import { Sidebar } from './components/Sidebar';
import { TimelineView } from './components/TimelineView';
import { TopBar } from './components/TopBar';
import { PlaceCategory, ResultStatus, ScheduleItem, ViewMode } from './types/schedule';
import { normalizePlaceCategory } from './utils/categories';
import {
  DEFAULT_TRAVEL_CSV,
  parseScheduleCsv,
  serializeSchedule,
} from './utils/csv';
import { ResolvedGooglePlaceData } from './utils/googlePlacesLookup';
import {
  formatIsoDateShort,
  formatMonthLabel,
  groupDaysByMonth,
  groupItemsByDate,
} from './utils/scheduleStats';

const STORAGE_KEY = 'travel_planning_sheet_items_v1';
const MODIFIED_KEY = 'travel_planning_sheet_modified_v1';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface ToastState {
  message: string;
  undoItems?: ScheduleItem[];
}

function hydrateItems(rawItems: ScheduleItem[]): ScheduleItem[] {
  return rawItems.map((item) => ({
    ...item,
    kategori: normalizePlaceCategory(
      item.kategori,
      item.lokasi || '',
      item.catatan || '',
      item.plan || ''
    ),
  }));
}

export default function App() {
  const [items, setItems] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return hydrateItems(parsed);
        }
      }
    } catch {
      // Fallback to default sheet
    }
    return parseScheduleCsv(DEFAULT_TRAVEL_CSV);
  });

  const [isModified, setIsModified] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MODIFIED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'Semua' | ResultStatus>('Semua');
  const [ownerFilter, setOwnerFilter] = useState<string>('Semua');
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | PlaceCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  useEffect(() => {
    if (isModified) return;
    let active = true;
    fetch('/assets/aistudio/Travel_Planning_e4d1c233')
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (!active || !text) return;
        const parsed = parseScheduleCsv(text);
        if (parsed.length > 0) {
          setItems(parsed);
        }
      })
      .catch(() => {
        // Embedded DEFAULT_TRAVEL_CSV already loaded
      });
    return () => {
      active = false;
    };
  }, [isModified]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(MODIFIED_KEY, String(isModified));
    } catch {
      // Ignore storage quota errors
    }
  }, [items, isModified]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, undoItems?: ScheduleItem[]) => {
    setToast({ message, undoItems });
  };

  // All day & month groups sorted newest -> oldest
  const allDayGroups = useMemo(() => groupItemsByDate(items, 'desc'), [items]);
  const allMonthGroups = useMemo(
    () => groupDaysByMonth(allDayGroups, 'desc'),
    [allDayGroups]
  );

  const availableMonths = useMemo(
    () =>
      allMonthGroups.map((m) => ({
        monthKey: m.monthKey,
        monthLabel: m.monthLabel,
      })),
    [allMonthGroups]
  );

  const availableDatesForFilter = useMemo(() => {
    if (!selectedMonth) return allDayGroups;
    return allDayGroups.filter((d) => d.dateIso.startsWith(selectedMonth));
  }, [allDayGroups, selectedMonth]);

  const ownerOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.pemilik.trim()) set.add(i.pemilik.trim());
    });
    return [...Array.from(set).sort(), 'Bersama / Umum'];
  }, [items]);

  const knownLocations = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.lokasi.trim()) set.add(i.lokasi.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  const knownOwners = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.pemilik.trim()) set.add(i.pemilik.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedMonth && !item.dateIso.startsWith(selectedMonth)) return false;
      if (selectedDateIso && item.dateIso !== selectedDateIso) return false;
      if (statusFilter !== 'Semua' && item.result !== statusFilter) return false;
      if (categoryFilter !== 'Semua' && item.kategori !== categoryFilter) return false;
      if (ownerFilter !== 'Semua') {
        if (ownerFilter === 'Bersama / Umum') {
          if (item.pemilik.trim() !== '') return false;
        } else if (item.pemilik.trim() !== ownerFilter) {
          return false;
        }
      }
      if (q) {
        const haystack = [
          item.lokasi,
          item.kategori,
          item.alamat || '',
          item.catatan,
          item.pemilik,
          item.plan,
          item.hari,
          item.waktuMulaiDisplay,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    items,
    selectedMonth,
    selectedDateIso,
    statusFilter,
    categoryFilter,
    ownerFilter,
    searchQuery,
  ]);

  const filteredDayGroups = useMemo(
    () => groupItemsByDate(filteredItems, 'desc'),
    [filteredItems]
  );

  const filteredMonthGroups = useMemo(
    () => groupDaysByMonth(filteredDayGroups, 'desc'),
    [filteredDayGroups]
  );

  const handleCycleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextStatus: ResultStatus =
          item.result === 'Rencana'
            ? 'Selesai'
            : item.result === 'Selesai'
            ? 'Cancel'
            : 'Rencana';
        return { ...item, result: nextStatus };
      })
    );
    setIsModified(true);
  };

  const handleUpdateRealSpend = (id: string, amount: number | undefined) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, pengeluaranReal: amount } : item
      )
    );
    setIsModified(true);
    showToast(
      amount !== undefined
        ? 'Pengeluaran real disimpan.'
        : 'Pengeluaran real dikosongkan.'
    );
  };

  const handleEnrichLocationFromMaps = (
    lokasiName: string,
    resolved: ResolvedGooglePlaceData
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.lokasi.trim() !== lokasiName.trim()) return item;
        return {
          ...item,
          alamat: item.alamat || resolved.alamat,
          placeId: item.placeId || resolved.placeId,
          lat: item.lat ?? resolved.lat,
          lng: item.lng ?? resolved.lng,
          kategori: resolved.kategori,
          mapsPriceLevel: resolved.mapsPriceLevel ?? item.mapsPriceLevel,
          mapsPriceRangeLabel:
            resolved.mapsPriceRangeLabel ?? item.mapsPriceRangeLabel,
          mapsPriceAvg: resolved.mapsPriceAvg ?? item.mapsPriceAvg,
          mapsPriceCurrency:
            resolved.mapsPriceCurrency ?? item.mapsPriceCurrency,
        };
      })
    );
    setIsModified(true);
    showToast(`Info Google Maps untuk "${lokasiName}" diperbarui.`);
  };

  const handleSaveActivity = (
    data: Omit<ScheduleItem, 'id' | 'rowOrder'>,
    existingId?: string
  ) => {
    if (existingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === existingId ? { ...item, ...data } : item
        )
      );
      showToast('Kegiatan diperbarui.');
    } else {
      const nextOrder =
        items.reduce((max, i) => Math.max(max, i.rowOrder), 0) + 1;
      const newItem: ScheduleItem = {
        ...data,
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        rowOrder: nextOrder,
      };
      setItems((prev) => [...prev, newItem]);
      showToast('Kegiatan baru ditambahkan.');
    }
    setIsModified(true);
    setActivityModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    const previous = items;
    const target = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setIsModified(true);
    showToast(
      `Menghapus "${target?.catatan || target?.lokasi || 'kegiatan'}".`,
      previous
    );
  };

  const handleExportCsv = () => {
    const csv = serializeSchedule(items, { delimiter: ',', sparseDates: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Travel_Planning_Export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('File CSV berhasil diunduh.');
  };

  const handleCopyTsv = async () => {
    const tsv = serializeSchedule(items, { delimiter: '\t', sparseDates: true });
    try {
      await navigator.clipboard.writeText(tsv);
      showToast('Tabel disalin! Tempel (Ctrl+V) langsung di Google Sheets.');
    } catch {
      showToast('Clipboard tidak diizinkan browser. Gunakan Unduh CSV.');
    }
  };

  const handleImportItems = (
    imported: ScheduleItem[],
    mode: 'replace' | 'append'
  ) => {
    const previous = items;
    if (mode === 'replace') {
      setItems(imported);
      setSelectedMonth(null);
      setSelectedDateIso(null);
    } else {
      const baseOrder = items.reduce((max, i) => Math.max(max, i.rowOrder), 0) + 1;
      const reindexed = imported.map((item, idx) => ({
        ...item,
        id: `imp-${Date.now()}-${idx}`,
        rowOrder: baseOrder + idx,
      }));
      setItems((prev) => [...prev, ...reindexed]);
    }
    setIsModified(true);
    showToast(`${imported.length} baris berhasil diimpor.`, previous);
  };

  const handleResetDefault = () => {
    const previous = items;
    setItems(parseScheduleCsv(DEFAULT_TRAVEL_CSV));
    setIsModified(false);
    setSelectedMonth(null);
    setSelectedDateIso(null);
    setStatusFilter('Semua');
    setOwnerFilter('Semua');
    setCategoryFilter('Semua');
    setSearchQuery('');
    showToast('Jadwal dikembalikan ke data Google Sheet asli.', previous);
  };

  const breadcrumbScopeLabel = selectedDateIso
    ? formatIsoDateShort(selectedDateIso)
    : selectedMonth
    ? formatMonthLabel(selectedMonth)
    : null;

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      language="id"
      region="ID"
      libraries={['places', 'marker']}
    >
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {mapsQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        <div className="flex-1 flex">
          <Sidebar
            viewMode={viewMode}
            onChangeView={setViewMode}
            monthGroups={allMonthGroups}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            selectedDateIso={selectedDateIso}
            onSelectDate={setSelectedDateIso}
            onOpenImport={() => setImportModalOpen(true)}
            onExportCsv={handleExportCsv}
            onCopyTsv={handleCopyTsv}
            onResetDefault={handleResetDefault}
            isModified={isModified}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />

          <div className="flex-1 min-w-0 flex flex-col">
            <TopBar
              viewMode={viewMode}
              selectedDateLabel={breadcrumbScopeLabel}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onAddActivity={() => {
                setEditingItem(null);
                setModalDefaultDate(selectedDateIso);
                setActivityModalOpen(true);
              }}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
              {viewMode === 'timeline' && (
                <TimelineView
                  monthGroups={filteredMonthGroups}
                  availableMonths={availableMonths}
                  availableDates={availableDatesForFilter}
                  allItemsCount={items.length}
                  selectedMonth={selectedMonth}
                  onSelectMonth={setSelectedMonth}
                  selectedDateIso={selectedDateIso}
                  onSelectDate={setSelectedDateIso}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  ownerFilter={ownerFilter}
                  onOwnerFilterChange={setOwnerFilter}
                  ownerOptions={ownerOptions}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={setCategoryFilter}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onCycleStatus={handleCycleStatus}
                  onUpdateRealSpend={handleUpdateRealSpend}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setModalDefaultDate(null);
                    setActivityModalOpen(true);
                  }}
                  onDeleteItem={handleDeleteItem}
                  onAddOnDate={(dateIso) => {
                    setEditingItem(null);
                    setModalDefaultDate(dateIso);
                    setActivityModalOpen(true);
                  }}
                  onAddActivity={() => {
                    setEditingItem(null);
                    setModalDefaultDate(selectedDateIso);
                    setActivityModalOpen(true);
                  }}
                />
              )}

              {viewMode === 'sheet' && (
                <SheetTableView
                  items={filteredItems}
                  onCycleStatus={handleCycleStatus}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setModalDefaultDate(null);
                    setActivityModalOpen(true);
                  }}
                  onDeleteItem={handleDeleteItem}
                  onCopyTsv={handleCopyTsv}
                />
              )}

              {viewMode === 'locations' && (
                <LocationsSummaryView
                  items={items}
                  hasMapsApiKey={Boolean(GOOGLE_MAPS_API_KEY)}
                  onEnrichLocationFromMaps={handleEnrichLocationFromMaps}
                  onFilterByLocation={(lokasi) => {
                    setSearchQuery(lokasi);
                    setSelectedMonth(null);
                    setSelectedDateIso(null);
                    setStatusFilter('Semua');
                    setOwnerFilter('Semua');
                    setCategoryFilter('Semua');
                    setViewMode('timeline');
                  }}
                  onFilterByOwner={(owner) => {
                    setOwnerFilter(owner);
                    setSelectedMonth(null);
                    setSelectedDateIso(null);
                    setStatusFilter('Semua');
                    setCategoryFilter('Semua');
                    setSearchQuery('');
                    setViewMode('timeline');
                  }}
                  onFilterByCategory={(cat) => {
                    setCategoryFilter(cat);
                    setSelectedMonth(null);
                    setSelectedDateIso(null);
                    setStatusFilter('Semua');
                    setOwnerFilter('Semua');
                    setSearchQuery('');
                    setViewMode('timeline');
                  }}
                />
              )}
            </main>
          </div>
        </div>

        <ActivityModal
          open={activityModalOpen}
          editingItem={editingItem}
          defaultDateIso={modalDefaultDate}
          knownLocations={knownLocations}
          knownOwners={knownOwners}
          hasMapsApiKey={Boolean(GOOGLE_MAPS_API_KEY)}
          onClose={() => {
            setActivityModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveActivity}
        />

        <ImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={handleImportItems}
        />

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-4 text-sm max-w-md"
          >
            <span className="truncate">{toast.message}</span>
            {toast.undoItems && (
              <button
                type="button"
                onClick={() => {
                  setItems(toast.undoItems!);
                  setToast(null);
                }}
                className="text-blue-300 hover:text-blue-200 font-semibold whitespace-nowrap shrink-0"
              >
                Urungkan
              </button>
            )}
          </div>
        )}
      </div>
    </APIProvider>
  );
}
