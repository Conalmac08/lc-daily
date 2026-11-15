import { useStore } from '../state/store';
import { isWeekday, nextWeekday, prettyDate, weekStart, weekdaysOfWeek } from '../engine/dates';
import { dayComplete } from '../engine/actions';
import { PageTitle } from './common';
import { TopicCard } from './Home';

export function Week() {
  const { state, today } = useStore();
  const monday = weekStart(isWeekday(today) ? today : nextWeekday(today));
  const days = weekdaysOfWeek(monday);
  return (
    <div>
      <PageTitle>{isWeekday(today) ? 'This week' : 'Next week'}</PageTitle>
      <div className="space-y-5">
        {days.map((d) => {
          const plan = state.plans[d];
          const done = dayComplete(plan);
          const isToday = d === today;
          return (
            <section key={d}>
              <h2 className={`mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase ${isToday ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                {done ? '✅' : d < today ? '⭕' : isToday ? '👉' : '•'} {prettyDate(d, { weekday: 'long', day: 'numeric', month: 'short' })}
                {isToday && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-white dark:bg-white dark:text-slate-900">TODAY</span>}
              </h2>
              {plan ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {plan.picks.map((p) => (
                    <TopicCard key={p.topicId} date={d} pick={p} compact />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{d < today ? 'Missed — app not opened' : 'Not planned yet'}</p>
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-slate-400">Future days can change after you rate topics. Today never changes.</p>
    </div>
  );
}
