import { useStore } from '../state/store';
import { SUBJECT_BY_ID } from '../data/subjects';
import { prettyDate } from '../engine/dates';
import { daysUntil } from '../engine/actions';
import { activeBoost } from '../engine/select';
import { Card, PageTitle } from './common';

export function Deadlines() {
  const { state, today } = useStore();
  const list = [...state.settings.deadlines].sort((a, b) => a.date.localeCompare(b.date));
  const exams = list.find((d) => d.kind === 'exam');
  return (
    <div className="space-y-4">
      <PageTitle>Deadlines</PageTitle>
      {exams && (
        <Card className="bg-slate-900 text-center text-white dark:bg-white dark:text-slate-900">
          <div className="text-sm opacity-70">{exams.name}</div>
          <div className="text-5xl font-bold">{Math.max(0, daysUntil(today, exams.date))}</div>
          <div className="text-sm opacity-70">days · {prettyDate(exams.date, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </Card>
      )}
      {list
        .filter((d) => d.kind !== 'exam')
        .map((d) => {
          const days = daysUntil(today, d.date);
          const past = (d.endDate ?? d.date) < today;
          const meta = d.subject ? SUBJECT_BY_ID[d.subject] : null;
          const boost = d.subject ? activeBoost(d.subject, today, [d]).multiplier : 1;
          return (
            <Card key={d.id} accent={meta?.color} className={past ? 'opacity-50' : ''}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold">{d.name}</div>
                  <div className="text-sm text-slate-500">
                    {meta?.name} · {d.weightNote} · {prettyDate(d.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {d.endDate && `–${prettyDate(d.endDate, { day: 'numeric', month: 'short' })}`}
                  </div>
                  {boost > 1 && <div className="mt-1 text-xs font-semibold text-amber-600">⚡ Boosted ×{boost.toFixed(1)} — coming up more often</div>}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: meta?.color }}>
                    {past ? '✓' : Math.max(0, days)}
                  </div>
                  <div className="text-xs text-slate-500">{past ? 'passed' : 'days'}</div>
                </div>
              </div>
            </Card>
          );
        })}
      <p className="text-center text-xs text-slate-400">Dates are provisional. Check them with your teachers and edit them in Settings.</p>
    </div>
  );
}
