import { describe, expect, it } from 'vitest';
import { addDays, isWeekday, prevWeekday, todayDublin, weekStart, weekday } from './dates';
import { BASE_INTERVAL, applyRating, baselineDecision, clampAi, isWeak } from './schedule';
import { boostMultiplier, courseworkSlotChance, ensurePlans } from './select';
import { bestStreak, currentStreak, rateTopic, rerollTopic, rerollsLeft } from './actions';
import { defaultState } from './defaults';
import { topicMap, activeExamTopics, settingSatisfied } from './catalog';
import { BASE_TOPICS } from '../data/topics';
import type { AppState, DayPlan } from './types';

const MON = '2026-11-16'; // a Monday

describe('dates (Europe/Dublin)', () => {
  it('uses Dublin local date, not UTC', () => {
    // 23:30 UTC on 24 Oct 2026 is 00:30 IST on 25 Oct (summer time)
    expect(todayDublin(new Date('2026-10-24T23:30:00Z'))).toBe('2026-10-25');
    // In winter Dublin = UTC
    expect(todayDublin(new Date('2026-11-16T23:30:00Z'))).toBe('2026-11-16');
  });
  it('handles DST change days', () => {
    // Clocks go forward 01:00 UTC 28 Mar 2027
    expect(todayDublin(new Date('2027-03-27T23:59:00Z'))).toBe('2027-03-27');
    expect(todayDublin(new Date('2027-03-28T23:30:00Z'))).toBe('2027-03-29');
    // Day arithmetic across DST never skips or repeats a date
    expect(addDays('2027-03-27', 1)).toBe('2027-03-28');
    expect(addDays('2027-03-28', 1)).toBe('2027-03-29');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });
  it('weekday helpers', () => {
    expect(weekday(MON)).toBe(1);
    expect(isWeekday('2026-11-21')).toBe(false);
    expect(weekStart('2026-11-22')).toBe(MON); // Sunday → Monday before
    expect(prevWeekday(MON)).toBe('2026-11-13');
  });
});

describe('spaced repetition', () => {
  it('baseline intervals', () => {
    expect(baselineDecision(5).intervalDays).toBeNull();
    expect(baselineDecision(4).intervalDays).toBe(42);
    expect(baselineDecision(3).intervalDays).toBe(21);
    expect(baselineDecision(2).intervalDays).toBe(10);
    expect(baselineDecision(1)).toMatchObject({ intervalDays: 5, priority: 1 });
  });
  it('5★ retires the topic', () => {
    const p = applyRating(undefined, MON, 5, baselineDecision(5));
    expect(p.retired).toBe(true);
    expect(p.due).toBeUndefined();
  });
  it('sets due date from interval', () => {
    expect(applyRating(undefined, MON, 3, baselineDecision(3)).due).toBe(addDays(MON, 21));
  });
  it('weak after two low ratings in a row', () => {
    let p = applyRating(undefined, MON, 2, baselineDecision(2));
    expect(isWeak(p)).toBe(false);
    p = applyRating(p, addDays(MON, 10), 1, baselineDecision(1));
    expect(isWeak(p)).toBe(true);
    p = applyRating(p, addDays(MON, 15), 4, baselineDecision(4));
    expect(isWeak(p)).toBe(false);
  });
});

describe('AI guardrails', () => {
  it('clamps to 50–150% of baseline', () => {
    expect(clampAi(3, { interval_days: 1, priority: 0, reason: 'x' }).intervalDays).toBe(Math.round(21 * 0.5));
    expect(clampAi(3, { interval_days: 999, priority: 0, reason: 'x' }).intervalDays).toBe(Math.round(21 * 1.5));
    expect(clampAi(4, { interval_days: 50, priority: 1, reason: 'ok' })).toMatchObject({ intervalDays: 50, priority: 1, source: 'ai', reason: 'ok' });
  });
  it('cannot un-retire a 5★ topic', () => {
    expect(clampAi(5, { interval_days: 3, priority: 1, reason: 'review' }).intervalDays).toBeNull();
  });
  it('falls back to baseline on bad output', () => {
    for (const bad of [null, undefined, 'nope', {}, { interval_days: 'abc' }, { interval_days: NaN }]) {
      expect(clampAi(2, bad)).toEqual(baselineDecision(2));
    }
  });
  it('invalid priority becomes 0', () => {
    expect(clampAi(2, { interval_days: 10, priority: 7 }).priority).toBe(0);
  });
  it('every star level stays inside its window', () => {
    for (const stars of [1, 2, 3, 4]) {
      for (const v of [-100, 0, 3, 30, 500]) {
        const d = clampAi(stars, { interval_days: v }).intervalDays!;
        expect(d).toBeGreaterThanOrEqual(Math.round(BASE_INTERVAL[stars] * 0.5));
        expect(d).toBeLessThanOrEqual(Math.round(BASE_INTERVAL[stars] * 1.5));
      }
    }
  });
});

describe('deadline boost', () => {
  it('ramps from ×1.5 at 4 weeks to ×2.5 in the final week', () => {
    const dl = '2026-12-11';
    expect(boostMultiplier(addDays(dl, -40), dl)).toBe(1);
    expect(boostMultiplier(addDays(dl, -28), dl)).toBeCloseTo(1.5);
    expect(boostMultiplier(addDays(dl, -14), dl)).toBeGreaterThan(1.5);
    expect(boostMultiplier(addDays(dl, -14), dl)).toBeLessThan(2.5);
    expect(boostMultiplier(addDays(dl, -3), dl)).toBe(2.5);
    expect(boostMultiplier(dl, dl)).toBe(2.5);
    expect(boostMultiplier(addDays(dl, 1), dl)).toBe(1); // switches off after
  });
  it('coursework slot is certain in the final week', () => {
    expect(courseworkSlotChance('2026-12-07', '2026-12-11')).toBe(1);
    expect(courseworkSlotChance('2026-12-12', '2026-12-11')).toBe(0);
  });
});

function planned(state: AppState, d: string) {
  const map = topicMap(state.settings);
  return state.plans[d].picks.map((p) => map.get(p.topicId)!);
}

describe('daily selection', () => {
  it('plans 2 topics from 2 different subjects every weekday', () => {
    let s = defaultState();
    for (let d = '2026-09-01'; d <= '2027-05-28'; d = addDays(d, 1)) {
      s = ensurePlans(s, d);
      if (!isWeekday(d)) continue;
      const ts = planned(s, d);
      expect(ts).toHaveLength(2);
      expect(ts[0].subject).not.toBe(ts[1].subject);
    }
  });
  it('is stable: re-running never changes an existing day', () => {
    const s1 = ensurePlans(defaultState(), MON);
    const s2 = ensurePlans(s1, MON);
    expect(s2.plans[MON]).toEqual(s1.plans[MON]);
  });
  it('pre-generates Mon–Fri and previews Monday at the weekend', () => {
    const s = ensurePlans(defaultState(), MON);
    expect(Object.keys(s.plans).sort()).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']);
    const w = ensurePlans(defaultState(), '2026-11-21');
    expect(w.plans['2026-11-23']).toBeDefined();
    expect(w.plans['2026-11-21']).toBeUndefined();
  });
  it('no topic repeats within a week', () => {
    const s = ensurePlans(defaultState(), MON);
    const ids = Object.values(s.plans).flatMap((p) => p.picks.map((x) => x.topicId));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('rated topics do not come back before they are due; 5★ never', () => {
    let s = ensurePlans(defaultState(), MON);
    const [a, b] = s.plans[MON].picks.map((p) => p.topicId);
    s = rateTopic(s, MON, MON, a, 5, baselineDecision(5));
    s = rateTopic(s, MON, MON, b, 3, baselineDecision(3));
    for (let d = addDays(MON, 1); d <= addDays(MON, 120); d = addDays(d, 1)) {
      s = ensurePlans(s, d);
      if (!isWeekday(d)) continue;
      const ids = s.plans[d].picks.map((p) => p.topicId);
      expect(ids).not.toContain(a);
      if (d < addDays(MON, 21)) expect(ids).not.toContain(b);
    }
  });
  it('rating re-plans future days but never today', () => {
    let s = ensurePlans(defaultState(), MON);
    const today = s.plans[MON];
    s = rateTopic(s, MON, MON, today.picks[0].topicId, 4, baselineDecision(4));
    expect(s.plans[MON].picks.map((p) => p.topicId)).toEqual(today.picks.map((p) => p.topicId));
    expect(s.plans[MON].picks[0].done).toBe(true);
  });
  it('avoids the same subject 3 weekdays in a row without a deadline', () => {
    let s = defaultState();
    s.settings.deadlines = s.settings.deadlines.filter((d) => d.kind === 'exam');
    const map = topicMap(s.settings);
    let violations = 0;
    let days = 0;
    let prev: string[][] = [];
    for (let d = '2026-09-01'; d <= '2027-05-28'; d = addDays(d, 1)) {
      s = ensurePlans(s, d);
      if (!isWeekday(d)) continue;
      days++;
      const subs = s.plans[d].picks.map((p) => map.get(p.topicId)!.subject as string);
      if (prev.length === 2) for (const x of subs) if (prev[0].includes(x) && prev[1].includes(x)) violations++;
      prev = [subs, ...prev].slice(0, 2);
    }
    expect(violations / days).toBeLessThan(0.1);
  });
  it('coursework task appears in the final week before a deadline', () => {
    let s = defaultState();
    for (let d = '2026-12-07'; d <= '2026-12-11'; d = addDays(d, 1)) {
      s = ensurePlans(s, d);
      expect(s.plans[d].picks.some((p) => p.topicId.startsWith('cw-physics-investigation'))).toBe(true);
    }
    s = ensurePlans(s, '2026-12-14');
    expect(s.plans['2026-12-14'].picks.some((p) => p.topicId.startsWith('cw-physics'))).toBe(false);
  });
  it('Irish oral boost pulls from oral topics', () => {
    let s = defaultState();
    const map = topicMap(s.settings);
    for (let d = '2027-03-01'; d <= '2027-03-19'; d = addDays(d, 1)) {
      s = ensurePlans(s, d);
      if (!isWeekday(d)) continue;
      for (const p of s.plans[d].picks) {
        const t = map.get(p.topicId)!;
        if (t.subject === 'irish') expect(t.kind).toBe('oral');
      }
    }
  });
});

describe('settings-dependent topics', () => {
  it('undecided electives are excluded or included by toggle', () => {
    const s = defaultState().settings;
    expect(settingSatisfied('geo-elective:human', s)).toBe(false);
    s.undecidedInclude.geoElective = true;
    expect(settingSatisfied('geo-elective:human', s)).toBe(true);
    s.geoElective = 'economic';
    expect(settingSatisfied('geo-elective:human', s)).toBe(false);
    expect(settingSatisfied('geo-elective:economic', s)).toBe(true);
  });
  it('exactly 2 tech options once chosen', () => {
    const s = defaultState().settings;
    s.techOptions = ['electronics', 'programming'];
    s.undecidedInclude.techOptions = true;
    const opts = new Set(activeExamTopics(s).filter((t) => t.requiresSetting?.startsWith('tech-option')).map((t) => t.requiresSetting));
    expect([...opts].sort()).toEqual(['tech-option:electronics', 'tech-option:programming']);
  });
  it('every base topic has 3–5 start ideas and a unique id', () => {
    const ids = new Set<string>();
    for (const t of BASE_TOPICS) {
      expect(t.startIdeas.length).toBeGreaterThanOrEqual(3);
      expect(t.startIdeas.length).toBeLessThanOrEqual(5);
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
    }
  });
});

describe('reroll limits', () => {
  it('1 per week, same subject, logged', () => {
    let s = ensurePlans(defaultState(), MON);
    const map = topicMap(s.settings);
    const idx = s.plans[MON].picks.findIndex((p) => !p.topicId.startsWith('cw-'));
    const orig = s.plans[MON].picks[idx].topicId;
    expect(rerollsLeft(s, MON)).toBe(1);
    const r = rerollTopic(s, MON, MON, orig, 'data-error', false);
    expect(r.error).toBeUndefined();
    s = r.state;
    const repl = s.plans[MON].picks[idx];
    expect(repl.topicId).not.toBe(orig);
    expect(map.get(repl.topicId)!.subject).toBe(map.get(orig)!.subject);
    expect(s.rerolls).toHaveLength(1);
    expect(rerollsLeft(s, MON)).toBe(0);
    expect(rerollTopic(s, MON, MON, s.plans[MON].picks[1 - idx].topicId, 'duplicate', false).error).toBeTruthy();
    expect(rerollsLeft(s, addDays(MON, 7))).toBe(1); // resets next Monday
  });
  it('coursework tasks swap to another task from the same project', () => {
    const s = ensurePlans(defaultState(), '2026-12-07');
    const cw = s.plans['2026-12-07'].picks.find((p) => p.topicId.startsWith('cw-physics'))!;
    const r = rerollTopic(s, '2026-12-07', '2026-12-07', cw.topicId, 'data-error', false);
    expect(r.error).toBeUndefined();
    expect(r.state.plans['2026-12-07'].picks.some((p) => p.topicId.startsWith('cw-physics') && p.topicId !== cw.topicId)).toBe(true);
  });
  it('"not on my course" can disable the topic', () => {
    const s = ensurePlans(defaultState(), MON);
    const orig = s.plans[MON].picks[0].topicId;
    const r = rerollTopic(s, MON, MON, orig, 'not-on-course', true);
    expect(r.state.settings.disabledTopics).toContain(orig);
  });
});

describe('streaks', () => {
  const plan = (date: string, done: boolean): DayPlan => ({ date, picks: [{ topicId: 'a', done }, { topicId: 'b', done }] });
  it('skips weekends', () => {
    const plans = Object.fromEntries(['2026-11-12', '2026-11-13', '2026-11-16'].map((d) => [d, plan(d, true)]));
    expect(currentStreak(plans, '2026-11-16')).toBe(3);
  });
  it('today not yet done does not break the streak', () => {
    const plans: Record<string, DayPlan> = { '2026-11-13': plan('2026-11-13', true), '2026-11-16': plan('2026-11-16', false) };
    expect(currentStreak(plans, '2026-11-16')).toBe(1);
  });
  it('a missed weekday breaks it', () => {
    const plans: Record<string, DayPlan> = { '2026-11-11': plan('2026-11-11', true), '2026-11-13': plan('2026-11-13', true) };
    expect(currentStreak(plans, '2026-11-13')).toBe(1);
  });
  it('half-done day does not count', () => {
    const plans: Record<string, DayPlan> = { '2026-11-13': { date: '2026-11-13', picks: [{ topicId: 'a', done: true }, { topicId: 'b' }] } };
    expect(currentStreak(plans, '2026-11-16')).toBe(0);
  });
  it('best streak', () => {
    const ds = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-06', '2026-11-09'];
    const plans = Object.fromEntries(ds.map((d) => [d, plan(d, true)]));
    expect(bestStreak(plans, '2026-11-09')).toBe(3);
  });
});
