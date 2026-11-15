import { SUBJECTS, type SubjectId } from '../data/subjects';
import type { Deadline } from '../data/deadlines';
import type { Topic } from '../data/topics';
import { activeExamTopics, allTopics, courseworkTopics } from './catalog';
import { addDays, diffDays, isWeekday, nextWeekday, prevWeekday, weekStart, weekdaysOfWeek } from './dates';
import { MAY_REVIEW_START } from './defaults';
import { isWeak } from './schedule';
import type { AppState, DayPlan } from './types';

// ---------------------------------------------------------------------------
// Seeded RNG so a given state + date always plans the same way (helps tests).
// Day stability itself comes from storing the plan, not from the seed.
// ---------------------------------------------------------------------------
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Deadline boost
// ---------------------------------------------------------------------------
export const BOOST_WINDOW = 28;

/** ×1.5 at 4 weeks out, ramping to ×2.5 in the final week. 1 outside the window or after the deadline. */
export function boostMultiplier(date: string, deadlineDate: string): number {
  const d = diffDays(deadlineDate, date);
  if (d < 0 || d > BOOST_WINDOW) return 1;
  if (d <= 7) return 2.5;
  return 1.5 + ((BOOST_WINDOW - d) / (BOOST_WINDOW - 7)) * 1.0;
}

export function activeBoost(subject: SubjectId, date: string, deadlines: Deadline[]): { multiplier: number; deadline?: Deadline } {
  let best: { multiplier: number; deadline?: Deadline } = { multiplier: 1 };
  for (const d of deadlines) {
    if (d.subject !== subject || d.kind === 'exam') continue;
    const m = boostMultiplier(date, d.date);
    if (m > best.multiplier) best = { multiplier: m, deadline: d };
  }
  return best;
}

/** Chance that a boosted coursework deadline takes one of the day's two slots. */
export function courseworkSlotChance(date: string, deadlineDate: string): number {
  const d = diffDays(deadlineDate, date);
  if (d < 0 || d > BOOST_WINDOW) return 0;
  if (d <= 7) return 1;
  return 0.4 + ((BOOST_WINDOW - d) / (BOOST_WINDOW - 7)) * 0.6;
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------
type Tier = 'priority' | 'new' | 'review';

interface Ctx {
  state: AppState;
  date: string;
  exam: Topic[];
  plannedThisWeek: Set<string>;
  recentPicked: Set<string>;
  recentSubjects: SubjectId[][]; // previous weekdays, most recent first
  weekdaysSinceIrish: number;
  rand: () => number;
}

function tierOf(t: Topic, ctx: Ctx): { tier: Tier; overdue: number } | null {
  const p = ctx.state.progress[t.id];
  if (!p || p.ratings.length === 0) return { tier: 'new', overdue: 0 };
  if (p.retired) {
    if (ctx.state.settings.mayReview && ctx.date >= MAY_REVIEW_START && !p.finalReviewDone) return { tier: 'review', overdue: 0 };
    return null;
  }
  if (!p.due || p.due > ctx.date) return null;
  const overdue = diffDays(ctx.date, p.due);
  return { tier: (p.priority ?? 0) >= 1 || isWeak(p) ? 'priority' : 'review', overdue };
}

export function candidatesFor(subject: SubjectId, ctx: Ctx): Record<Tier, { t: Topic; overdue: number }[]> {
  const out: Record<Tier, { t: Topic; overdue: number }[]> = { priority: [], new: [], review: [] };
  let pool = ctx.exam.filter((t) => t.subject === subject && !ctx.plannedThisWeek.has(t.id));
  // Irish oral boost pulls from oral topics.
  const boost = activeBoost(subject, ctx.date, ctx.state.settings.deadlines);
  if (boost.deadline?.kind === 'oral') {
    const oral = pool.filter((t) => t.kind === 'oral');
    if (oral.length) pool = oral;
  }
  for (const t of pool) {
    const r = tierOf(t, ctx);
    if (r) out[r.tier].push({ t, overdue: r.overdue });
  }
  // Prefer topics not shown in the last couple of weeks (e.g. picked but never rated).
  for (const k of Object.keys(out) as Tier[]) {
    const fresh = out[k].filter((c) => !ctx.recentPicked.has(c.t.id));
    if (fresh.length) out[k] = fresh;
  }
  return out;
}

function chooseTopic(subject: SubjectId, ctx: Ctx): Topic | null {
  const c = candidatesFor(subject, ctx);
  const byOverdue = (xs: { t: Topic; overdue: number }[]) => [...xs].sort((a, b) => b.overdue - a.overdue)[0]?.t ?? null;
  const randomOf = (xs: { t: Topic }[]) => (xs.length ? xs[Math.floor(ctx.rand() * xs.length)].t : null);
  if (c.priority.length) return byOverdue(c.priority);
  // New topics first, until the subject's new pool runs low (< 3 left), then mix in reviews.
  if (c.new.length >= 3 || (c.new.length && !c.review.length)) return randomOf(c.new);
  if (c.new.length && c.review.length) return ctx.rand() < 0.5 ? randomOf(c.new) : byOverdue(c.review);
  return byOverdue(c.review);
}

function hasCandidates(subject: SubjectId, ctx: Ctx): boolean {
  const c = candidatesFor(subject, ctx);
  return c.priority.length + c.new.length + c.review.length > 0;
}

export function subjectWeight(subject: SubjectId, ctx: Ctx): number {
  const s = ctx.state.settings;
  let w = s.weights[subject] ?? 1;
  const boost = activeBoost(subject, ctx.date, s.deadlines);
  w *= boost.multiplier;
  // Variety: same subject on 3 weekdays in a row only if a deadline demands it.
  const [d1, d2] = ctx.recentSubjects;
  if (boost.multiplier === 1 && d1?.includes(subject) && d2?.includes(subject)) w *= 0.05;
  // Irish floor: guarantee it shows up at least every ~2 weeks.
  if (subject === 'irish' && w > 0 && ctx.weekdaysSinceIrish >= 10) w *= 20;
  return w;
}

function weightedPick(items: { id: SubjectId; w: number }[], rand: () => number): SubjectId | null {
  const total = items.reduce((a, b) => a + b.w, 0);
  if (total <= 0) return null;
  let r = rand() * total;
  for (const it of items) {
    r -= it.w;
    if (r < 0) return it.id;
  }
  return items[items.length - 1].id;
}

function pickCoursework(ctx: Ctx): Topic | null {
  const s = ctx.state.settings;
  // Nearest boosted coursework deadline.
  const live = s.deadlines
    .filter((d) => d.kind === 'coursework' && d.subject && d.tasks.length)
    .map((d) => ({ d, chance: courseworkSlotChance(ctx.date, d.date) }))
    .filter((x) => x.chance > 0)
    .sort((a, b) => a.d.date.localeCompare(b.d.date));
  if (!live.length) return null;
  const { d, chance } = live[0];
  if (ctx.rand() >= chance) return null;
  const tasks = courseworkTopics([d]).filter((t) => !s.disabledTopics.includes(t.id) && !ctx.plannedThisWeek.has(t.id));
  if (!tasks.length) return null;
  // Least recently rated first (never-rated tasks first, in order).
  const lastDate = (id: string) => ctx.state.progress[id]?.ratings.at(-1)?.date ?? '';
  return [...tasks].sort((a, b) => lastDate(a.id).localeCompare(lastDate(b.id)))[0];
}

export function planDay(ctx: Ctx): DayPlan {
  const picks: Topic[] = [];
  const cw = pickCoursework(ctx);
  if (cw) picks.push(cw);
  while (picks.length < 2) {
    const used = new Set(picks.map((p) => p.subject));
    const items = SUBJECTS.filter((s) => !used.has(s.id) && hasCandidates(s.id, ctx)).map((s) => ({ id: s.id, w: subjectWeight(s.id, ctx) }));
    const subject = weightedPick(items, ctx.rand);
    if (!subject) break;
    const t = chooseTopic(subject, ctx);
    if (!t) break;
    picks.push(t);
    ctx.plannedThisWeek.add(t.id);
  }
  return { date: ctx.date, picks: picks.map((t) => ({ topicId: t.id })) };
}

function subjectsOf(state: AppState, plan: DayPlan | undefined, topicSubject: Map<string, SubjectId>): SubjectId[] {
  return plan ? plan.picks.map((p) => topicSubject.get(p.topicId)).filter(Boolean) as SubjectId[] : [];
}

function buildCtx(state: AppState, date: string, topicSubject: Map<string, SubjectId>, exam: Topic[]): Ctx {
  const monday = weekStart(date);
  const plannedThisWeek = new Set<string>();
  for (const d of weekdaysOfWeek(monday)) if (d !== date) state.plans[d]?.picks.forEach((p) => plannedThisWeek.add(p.topicId));
  const recentPicked = new Set<string>();
  for (let i = 1; i <= 14; i++) state.plans[addDays(date, -i)]?.picks.forEach((p) => recentPicked.add(p.topicId));
  const recentSubjects: SubjectId[][] = [];
  let d = date;
  for (let i = 0; i < 2; i++) {
    d = prevWeekday(d);
    recentSubjects.push(subjectsOf(state, state.plans[d], topicSubject));
  }
  // Weekdays since Irish last appeared (only counting planned days).
  let since = 0;
  let x = date;
  for (let i = 0; i < 30; i++) {
    x = prevWeekday(x);
    const plan = state.plans[x];
    if (!plan) continue;
    if (subjectsOf(state, plan, topicSubject).includes('irish')) break;
    since++;
  }
  return { state, date, exam, plannedThisWeek, recentPicked, recentSubjects, weekdaysSinceIrish: since, rand: rng(`${date}|${Object.keys(state.progress).length}`) };
}

/**
 * Make sure plans exist for today and the rest of this week (weekday),
 * or the whole of next week (weekend, for the Monday preview).
 * Never touches existing plans. Returns a new state.
 */
export function ensurePlans(state: AppState, today: string): AppState {
  const days = isWeekday(today)
    ? weekdaysOfWeek(weekStart(today)).filter((d) => d >= today)
    : weekdaysOfWeek(weekStart(nextWeekday(today)));
  const missing = days.filter((d) => !state.plans[d]);
  if (!missing.length) return state;
  const exam = activeExamTopics(state.settings);
  const topicSubject = new Map(allTopics(state.settings).map((t) => [t.id, t.subject] as [string, SubjectId]));
  let next: AppState = { ...state, plans: { ...state.plans } };
  for (const d of missing) {
    next.plans[d] = planDay(buildCtx(next, d, topicSubject, exam));
  }
  return next;
}

/** Re-plan future days only (after a rating or settings change). Today and past days are never changed. */
export function replanFuture(state: AppState, today: string): AppState {
  const plans = { ...state.plans };
  for (const [d, p] of Object.entries(plans)) {
    if (d > today && !p.picks.some((x) => x.done)) delete plans[d];
  }
  return ensurePlans({ ...state, plans }, today);
}

/** Exposed for reroll: choose a same-subject replacement. */
export function replacementFor(state: AppState, date: string, subject: SubjectId, exclude: string[]): Topic | null {
  const exam = activeExamTopics(state.settings).filter((t) => !exclude.includes(t.id));
  const topicSubject = new Map(allTopics(state.settings).map((t) => [t.id, t.subject] as [string, SubjectId]));
  const ctx = buildCtx(state, date, topicSubject, exam);
  state.plans[date]?.picks.forEach((p) => ctx.plannedThisWeek.add(p.topicId));
  exclude.forEach((id) => ctx.plannedThisWeek.add(id));
  ctx.rand = rng(`${date}|reroll|${exclude.join(',')}`);
  return chooseTopic(subject, ctx);
}
