import {
  CalendarDays,
  Table2,
  MapPin,
  Upload,
  Download,
  Copy,
  RotateCcw,
  X,
} from 'lucide-react';
import { MonthGroup, ViewMode } from '../types/schedule';

interface SidebarProps {
  viewMode: ViewMode;
  onChangeView: (mode: ViewMode) => void;
  monthGroups: MonthGroup[];
  selectedMonth: string | null;
  onSelectMonth: (monthKey: string | null) => void;
  selectedDateIso: string | null;
  onSelectDate: (dateIso: string | null) => void;
  onOpenImport: () => void;
  onExportCsv: () => void;
  onCopyTsv: () => void;
  onResetDefault: () => void;
  isModified: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  viewMode,
  onChangeView,
  monthGroups,
  selectedMonth,
  onSelectMonth,
  selectedDateIso,
  onSelectDate,
  onOpenImport,
  onExportCsv,
  onCopyTsv,
  onResetDefault,
  isModified,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: { id: ViewMode; label: string; icon: typeof CalendarDays }[] = [
    { id: 'timeline', label: 'Timeline Agenda', icon: CalendarDays },
    { id: 'sheet', label: 'Tabel Sheet', icon: Table2 },
    { id: 'locations', label: 'Ringkasan Lokasi', icon: MapPin },
  ];

  const totalItems = monthGroups.reduce((sum, m) => sum + m.totalActivities, 0);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 select-none">
      {/* Brand Title */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
          Rencana Akhir Pekan
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu"
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 py-4 border-b border-slate-200 shrink-0">
        <p className="px-2.5 mb-2 text-xs font-medium text-slate-500">Tampilan</p>
        <nav className="space-y-1" aria-label="Menu utama">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = viewMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChangeView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Month & Date Index (Newest to Oldest) */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-2.5 mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">Bulan &amp; Tanggal</p>
          {(selectedMonth || selectedDateIso) && (
            <button
              type="button"
              onClick={() => {
                onSelectMonth(null);
                onSelectDate(null);
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              Semua
            </button>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              onSelectMonth(null);
              onSelectDate(null);
              if (viewMode === 'locations') onChangeView('timeline');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-colors duration-150 ${
              selectedMonth === null && selectedDateIso === null
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="truncate">Semua Bulan</span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {totalItems}
            </span>
          </button>

          {monthGroups.map((month) => {
            const isMonthSelected =
              selectedMonth === month.monthKey && selectedDateIso === null;
            return (
              <div key={month.monthKey} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onSelectMonth(month.monthKey);
                    onSelectDate(null);
                    if (viewMode === 'locations') onChangeView('timeline');
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    isMonthSelected
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{month.monthLabel}</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {month.totalActivities}
                  </span>
                </button>

                <div className="pl-2 space-y-0.5">
                  {month.days.map((group) => {
                    const isSelected = selectedDateIso === group.dateIso;
                    return (
                      <button
                        key={group.dateIso}
                        type="button"
                        onClick={() => {
                          onSelectMonth(month.monthKey);
                          onSelectDate(group.dateIso);
                          if (viewMode === 'locations') onChangeView('timeline');
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors duration-150 ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs truncate">{group.shortDateLabel}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {group.planTitle ? group.planTitle : group.hari}
                          </div>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                          {group.items.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Google Sheets Actions */}
      <div className="p-3 border-t border-slate-200 space-y-1 shrink-0 bg-slate-50/60">
        <p className="px-2.5 pb-1 text-xs font-medium text-slate-500">Google Sheets</p>
        <button
          type="button"
          onClick={() => {
            onOpenImport();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <Upload className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span>Impor / Tempel CSV</span>
        </button>
        <button
          type="button"
          onClick={onCopyTsv}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <Copy className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span>Salin ke Google Sheets</span>
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span>Unduh CSV</span>
        </button>
        {isModified && (
          <button
            type="button"
            onClick={onResetDefault}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Reset Sheet Asli</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
