import { SUBJECTS, type SubjectId } from '../data/subjects';
import { activeExamTopics, topicMap } from './catalog';
import { addDays, diffDays, isWeekday, prevWeekday, weekStart } from './dates';
import { MAY_REVIEW_START } from './defaults';
import { applyRating, isWeak, lastStars, type Decision } from './schedule';
import { replacementFor, replanFuture } from './select';
import type { AppState, DayPlan, RerollReason } from './types';

const touch = (s: AppState): AppState => ({ ...s, updatedAt: Date.now() });

/** Record a rating for a topic that appears in a plan, then re-plan future days. */
export function rateTopic(state: AppState, today: string, planDate: string, topicId: string, stars: number, decision: Decision, note?: string): AppState {
  const plan = state.plans[planDate];
  if (!plan) return state;
  const prev = state.progress[topicId];
  const finalReview = !!(prev?.retired && state.settings.mayReview && today >= MAY_REVIEW_START && !prev.finalReviewDone);
  const progress = { ...state.progress, [topicId]: applyRating(prev, today, stars, decision, note, { finalReview }) };
  const newPlan: DayPlan = { ...plan, picks: plan.picks.map((p) => (p.topicId === topicId ? { ...p, done: true, stars } : p)) };
  const next = { ...state, progress, plans: { ...state.plans, [planDate]: newPlan } };
  return touch(replanFuture(next, today));
}

// ---------------------------------------------------------------------------
// Reroll — emergency only: 1 per week, same subject, reason required.
// ---------------------------------------------------------------------------
export const REROLLS_PER_WEEK = 1;

export function rerollsLeft(state: AppState, today: string): number {
  const monday = weekStart(today);
  const used = state.rerolls.filter((r) => r.date >= monday && r.date <= addDays(monday, 6)).length;
  return Math.max(0, REROLLS_PER_WEEK - used);
}

export function rerollTopic(
  state: AppState,
  today: string,
  planDate: string,
  topicId: string,
  reason: RerollReason,
  disable: boolean,
): { state: AppState; error?: string } {
  if (rerollsLeft(state, today) <= 0) return { state, error: "You've used this week's reroll. It resets on Monday." };
  const plan = state.plans[planDate];
  const pick = plan?.picks.find((p) => p.topicId === topicId);
  if (!plan || !pick) return { state, error: 'Topic not found in that day.' };
  if (pick.done) return { state, error: 'This topic is already done.' };
  const topic = topicMap(state.settings).get(topicId);
  if (!topic) return { state, error: 'Unknown topic.' };
  let settings = state.settings;
  if (disable && reason === 'not-on-course') settings = { ...settings, disabledTopics: [...new Set([...settings.disabledTopics, topicId])] };
  const base = { ...state, settings };
  let replacement;
  if (topic.kind === 'coursework') {
    // Swap to another task from the same project.
    const planned = new Set(Object.values(base.plans).flatMap((p) => (p.date >= weekStart(planDate) ? p.picks.map((x) => x.topicId) : [])));
    replacement = [...topicMap(settings).values()].find(
      (t) => t.kind === 'coursework' && t.area === topic.area && t.id !== topicId && !planned.has(t.id) && !settings.disabledTopics.includes(t.id),
    );
  } else {
    replacement = replacementFor(base, planDate, topic.subject, [topicId]);
  }
  if (!replacement) return { state, error: `No other ${SUBJECTS.find((s) => s.id === topic.subject)?.name} topic is available to swap in.` };
  const newPlan: DayPlan = { ...plan, picks: plan.picks.map((p) => (p.topicId === topicId ? { topicId: replacement.id, rerolledFrom: topicId } : p)) };
  const next: AppState = {
    ...base,
    plans: { ...base.plans, [planDate]: newPlan },
    rerolls: [...base.rerolls, { date: today, fromTopicId: topicId, toTopicId: replacement.id, reason, disabled: disable && reason === 'not-on-course' }],
  };
  return { state: touch(replanFuture(next, today)) };
}

// ---------------------------------------------------------------------------
// Streaks — consecutive weekdays with both topics done. Weekends are skipped.
// ---------------------------------------------------------------------------
export function dayComplete(plan?: DayPlan): boolean {
  return !!plan && plan.picks.length > 0 && plan.picks.every((p) => p.done);
}

export function currentStreak(plans: Record<string, DayPlan>, today: string): number {
  let d = today;
  if (!isWeekday(d) || !dayComplete(plans[d])) d = prevWeekday(d);
  let n = 0;
  while (dayComplete(plans[d])) {
    n++;
    d = prevWeekday(d);
  }
  return n;
}

export function bestStreak(plans: Record<string, DayPlan>, today: string): number {
  const dates = Object.keys(plans).sort();
  if (!dates.length) return 0;
  let best = 0;
  let run = 0;
  for (let d = dates[0]; d <= today; d = addDays(d, 1)) {
    if (!isWeekday(d)) continue;
    if (dayComplete(plans[d])) best = Math.max(best, ++run);
    else if (d < today) run = 0;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Progress stats
// ---------------------------------------------------------------------------
export interface SubjectStats {
  subject: SubjectId;
  total: number;
  studied: number;
  strong: number; // last rating 4–5★
  weak: number;
}

export function subjectStats(state: AppState): SubjectStats[] {
  const topics = activeExamTopics(state.settings);
  return SUBJECTS.map((s) => {
    const ts = topics.filter((t) => t.subject === s.id);
    const studied = ts.filter((t) => (state.progress[t.id]?.ratings.length ?? 0) > 0);
    return {
      subject: s.id,
      total: ts.length,
      studied: studied.length,
      strong: studied.filter((t) => (lastStars(state.progress[t.id]) ?? 0) >= 4).length,
      weak: studied.filter((t) => isWeak(state.progress[t.id])).length,
    };
  });
}

export type Coverage = 'none' | 'weak' | 'okay' | 'solid' | 'mastered';
export function coverageOf(state: AppState, topicId: string): Coverage {
  const p = state.progress[topicId];
  const s = lastStars(p);
  if (s === null) return 'none';
  if (isWeak(p) || s <= 2) return 'weak';
  if (s === 3) return 'okay';
  if (s === 4) return 'solid';
  return 'mastered';
}

export function daysUntil(today: string, date: string): number {
  return diffDays(date, today);
}
