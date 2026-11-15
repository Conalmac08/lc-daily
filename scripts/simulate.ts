/** Simulate Sep 2026 – Jun 2027 with random ratings and summarise coverage. Run: npm run simulate */
import { SUBJECTS } from '../src/data/subjects';
import { activeExamTopics, topicMap } from '../src/engine/catalog';
import { addDays, isWeekday } from '../src/engine/dates';
import { defaultState } from '../src/engine/defaults';
import { rateTopic, subjectStats } from '../src/engine/actions';
import { baselineDecision } from '../src/engine/schedule';
import { ensurePlans, rng } from '../src/engine/select';

const START = '2026-09-01';
const END = '2027-06-01';
const rand = rng('simulation');
let s = defaultState();
// Pretend the student has made their choices.
s.settings.geoElective = 'economic';
s.settings.geoOption = 'geoecology';
s.settings.techOptions = ['electronics', 'programming'];
const map = topicMap(s.settings);

const picksBySubject: Record<string, number> = {};
const cwBySubject: Record<string, number> = {};
let weekdays = 0;
let irishGaps: number[] = [];
let sinceIrish = 0;
let threeInARow = 0;
let prev: string[][] = [];

for (let d = START; d <= END; d = addDays(d, 1)) {
  s = ensurePlans(s, d);
  if (!isWeekday(d)) continue;
  weekdays++;
  const plan = s.plans[d];
  const subs = plan.picks.map((p) => map.get(p.topicId)!.subject);
  for (const p of plan.picks) {
    const t = map.get(p.topicId)!;
    if (t.kind === 'coursework') cwBySubject[t.subject] = (cwBySubject[t.subject] ?? 0) + 1;
    else picksBySubject[t.subject] = (picksBySubject[t.subject] ?? 0) + 1;
    // Random rating skewed by subject strength (weaker subjects rate lower).
    const skew = { technology: 0.6, dcg: 0.5, physics: 0.4, geography: 0.35, maths: 0.2, english: 0.2, irish: 0 }[t.subject];
    const stars = Math.max(1, Math.min(5, Math.round(1 + rand() * 4 + skew)));
    if (rand() < 0.9) s = rateTopic(s, d, d, p.topicId, stars, baselineDecision(stars));
  }
  if (subs.includes('irish')) {
    irishGaps.push(sinceIrish);
    sinceIrish = 0;
  } else sinceIrish++;
  if (prev.length === 2) for (const x of subs) if (prev[0].includes(x) && prev[1].includes(x)) threeInARow++;
  prev = [subs, ...prev].slice(0, 2);
}

const totals = activeExamTopics(s.settings);
console.log(`\nSimulated ${weekdays} weekdays (${START} → ${END}), ${totals.length} active exam topics\n`);
console.log('Subject       exam picks  coursework  topics  studied%  4–5★%');
for (const st of subjectStats(s)) {
  const name = SUBJECTS.find((x) => x.id === st.subject)!.name.padEnd(12);
  console.log(
    `${name}  ${String(picksBySubject[st.subject] ?? 0).padStart(10)}  ${String(cwBySubject[st.subject] ?? 0).padStart(10)}  ${String(st.total).padStart(6)}  ${String(Math.round((st.studied / st.total) * 100)).padStart(7)}%  ${String(Math.round((st.strong / st.total) * 100)).padStart(4)}%`,
  );
}
const avgGap = irishGaps.reduce((a, b) => a + b, 0) / Math.max(1, irishGaps.length);
console.log(`\nIrish appeared on ${irishGaps.length} days; average gap ${avgGap.toFixed(1)} weekdays; longest gap ${Math.max(...irishGaps, sinceIrish)} weekdays`);
console.log(`Same subject 3 weekdays in a row: ${threeInARow} times (includes deadline-boosted runs)`);
