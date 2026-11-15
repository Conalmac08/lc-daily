import { useStore } from '../state/store';
import { useTimer, fmtMs } from '../state/timer';
import { SUBJECT_BY_ID } from '../data/subjects';
import { Button, PageTitle } from './common';

export function TimerScreen() {
  const { state, topics } = useStore();
  const { timer, remaining, start, pause, resume, stop } = useTimer();
  const topic = timer?.topicId ? topics.get(timer.topicId) : undefined;
  const color = timer?.subject ? SUBJECT_BY_ID[timer.subject].color : '#64748b';
  const frac = timer ? 1 - remaining / timer.totalMs : 0;
  const R = 120;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center">
      <div className="self-stretch">
        <PageTitle back>Focus</PageTitle>
      </div>
      {topic && <p className="mb-2 text-center font-semibold" style={{ color }}>{topic.label}</p>}
      <div className="relative my-4">
        <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90">
          <circle cx="140" cy="140" r={R} fill="none" strokeWidth="14" className="stroke-slate-200 dark:stroke-slate-800" />
          <circle cx="140" cy="140" r={R} fill="none" strokeWidth="14" stroke={timer?.phase === 'break' ? '#10b981' : color} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: 'stroke-dashoffset 0.5s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-6xl font-bold tabular-nums">{timer ? fmtMs(remaining) : `${state.settings.focusMinutes}:00`}</div>
          <div className="mt-1 text-sm font-semibold tracking-wide text-slate-500 uppercase">{timer ? (timer.phase === 'focus' ? (timer.endsAt ? 'Focus' : 'Paused') : 'Break ☕') : 'Ready'}</div>
        </div>
      </div>
      <div className="flex w-full max-w-sm gap-3">
        {!timer && (
          <Button className="flex-1 py-4 text-lg" onClick={() => start(null, null)}>
            Start {state.settings.focusMinutes} min
          </Button>
        )}
        {timer && (timer.endsAt ? <Button className="flex-1" variant="subtle" onClick={pause}>Pause</Button> : <Button className="flex-1" onClick={resume}>Resume</Button>)}
        {timer && <Button className="flex-1" variant="ghost" onClick={stop}>{timer.phase === 'break' ? 'Skip break' : 'Stop'}</Button>}
      </div>
      <p className="mt-6 max-w-sm text-center text-sm text-slate-500">
        {state.settings.focusMinutes} min focus, then a {state.settings.breakMinutes} min break. The timer keeps running if you switch apps; you'll hear a chime at the end.
      </p>
    </div>
  );
}
