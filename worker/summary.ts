import { SUBJECT_BY_ID } from '../src/data/subjects';
import { topicMap } from '../src/engine/catalog';
import { diffDays, isWeekday, nextWeekday, todayDublin } from '../src/engine/dates';
import { currentStreak } from '../src/engine/actions';
import { ensurePlans } from '../src/engine/select';
import { mergeStates } from '../src/engine/merge';
import type { AppState } from '../src/engine/types';
import type { Env } from './env';

export async function loadState(env: Env): Promise<AppState | null> {
  return env.KV.get<AppState>('state', 'json');
}

export async function saveMerged(env: Env, incoming: AppState): Promise<AppState> {
  const stored = await loadState(env);
  const merged = mergeStates(incoming, stored, todayDublin());
  await env.KV.put('state', JSON.stringify(merged));
  return merged;
}

export interface Summary {
  date: string; // the day the topics are for
  isToday: boolean; // false at weekends (showing Monday)
  streak: number;
  topics: { subject: string; subjectName: string; color: string; label: string; done: boolean }[];
  nextDeadline: { name: string; days: number } | null;
}

/** Today's topics + streak. Plans the day server-side if the app hasn't yet (so 7am notifications work). */
export async function todaySummary(env: Env): Promise<Summary | null> {
  let state = await loadState(env);
  if (!state) return null;
  const today = todayDublin();
  const day = isWeekday(today) ? today : nextWeekday(today);
  if (!state.plans[day]) {
    const planned = ensurePlans(state, today);
    state = await saveMerged(env, planned);
  }
  const topics = topicMap(state.settings);
  const plan = state.plans[day];
  const next = state.settings.deadlines
    .filter((d) => (d.endDate ?? d.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return {
    date: day,
    isToday: day === today,
    streak: currentStreak(state.plans, today),
    topics: (plan?.picks ?? []).map((p) => {
      const t = topics.get(p.topicId);
      const s = t ? SUBJECT_BY_ID[t.subject] : null;
      return { subject: t?.subject ?? '', subjectName: s?.name ?? '', color: s?.color ?? '#64748b', label: t?.label ?? p.topicId, done: !!p.done };
    }),
    nextDeadline: next ? { name: next.name, days: Math.max(0, diffDays(next.date, today)) } : null,
  };
}

export function notificationFor(s: Summary): { title: string; body: string; url: string } {
  const streak = s.streak > 0 ? `🔥 ${s.streak}-day streak` : '🌱 Start a streak today';
  const body = s.topics.map((t) => `${t.subjectName} · ${t.label}`).join('\n');
  return { title: `${streak} · LC Daily`, body: body || 'Open the app to see today’s topics.', url: '/' };
}
