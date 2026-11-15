import { useStore } from '../state/store';
import { useTimer } from '../state/timer';
import { SUBJECT_BY_ID } from '../data/subjects';
import { isWeekday, nextWeekday, prettyDate } from '../engine/dates';
import { bestStreak, currentStreak, daysUntil } from '../engine/actions';
import { undecidedChoices } from '../engine/catalog';
import type { Pick } from '../engine/types';
import { Button, Card, Stars, SubjectTag, go } from './common';

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-IE', { hour: 'numeric', hour12: false, timeZone: 'Europe/Dublin' }).format(new Date()));
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function TopicCard({ date, pick, compact }: { date: string; pick: Pick; compact?: boolean }) {
  const { topics } = useStore();
  const t = topics.get(pick.topicId);
  if (!t) return <Card>Unknown topic ({pick.topicId})</Card>;
  const color = SUBJECT_BY_ID[t.subject].color;
  return (
    <Card accent={color} onClick={() => go(`/topic/${date}/${encodeURIComponent(t.id)}`)} className={compact ? 'p-3' : 'p-5'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SubjectTag subject={t.subject} small={compact} />
          <div className={`mt-1 font-bold leading-snug ${compact ? 'text-base' : 'text-xl'} ${pick.done ? 'text-slate-400 line-through decoration-2' : ''}`}>{t.label}</div>
          {t.kind === 'coursework' && <div className="mt-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Coursework task</div>}
        </div>
        {pick.done ? (
          <div className="shrink-0 text-right">
            <div className="text-2xl">✅</div>
            {pick.stars && <Stars value={pick.stars} size="text-xs" />}
          </div>
        ) : (
          <span className="shrink-0 text-2xl text-slate-300 dark:text-slate-600">›</span>
        )}
      </div>
    </Card>
  );
}

export function Home() {
  const { state, today, topics } = useStore();
  const { start, timer } = useTimer();
  const weekday = isWeekday(today);
  const showDate = weekday ? today : nextWeekday(today);
  const plan = state.plans[showDate];
  const streak = currentStreak(state.plans, today);
  const best = bestStreak(state.plans, today);
  const undecided = undecidedChoices(state.settings);
  const next = state.settings.deadlines
    .filter((d) => (d.endDate ?? d.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const allDone = weekday && plan?.picks.every((p) => p.done);
  const firstOpen = plan?.picks.find((p) => !p.done);

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <p className="text-sm font-medium text-slate-500">{prettyDate(today)}</p>
        <h1 className="text-3xl font-bold tracking-tight">{greeting()} 👋</h1>
      </header>

      <Card className="flex items-center gap-4">
        <div className="text-4xl">{streak > 0 ? '🔥' : '🌱'}</div>
        <div>
          <div className="text-2xl font-bold">
            {streak} weekday{streak === 1 ? '' : 's'}
          </div>
          <div className="text-sm text-slate-500">Current streak · best {best}</div>
        </div>
      </Card>

      {!weekday && (
        <Card className="bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950">
          <div className="text-lg font-bold">It's the weekend — rest up 😌</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Your streak is safe. Here's a sneak peek at Monday.</p>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">{weekday ? "Today's topics" : `Monday · ${prettyDate(showDate, { day: 'numeric', month: 'short' })}`}</h2>
        {plan?.picks.map((p) => <TopicCard key={p.topicId} date={showDate} pick={p} />)}
        {allDone && <p className="text-center font-semibold text-emerald-600 dark:text-emerald-400">Both done — nice work! 🎉 See you tomorrow.</p>}
      </section>

      {next && (
        <Card onClick={() => go('/deadlines')} className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Next deadline</div>
            <div className="font-bold">{next.name}</div>
            <div className="text-sm text-slate-500">{prettyDate(next.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: next.subject ? SUBJECT_BY_ID[next.subject].color : undefined }}>
              {Math.max(0, daysUntil(today, next.date))}
            </div>
            <div className="text-xs text-slate-500">days</div>
          </div>
        </Card>
      )}

      {weekday && !timer && (
        <Button
          className="w-full py-4 text-lg"
          onClick={() => {
            const t = firstOpen ? topics.get(firstOpen.topicId) : undefined;
            start(t?.subject ?? null, t?.id ?? null);
            go('/timer');
          }}
        >
          🎯 Start {state.settings.focusMinutes}-min focus
        </Button>
      )}

      {undecided.length > 0 && (
        <Card onClick={() => go('/settings')} className="border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="font-semibold text-amber-800 dark:text-amber-300">Course choices still to set</div>
          <div className="text-sm text-amber-700 dark:text-amber-400">{undecided.join(' · ')} — tap to set them in Settings.</div>
        </Card>
      )}
    </div>
  );
}
