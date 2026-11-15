import type { AppState, DayPlan, TopicProgress } from './types';

/**
 * Merge two copies of the app state (e.g. phone and laptop, or device and server)
 * without losing ratings. Rules:
 * - Topic progress: keep the copy with more ratings (ratings are append-only).
 * - Today/past plans: keep the copy with more topics done; on a tie keep `stored`
 *   (so the plan a morning notification announced stays put).
 * - Future plans: take them from whichever state was edited most recently.
 * - Settings: from whichever state was edited most recently.
 * - Reroll and focus logs: union.
 */
export function mergeStates(incoming: AppState, stored: AppState | null, today: string): AppState {
  if (!stored) return incoming;
  const newer = incoming.updatedAt >= stored.updatedAt ? incoming : stored;

  const progress: Record<string, TopicProgress> = { ...stored.progress };
  for (const [id, p] of Object.entries(incoming.progress)) {
    const s = stored.progress[id];
    if (!s) progress[id] = p;
    else if (p.ratings.length > s.ratings.length) progress[id] = p;
    else if (p.ratings.length === s.ratings.length && (p.ratings.at(-1)?.date ?? '') > (s.ratings.at(-1)?.date ?? '')) progress[id] = p;
  }

  const plans: Record<string, DayPlan> = {};
  const dates = new Set([...Object.keys(stored.plans), ...Object.keys(incoming.plans)]);
  const doneCount = (p?: DayPlan) => p?.picks.filter((x) => x.done).length ?? -1;
  for (const d of dates) {
    const a = incoming.plans[d];
    const b = stored.plans[d];
    if (!a || !b) {
      // Future days missing from the newer copy were deliberately re-planned away.
      if (d > today && !(newer.plans[d])) continue;
      plans[d] = (a ?? b)!;
      continue;
    }
    if (d > today && doneCount(a) === doneCount(b)) plans[d] = newer.plans[d];
    else plans[d] = doneCount(a) > doneCount(b) ? a : b;
  }

  const key = (o: object) => JSON.stringify(o);
  const union = <T extends object>(x: T[], y: T[]) => {
    const seen = new Set(x.map(key));
    return [...x, ...y.filter((e) => !seen.has(key(e)))];
  };

  return {
    version: 1,
    settings: newer.settings,
    progress,
    plans,
    rerolls: union(stored.rerolls, incoming.rerolls).sort((a, b) => a.date.localeCompare(b.date)),
    focusLog: union(stored.focusLog, incoming.focusLog).sort((a, b) => a.date.localeCompare(b.date)),
    updatedAt: Math.max(incoming.updatedAt, stored.updatedAt),
  };
}
