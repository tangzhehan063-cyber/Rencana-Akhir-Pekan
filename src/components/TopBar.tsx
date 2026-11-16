import { Menu, Plus, Search, X } from 'lucide-react';
import { ViewMode } from '../types/schedule';

interface TopBarProps {
  viewMode: ViewMode;
  selectedDateLabel: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddActivity: () => void;
  onOpenMobileMenu: () => void;
}

const VIEW_LABELS: Record<ViewMode, string> = {
  timeline: 'Timeline Agenda',
  sheet: 'Tabel Sheet',
  locations: 'Ringkasan Lokasi',
};

export function TopBar({
  viewMode,
  selectedDateLabel,
  searchQuery,
  onSearchChange,
  onAddActivity,
  onOpenMobileMenu,
}: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
      {/* Left: Mobile toggle + Contextual Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
            Travel Planning
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <span className="font-semibold text-slate-900 whitespace-nowrap truncate">
            {VIEW_LABELS[viewMode]}
          </span>
          {selectedDateLabel && (
            <>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="text-blue-700 font-medium whitespace-nowrap truncate max-w-[160px] sm:max-w-xs">
                {selectedDateLabel}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Search + 1 Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative hidden md:block w-64">
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
            className="w-full h-9 pl-9 pr-8 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Hapus pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onAddActivity}
          className="inline-flex items-center gap-1.5 h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Tambah Kegiatan</span>
        </button>
      </div>
    </header>
  );
}
