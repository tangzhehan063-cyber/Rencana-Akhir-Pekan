import { useMemo, useState } from 'react';
import { ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
import { ScheduleItem } from '../types/schedule';
import { formatIdr } from '../utils/currency';
import { isoToDmy, timeToMinutes } from '../utils/csv';
import { StatusControl } from './StatusControl';

interface SheetTableViewProps {
  items: ScheduleItem[];
  onCycleStatus: (id: string) => void;
  onEditItem: (item: ScheduleItem) => void;
  onDeleteItem: (id: string) => void;
  onCopyTsv: () => void;
}

type SortKey =
  | 'date'
  | 'durasi'
  | 'jamMulai'
  | 'lokasi'
  | 'kategori'
  | 'pengeluaranReal'
  | 'pemilik'
  | 'result';

export function SheetTableView({
  items,
  onCycleStatus,
  onEditItem,
  onDeleteItem,
  onCopyTsv,
}: SheetTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [sparseDates, setSparseDates] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedItems = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') {
        cmp = a.dateIso.localeCompare(b.dateIso);
        if (cmp === 0) cmp = timeToMinutes(a.jamMulai) - timeToMinutes(b.jamMulai);
      } else if (sortKey === 'durasi') {
        cmp = a.durasi - b.durasi;
      } else if (sortKey === 'jamMulai') {
        cmp = timeToMinutes(a.jamMulai) - timeToMinutes(b.jamMulai);
      } else if (sortKey === 'lokasi') {
        cmp = a.lokasi.localeCompare(b.lokasi);
      } else if (sortKey === 'kategori') {
        cmp = a.kategori.localeCompare(b.kategori);
      } else if (sortKey === 'pengeluaranReal') {
        cmp = (a.pengeluaranReal ?? -1) - (b.pengeluaranReal ?? -1);
      } else if (sortKey === 'pemilik') {
        cmp = a.pemilik.localeCompare(b.pemilik);
      } else if (sortKey === 'result') {
        cmp = a.result.localeCompare(b.result);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  let lastShownDate = '';

  const renderSortHeader = (label: string, key: SortKey, alignRight = false) => (
    <th
      scope="col"
      className={`px-3 py-2.5 text-xs font-semibold text-slate-600 whitespace-nowrap select-none ${
        alignRight ? 'text-right' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={() => handleSort(key)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 transition-colors ${
          alignRight ? 'flex-row-reverse' : ''
        }`}
      >
        <span>{label}</span>
        <ArrowUpDown
          className={`w-3 h-3 ${sortKey === key ? 'text-blue-600' : 'text-slate-400'}`}
          aria-hidden="true"
        />
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Data Spreadsheet (Travel_Planning)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {sortedItems.length} baris · Klik status Result untuk mengubah langsung
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sparseDates}
              onChange={(e) => setSparseDates(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            <span>Gabung sel tanggal berulang</span>
          </label>

          <button
            type="button"
            onClick={onCopyTsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Salin Tabel (TSV)
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-xs font-mono font-medium text-slate-400 w-10 text-right">
                  #
                </th>
                {renderSortHeader('Waktu mulai', 'date')}
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Hari
                </th>
                {renderSortHeader('Durasi', 'durasi', true)}
                {renderSortHeader('Jam mulai', 'jamMulai')}
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Jam selesai
                </th>
                {renderSortHeader('Lokasi', 'lokasi')}
                {renderSortHeader('Kategori', 'kategori')}
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Estimasi Maps
                </th>
                {renderSortHeader('Pengeluaran Real', 'pengeluaranReal', true)}
                {renderSortHeader('Pemilik', 'pemilik')}
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Catatan
                </th>
                {renderSortHeader('Result', 'result')}
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Plan
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 text-right whitespace-nowrap">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center text-sm text-slate-500">
                    Tidak ada baris data yang ditampilkan.
                  </td>
                </tr>
              ) : (
                sortedItems.map((item, idx) => {
                  const showDateCell =
                    !sparseDates || sortKey !== 'date' || item.dateIso !== lastShownDate;
                  lastShownDate = item.dateIso;
                  const mapsEstimate = item.mapsPriceRangeLabel || item.mapsPriceLevel;

                  return (
                    <tr
                      key={item.id}
                      className="h-10 hover:bg-slate-50/80 transition-colors duration-100"
                    >
                      <td className="px-3 py-2 text-xs font-mono tabular-nums text-slate-400 text-right">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                        {showDateCell ? isoToDmy(item.dateIso) : ''}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
                        {item.hari}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-xs text-slate-700 text-right whitespace-nowrap">
                        {item.durasi}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                        {item.jamMulai}:00
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                        {item.jamSelesai}:00
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-900 font-medium max-w-[200px] truncate">
                        {item.lokasi || <span className="text-slate-400 font-normal">—</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
                        {item.kategori}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {mapsEstimate || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-xs text-slate-900 font-medium text-right whitespace-nowrap">
                        {item.pengeluaranReal !== undefined ? (
                          formatIdr(item.pengeluaranReal)
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
                        {item.pemilik || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 max-w-[180px] truncate">
                        {item.catatan || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusControl
                          status={item.result}
                          onClick={() => onCycleStatus(item.id)}
                          compact
                        />
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-blue-700 whitespace-nowrap">
                        {item.plan || <span className="text-slate-400 font-normal">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            aria-label="Edit baris"
                            className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            aria-label="Hapus baris"
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
