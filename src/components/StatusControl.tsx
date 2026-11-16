import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { ResultStatus } from '../types/schedule';

interface StatusControlProps {
  status: ResultStatus;
  onClick?: () => void;
  compact?: boolean;
}

export function StatusControl({ status, onClick, compact = false }: StatusControlProps) {
  const config =
    status === 'Selesai'
      ? {
          icon: CheckCircle2,
          colorClass: 'text-emerald-700 hover:text-emerald-800',
          label: 'Selesai',
        }
      : status === 'Cancel'
      ? {
          icon: XCircle,
          colorClass: 'text-red-600 hover:text-red-700',
          label: 'Cancel',
        }
      : {
          icon: Clock,
          colorClass: 'text-amber-700 hover:text-amber-800',
          label: 'Rencana',
        };

  const Icon = config.icon;

  if (!onClick) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${config.colorClass}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{config.label}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Klik untuk ubah status (Rencana → Selesai → Cancel)"
      className={`inline-flex items-center gap-1.5 px-2 py-1 -mx-2 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${config.colorClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{compact ? config.label : config.label}</span>
    </button>
  );
}
