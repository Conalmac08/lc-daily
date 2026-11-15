import { useEffect, useState, type ReactNode } from 'react';
import { SUBJECT_BY_ID, type SubjectId } from '../data/subjects';

export function useHash(): string {
  const [h, setH] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => {
      setH(location.hash.slice(1) || '/');
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return h;
}
export const go = (path: string) => (location.hash = path);

export function SubjectTag({ subject, small }: { subject: SubjectId; small?: boolean }) {
  const s = SUBJECT_BY_ID[subject];
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${small ? 'text-xs' : 'text-sm'}`} style={{ color: s.color }}>
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
      {s.name} <span className="font-normal opacity-70">{s.level}</span>
    </span>
  );
}

export function Card({ children, className = '', accent, onClick }: { children: ReactNode; className?: string; accent?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`block w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${onClick ? 'transition active:scale-[0.99] hover:ring-slate-300 dark:hover:ring-slate-700' : ''} ${className}`}
      style={accent ? { borderLeft: `5px solid ${accent}` } : undefined}
    >
      {children}
    </Tag>
  );
}

export function Stars({ value, onChange, size = 'text-3xl' }: { value: number; onChange?: (n: number) => void; size?: string }) {
  return (
    <div className="flex gap-1" role={onChange ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange?.(n)}
          className={`${size} leading-none transition ${n <= value ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'} ${onChange ? 'p-1 active:scale-90' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, color, label }: { value: number; color: string; label?: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop pb-safe w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Button({ children, onClick, variant = 'primary', className = '', disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'subtle' | 'danger'; className?: string; disabled?: boolean; type?: 'button' | 'submit' }) {
  const styles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
    subtle: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  }[variant];
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`min-h-11 rounded-xl px-4 py-2.5 font-semibold transition active:scale-[0.98] disabled:opacity-40 ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function PageTitle({ children, back }: { children: ReactNode; back?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {back && (
        <button onClick={() => history.back()} className="-ml-2 rounded-full p-2 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Back">
          ←
        </button>
      )}
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
    </div>
  );
}

export const COVERAGE_STYLE: Record<string, { bg: string; label: string }> = {
  none: { bg: 'bg-slate-200 dark:bg-slate-800', label: 'Not started' },
  weak: { bg: 'bg-rose-500', label: '1–2★ / weak' },
  okay: { bg: 'bg-amber-400', label: '3★' },
  solid: { bg: 'bg-green-400', label: '4★' },
  mastered: { bg: 'bg-green-700', label: '5★ retired' },
};
