import { BASE_TOPICS, settingsTopics, type Topic } from '../data/topics';
import type { Deadline } from '../data/deadlines';
import type { Settings } from './types';

export function courseworkTopics(deadlines: Deadline[]): Topic[] {
  return deadlines.flatMap((d) =>
    d.subject && d.kind === 'coursework'
      ? d.tasks.map((task, i) => ({
          id: `cw-${d.id}-${i}`,
          subject: d.subject!,
          level: d.subject === 'irish' ? ('OL' as const) : ('HL' as const),
          area: d.name,
          label: `${d.name}: ${task}`,
          startIdeas: [
            'Spend one 40-minute focus block on just this task',
            'Re-read the SEC brief / marking criteria for this section first',
            'Finish by writing a 3-item to-do list for the next session',
          ],
          enabled: true,
          kind: 'coursework' as const,
        }))
      : [],
  );
}

/** Every topic the app knows about, including settings-generated and coursework tasks. */
export function allTopics(settings: Settings): Topic[] {
  return [...BASE_TOPICS, ...settingsTopics(settings.poems, settings.irishProse), ...courseworkTopics(settings.deadlines)];
}

export function topicMap(settings: Settings): Map<string, Topic> {
  return new Map(allTopics(settings).map((t) => [t.id, t]));
}

export function settingSatisfied(req: string | undefined, s: Settings): boolean {
  if (!req) return true;
  const [key, val] = req.split(':');
  if (key === 'geo-elective') return s.geoElective ? s.geoElective === val : s.undecidedInclude.geoElective;
  if (key === 'geo-option') return s.geoOption ? s.geoOption === val : s.undecidedInclude.geoOption;
  if (key === 'tech-option') {
    if (s.techOptions.includes(val)) return true;
    return s.techOptions.length < 2 && s.undecidedInclude.techOptions;
  }
  return true;
}

export function isActive(t: Topic, s: Settings): boolean {
  return t.enabled && !s.disabledTopics.includes(t.id) && settingSatisfied(t.requiresSetting, s);
}

/** Exam topics (not coursework tasks) currently on the student's course. */
export function activeExamTopics(s: Settings): Topic[] {
  return allTopics(s).filter((t) => t.kind !== 'coursework' && isActive(t, s));
}

export function undecidedChoices(s: Settings): string[] {
  const out: string[] = [];
  if (!s.geoElective) out.push('Geography elective');
  if (!s.geoOption) out.push('Geography HL option');
  if (s.techOptions.length < 2) out.push('Technology options');
  if (s.irishProse.filter((p) => p.trim()).length < 2) out.push('Irish prose choices');
  if (Object.values(s.poems).every((l) => l.length === 0)) out.push('English poem lists');
  return out;
}
