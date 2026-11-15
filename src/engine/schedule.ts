import { addDays } from './dates';
import type { Rating, TopicProgress } from './types';

/** Baseline intervals in days. 5★ = retired. */
export const BASE_INTERVAL: Record<number, number> = { 1: 5, 2: 10, 3: 21, 4: 42 };

export interface Decision {
  intervalDays: number | null; // null = retired
  priority: number; // -1 | 0 | 1
  source: 'baseline' | 'ai';
  reason?: string;
}

export function baselineDecision(stars: number): Decision {
  if (stars >= 5) return { intervalDays: null, priority: 0, source: 'baseline' };
  return { intervalDays: BASE_INTERVAL[stars], priority: stars === 1 ? 1 : 0, source: 'baseline' };
}

/**
 * Validate and clamp a raw AI response. Guardrails live here, in code:
 * - 5★ stays retired whatever the AI says
 * - interval clamped to 50%–150% of baseline
 * - priority must be -1, 0 or 1
 * Returns the baseline if the response is unusable.
 */
export function clampAi(stars: number, raw: unknown): Decision {
  const base = baselineDecision(stars);
  if (stars >= 5) return base;
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  if (r.interval_days === null || r.interval_days === undefined || r.interval_days === '') return base;
  const interval = Number(r.interval_days);
  if (!Number.isFinite(interval)) return base;
  const b = BASE_INTERVAL[stars];
  const clamped = Math.round(Math.min(b * 1.5, Math.max(b * 0.5, interval)));
  const p = Number(r.priority);
  const priority = p === -1 || p === 0 || p === 1 ? p : 0;
  const reason = typeof r.reason === 'string' ? r.reason.slice(0, 200) : undefined;
  return { intervalDays: clamped, priority, source: 'ai', reason };
}

export function applyRating(
  prev: TopicProgress | undefined,
  date: string,
  stars: number,
  decision: Decision,
  note?: string,
  opts: { finalReview?: boolean } = {},
): TopicProgress {
  const rating: Rating = {
    date,
    stars,
    note: note?.trim() || undefined,
    intervalDays: decision.intervalDays,
    priority: decision.priority,
    source: decision.source,
    aiReason: decision.reason,
  };
  const ratings = [...(prev?.ratings ?? []), rating];
  if (opts.finalReview) return { ...prev, ratings, retired: true, due: undefined, finalReviewDone: true };
  if (decision.intervalDays === null) return { ...prev, ratings, retired: true, due: undefined, priority: 0 };
  return { ...prev, ratings, retired: false, due: addDays(date, decision.intervalDays), priority: decision.priority };
}

/** Rated low (1–2★) twice in a row. */
export function isWeak(p?: TopicProgress): boolean {
  if (!p || p.ratings.length < 2) return false;
  const [a, b] = p.ratings.slice(-2);
  return a.stars <= 2 && b.stars <= 2;
}

export function lastStars(p?: TopicProgress): number | null {
  return p && p.ratings.length ? p.ratings[p.ratings.length - 1].stars : null;
}
