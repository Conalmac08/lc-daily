import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SubjectId } from '../data/subjects';
import { useStore } from './store';

/** Timer is stored as an end timestamp, so it keeps correct time across tab switches and reloads. */
interface TimerData {
  phase: 'focus' | 'break';
  endsAt: number | null; // null when paused
  remainingMs: number; // used when paused
  totalMs: number;
  subject: SubjectId | null;
  topicId: string | null;
}

interface TimerApi {
  timer: TimerData | null;
  remaining: number;
  start: (subject: SubjectId | null, topicId: string | null) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const KEY = 'lc-daily-timer';
const Ctx = createContext<TimerApi | null>(null);

function chime() {
  try {
    const ac = new AudioContext();
    [660, 880, 990].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.2, ac.currentTime + i * 0.25 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + i * 0.25 + 0.6);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + i * 0.25);
      o.stop(ac.currentTime + i * 0.25 + 0.7);
    });
  } catch {
    /* audio not available */
  }
  navigator.vibrate?.([200, 100, 200]);
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { state, today, update } = useStore();
  const [timer, setTimer] = useState<TimerData | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (timer) localStorage.setItem(KEY, JSON.stringify(timer));
    else localStorage.removeItem(KEY);
  }, [timer]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const remaining = timer ? (timer.endsAt ? Math.max(0, timer.endsAt - now) : timer.remainingMs) : 0;

  // Phase finished.
  useEffect(() => {
    if (!timer || !timer.endsAt || timer.endsAt > now) return;
    chime();
    if (timer.phase === 'focus') {
      const minutes = Math.round(timer.totalMs / 60000);
      update((s) => ({ ...s, focusLog: [...s.focusLog, { date: today, subject: timer.subject, minutes }] }));
      const ms = state.settings.breakMinutes * 60000;
      setTimer({ ...timer, phase: 'break', endsAt: Date.now() + ms, remainingMs: ms, totalMs: ms });
      if (Notification?.permission === 'granted') new Notification('Focus block done 🎉', { body: `Take a ${state.settings.breakMinutes}-minute break.` });
    } else {
      setTimer(null);
      if (Notification?.permission === 'granted') new Notification('Break over', { body: 'Ready for another block?' });
    }
  }, [now, timer, state.settings.breakMinutes, today, update]);

  const start = useCallback(
    (subject: SubjectId | null, topicId: string | null) => {
      const ms = state.settings.focusMinutes * 60000;
      setTimer({ phase: 'focus', endsAt: Date.now() + ms, remainingMs: ms, totalMs: ms, subject, topicId });
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission();
    },
    [state.settings.focusMinutes],
  );
  const pause = useCallback(() => setTimer((t) => (t && t.endsAt ? { ...t, endsAt: null, remainingMs: Math.max(0, t.endsAt - Date.now()) } : t)), []);
  const resume = useCallback(() => setTimer((t) => (t && !t.endsAt ? { ...t, endsAt: Date.now() + t.remainingMs } : t)), []);
  const stop = useCallback(() => setTimer(null), []);

  return <Ctx.Provider value={{ timer, remaining, start, pause, resume, stop }}>{children}</Ctx.Provider>;
}

export function useTimer(): TimerApi {
  const t = useContext(Ctx);
  if (!t) throw new Error('useTimer outside provider');
  return t;
}

export const fmtMs = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
