import { DEFAULT_WEIGHTS } from '../data/subjects';
import { DEFAULT_DEADLINES } from '../data/deadlines';
import { POETS } from '../data/topics';
import type { AppState, Settings } from './types';

export const MAY_REVIEW_START = '2027-05-03';

export function defaultSettings(): Settings {
  return {
    weights: { ...DEFAULT_WEIGHTS },
    deadlines: structuredClone(DEFAULT_DEADLINES),
    aiEnabled: true,
    focusMinutes: 40,
    breakMinutes: 5,
    theme: 'system',
    geoElective: null,
    geoOption: null,
    techOptions: [],
    undecidedInclude: { geoElective: false, geoOption: false, techOptions: false },
    irishProse: ['', ''],
    poems: Object.fromEntries(POETS.map((p) => [p, []])),
    disabledTopics: [],
    mayReview: false,
    notifyTime: '07:00',
  };
}

export function defaultState(): AppState {
  return { version: 1, settings: defaultSettings(), progress: {}, plans: {}, rerolls: [], focusLog: [], updatedAt: Date.now() };
}
