import type { SubjectId } from '../data/subjects';
import type { Deadline } from '../data/deadlines';

export interface Rating {
  date: string;
  stars: number; // 1–5
  note?: string;
  intervalDays: number | null; // null = retired
  priority: number;
  source: 'baseline' | 'ai';
  aiReason?: string;
}

export interface TopicProgress {
  ratings: Rating[];
  due?: string;
  retired?: boolean;
  priority?: number;
  finalReviewDone?: boolean;
}

export interface Pick {
  topicId: string;
  done?: boolean;
  stars?: number;
  rerolledFrom?: string;
}

export interface DayPlan {
  date: string;
  picks: Pick[];
}

export type RerollReason = 'not-on-course' | 'duplicate' | 'data-error';

export interface RerollEntry {
  date: string;
  fromTopicId: string;
  toTopicId: string | null;
  reason: RerollReason;
  disabled: boolean;
}

export interface FocusEntry {
  date: string;
  subject: SubjectId | null;
  minutes: number;
}

export interface Settings {
  weights: Record<SubjectId, number>;
  deadlines: Deadline[];
  aiEnabled: boolean;
  focusMinutes: number;
  breakMinutes: number;
  theme: 'system' | 'light' | 'dark';
  geoElective: 'economic' | 'human' | null;
  geoOption: string | null;
  techOptions: string[];
  /** While a choice is undecided: include all candidate topics (true) or none (false). */
  undecidedInclude: { geoElective: boolean; geoOption: boolean; techOptions: boolean };
  irishProse: string[];
  poems: Record<string, string[]>;
  disabledTopics: string[];
  mayReview: boolean;
  notifyTime: string;
}

export interface AppState {
  version: 1;
  settings: Settings;
  progress: Record<string, TopicProgress>;
  plans: Record<string, DayPlan>;
  rerolls: RerollEntry[];
  focusLog: FocusEntry[];
  updatedAt: number;
}
