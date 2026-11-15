import { useState } from 'react';
import { useStore } from '../state/store';
import { SUBJECTS, SUBJECT_BY_ID, type SubjectId } from '../data/subjects';
import { activeExamTopics } from '../engine/catalog';
import { coverageOf, subjectStats } from '../engine/actions';
import { Card, COVERAGE_STYLE, PageTitle, ProgressBar, go } from './common';

export function ProgressScreen() {
  const { state, today } = useStore();
  const [filter, setFilter] = useState<SubjectId | 'all'>('all');
  const stats = subjectStats(state);
  const topics = activeExamTopics(state.settings);
  const focusBySubject = state.focusLog.reduce<Record<string, number>>((acc, f) => {
    const k = f.subject ?? 'other';
    acc[k] = (acc[k] ?? 0) + f.minutes;
    return acc;
  }, {});
  const totalFocus = Object.values(focusBySubject).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageTitle>Progress</PageTitle>

      <section className="space-y-3">
        {stats.map((s) => {
          const meta = SUBJECT_BY_ID[s.subject];
          return (
            <Card key={s.subject}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-bold" style={{ color: meta.color }}>
                  {meta.name} <span className="text-xs font-normal text-slate-500">{meta.level} · target {meta.target}</span>
                </span>
                <span className="text-sm text-slate-500">
                  {s.studied}/{s.total} studied
                </span>
              </div>
              <ProgressBar value={s.total ? s.studied / s.total : 0} color={meta.color} label={`${meta.name} studied`} />
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1">
                  <ProgressBar value={s.total ? s.strong / s.total : 0} color="#16a34a" label={`${meta.name} at 4–5 stars`} />
                </div>
                <span className="w-28 text-right text-xs text-slate-500">{Math.round((s.total ? s.strong / s.total : 0) * 100)}% at 4–5★</span>
              </div>
              {(s.weak > 0 || focusBySubject[s.subject]) && (
                <div className="mt-2 flex gap-3 text-xs text-slate-500">
                  {s.weak > 0 && <span className="text-rose-600">{s.weak} weak</span>}
                  {focusBySubject[s.subject] && <span>🎯 {Math.round(focusBySubject[s.subject] / 60 * 10) / 10} h focused</span>}
                </div>
              )}
            </Card>
          );
        })}
        {totalFocus > 0 && <p className="text-center text-sm text-slate-500">Total focus time: {Math.round((totalFocus / 60) * 10) / 10} hours</p>}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Coverage map</h2>
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          {Object.entries(COVERAGE_STYLE).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded ${v.bg}`} /> {v.label}
            </span>
          ))}
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {(['all', ...SUBJECTS.map((s) => s.id)] as const).map((id) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${filter === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              {id === 'all' ? 'All' : SUBJECT_BY_ID[id].name}
            </button>
          ))}
        </div>
        <div className="space-y-5">
          {SUBJECTS.filter((s) => filter === 'all' || filter === s.id).map((s) => {
            const ts = topics.filter((t) => t.subject === s.id);
            const areas = [...new Set(ts.map((t) => t.area))];
            return (
              <div key={s.id}>
                <h3 className="mb-2 font-bold" style={{ color: s.color }}>
                  {s.name}
                </h3>
                <div className="space-y-2">
                  {areas.map((area) => (
                    <div key={area}>
                      <div className="mb-1 text-xs text-slate-500">{area}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {ts
                          .filter((t) => t.area === area)
                          .map((t) => {
                            const c = coverageOf(state, t.id);
                            return (
                              <button
                                key={t.id}
                                title={`${t.label} — ${COVERAGE_STYLE[c].label}`}
                                aria-label={`${t.label}: ${COVERAGE_STYLE[c].label}`}
                                onClick={() => go(`/topic/${today}/${encodeURIComponent(t.id)}`)}
                                className={`h-7 w-7 rounded-md ring-offset-2 transition hover:ring-2 hover:ring-slate-400 ${COVERAGE_STYLE[c].bg}`}
                              />
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
