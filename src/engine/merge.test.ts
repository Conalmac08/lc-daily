import { describe, expect, it } from 'vitest';
import { defaultState } from './defaults';
import { ensurePlans } from './select';
import { rateTopic } from './actions';
import { baselineDecision } from './schedule';
import { mergeStates } from './merge';

const MON = '2026-11-16';

describe('merging two devices', () => {
  it('keeps ratings made on either device', () => {
    const base = ensurePlans(defaultState(), MON);
    const [a, b] = base.plans[MON].picks.map((p) => p.topicId);
    const phone = rateTopic(base, MON, MON, a, 4, baselineDecision(4));
    const laptop = rateTopic(base, MON, MON, b, 2, baselineDecision(2));
    const m = mergeStates(phone, laptop, MON);
    expect(m.progress[a].ratings).toHaveLength(1);
    expect(m.progress[b].ratings).toHaveLength(1);
  });
  it("today's plan with more done wins; ties keep the stored copy", () => {
    const base = ensurePlans(defaultState(), MON);
    const t = base.plans[MON].picks[0].topicId;
    const done = rateTopic(base, MON, MON, t, 3, baselineDecision(3));
    expect(mergeStates(base, done, MON).plans[MON].picks[0].done).toBe(true);
    expect(mergeStates(done, base, MON).plans[MON].picks[0].done).toBe(true);
    const other = { ...base, plans: { ...base.plans, [MON]: { date: MON, picks: [{ topicId: 'x' }, { topicId: 'y' }] } } };
    expect(mergeStates(other, base, MON).plans[MON]).toEqual(base.plans[MON]);
  });
  it('settings come from the most recently edited copy', () => {
    const a = { ...defaultState(), updatedAt: 1 };
    const b = { ...defaultState(), updatedAt: 2 };
    b.settings = { ...b.settings, focusMinutes: 50 };
    expect(mergeStates(a, b, MON).settings.focusMinutes).toBe(50);
    expect(mergeStates(b, a, MON).settings.focusMinutes).toBe(50);
  });
  it('merging is stable (merging the result again changes nothing)', () => {
    const base = ensurePlans(defaultState(), MON);
    const t = base.plans[MON].picks[0].topicId;
    const x = rateTopic(base, MON, MON, t, 1, baselineDecision(1));
    const m1 = mergeStates(x, base, MON);
    expect(mergeStates(m1, m1, MON)).toEqual(m1);
    expect(mergeStates(base, m1, MON)).toEqual(m1);
  });
});
