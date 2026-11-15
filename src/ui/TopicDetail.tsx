import { useState } from 'react';
import { useStore } from '../state/store';
import { useTimer } from '../state/timer';
import { SUBJECT_BY_ID } from '../data/subjects';
import { diffDays, prettyDate } from '../engine/dates';
import { rateTopic, rerollTopic, rerollsLeft } from '../engine/actions';
import { isWeak } from '../engine/schedule';
import type { RerollReason } from '../engine/types';
import { aiAvailable, scheduleDecision, stuckHelp } from '../ai';
import { Button, Card, PageTitle, Sheet, Stars, SubjectTag, go } from './common';

const REASONS: { id: RerollReason; label: string; help: string }[] = [
  { id: 'not-on-course', label: 'Not on my course', help: "This topic isn't part of what I study." },
  { id: 'duplicate', label: 'Duplicate', help: 'Same as another topic I already have.' },
  { id: 'data-error', label: 'Data error', help: 'The topic name or details are wrong.' },
];

export function TopicDetail({ date, topicId }: { date: string; topicId: string }) {
  const { state, today, topics, update } = useStore();
  const { start } = useTimer();
  const topic = topics.get(topicId);
  const plan = state.plans[date];
  const pick = plan?.picks.find((p) => p.topicId === topicId);
  const progress = state.progress[topicId];

  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [rerollOpen, setRerollOpen] = useState(false);
  const [reason, setReason] = useState<RerollReason | null>(null);
  const [disable, setDisable] = useState(true);
  const [rerollError, setRerollError] = useState('');
  const [stuck, setStuck] = useState('');
  const [stuckState, setStuckState] = useState<'idle' | 'loading' | 'error' | 'unavailable'>('idle');
  const [menuOpen, setMenuOpen] = useState(false);

  if (!topic) {
    return (
      <div>
        <PageTitle back>Topic not found</PageTitle>
        <p className="text-slate-500">This topic may have been removed or disabled in Settings.</p>
      </div>
    );
  }
  const subject = SUBJECT_BY_ID[topic.subject];
  const canRate = !!pick && !pick.done && date <= today;
  const left = rerollsLeft(state, today);

  const nearestDeadline = state.settings.deadlines
    .filter((d) => (d.subject === topic.subject || d.kind === 'exam') && d.date >= today)
    .map((d) => diffDays(d.date, today))
    .sort((a, b) => a - b)[0];

  async function saveRating() {
    if (!stars || !topic) return;
    setSaving(true);
    const decision = await scheduleDecision(
      {
        topic: topic.label,
        subject: subject.name,
        level: topic.level,
        stars,
        starHistory: progress?.ratings.map((r) => r.stars) ?? [],
        note: note || undefined,
        daysToDeadline: nearestDeadline ?? null,
        subjectWeight: state.settings.weights[topic.subject],
      },
      state.settings.aiEnabled,
    );
    update((s) => rateTopic(s, today, date, topicId, stars, decision, note));
    setSaving(false);
    setRateOpen(false);
    go('/');
  }

  function doReroll() {
    if (!reason) return;
    const r = rerollTopic(state, today, date, topicId, reason, disable);
    if (r.error) return setRerollError(r.error);
    update(() => r.state);
    setRerollOpen(false);
    const replacement = r.state.plans[date].picks.find((p) => p.rerolledFrom === topicId);
    if (replacement) go(`/topic/${date}/${encodeURIComponent(replacement.topicId)}`);
  }

  async function askStuck() {
    if (!aiAvailable()) return setStuckState('unavailable');
    setStuckState('loading');
    setStuck('');
    try {
      await stuckHelp(topic!.label, `Leaving Cert ${subject.name} ${topic!.level === 'HL' ? 'Higher' : 'Ordinary'} Level`, setStuck);
      setStuckState('idle');
    } catch (e) {
      setStuckState((e as { status?: number }).status === 503 || (e as { status?: number }).status === 401 ? 'unavailable' : 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <PageTitle back>
          <span className="sr-only">Topic</span>
        </PageTitle>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="rounded-full px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="More options">
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
              <button
                disabled={!pick || pick.done}
                onClick={() => {
                  setMenuOpen(false);
                  setRerollError('');
                  setReason(null);
                  setRerollOpen(true);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              >
                ⚠️ Report a problem / reroll
              </button>
            </div>
          )}
        </div>
      </div>

      <Card accent={subject.color} className="p-5">
        <SubjectTag subject={topic.subject} />
        <h1 className="mt-1 text-2xl font-bold leading-tight">{topic.label}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {topic.kind === 'coursework' && <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold dark:bg-slate-800">Coursework task</span>}
          {topic.kind === 'oral' && <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold dark:bg-slate-800">Oral</span>}
          {isWeak(progress) && <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">Weak topic</span>}
          {progress?.retired && <span className="rounded-full bg-green-100 px-2 py-1 font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">Mastered ★★★★★</span>}
          {pick?.rerolledFrom && <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">Swapped in by reroll</span>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="subtle"
          onClick={() => {
            start(topic.subject, topic.id);
            go('/timer');
          }}
        >
          🎯 {state.settings.focusMinutes}-min focus
        </Button>
        {pick?.done ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            ✅ Done <Stars value={pick.stars ?? 0} size="text-sm" />
          </div>
        ) : (
          <Button
            disabled={!canRate}
            onClick={() => {
              setStars(0);
              setNote('');
              setRateOpen(true);
            }}
          >
            {date > today ? `Planned ${prettyDate(date, { weekday: 'short' })}` : 'Done ✓'}
          </Button>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Ways to get started</h2>
        <Card>
          <ul className="space-y-2.5">
            {topic.startIdeas.map((idea) => (
              <li key={idea} className="flex gap-2.5">
                <span style={{ color: subject.color }}>●</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Hit a wall?</div>
              <div className="text-sm text-slate-500">Get a fresh angle on this topic.</div>
            </div>
            <Button variant="subtle" onClick={askStuck} disabled={stuckState === 'loading'}>
              {stuckState === 'loading' ? 'Thinking…' : "I'm stuck"}
            </Button>
          </div>
          {stuck && <div className="mt-3 border-t border-slate-200 pt-3 text-sm leading-relaxed whitespace-pre-wrap dark:border-slate-800">{stuck}</div>}
          {stuckState === 'unavailable' && <p className="mt-3 text-sm text-slate-500">AI help isn't switched on for this device. Connect it in Settings → Sync & AI (the server also needs a Claude API key). Until then, try the ideas above.</p>}
          {stuckState === 'error' && <p className="mt-3 text-sm text-rose-600">Couldn't reach the AI right now. Try the ideas above, or try again later.</p>}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Resources</h2>
        <Card className="space-y-2">
          {subject.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg py-1 font-medium text-sky-700 hover:underline dark:text-sky-400">
              {l.label} <span aria-hidden>↗</span>
            </a>
          ))}
          <p className="text-xs text-slate-500">Past papers: choose Leaving Certificate → {subject.name} → {subject.level === 'HL' ? 'Higher' : 'Ordinary'} Level.</p>
        </Card>
      </section>

      {progress && progress.ratings.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">History</h2>
          <Card className="space-y-3">
            {[...progress.ratings].reverse().map((r, i) => (
              <div key={i} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">{prettyDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <Stars value={r.stars} size="text-sm" />
                </div>
                {r.note && <p className="mt-1 text-sm italic">“{r.note}”</p>}
                <p className="mt-1 text-xs text-slate-500">
                  {r.intervalDays === null ? 'Retired — won’t come back.' : `Back in ~${r.intervalDays} days`}
                  {r.source === 'ai' && r.aiReason ? ` · 🤖 ${r.aiReason}` : ' · standard schedule'}
                </p>
              </div>
            ))}
          </Card>
        </section>
      )}

      <Sheet open={rateOpen} onClose={() => setRateOpen(false)} title="How easy was this to study?">
        <div className="flex flex-col items-center gap-2">
          <Stars value={stars} onChange={setStars} size="text-5xl" />
          <p className="h-5 text-sm text-slate-500">{['', 'Struggled — back in ~5 days', 'Shaky — back in ~10 days', 'Okay — back in ~3 weeks', 'Solid — back in ~6 weeks', 'Nailed it — retired for good'][stars]}</p>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={140}
          placeholder="Optional note (e.g. kept mixing up Emilia's motives)"
          className="mt-4 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-3 dark:border-slate-700"
        />
        <Button className="mt-4 w-full" disabled={!stars || saving} onClick={saveRating}>
          {saving ? 'Saving…' : 'Save rating'}
        </Button>
      </Sheet>

      <Sheet open={rerollOpen} onClose={() => setRerollOpen(false)} title="Report a problem">
        <p className="mb-3 text-sm text-slate-500">
          Rerolls are for mistakes only, not for skipping hard topics. You get <b>{left}</b> left this week, and the replacement comes from the same subject ({subject.name}).
        </p>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${reason === r.id ? 'border-slate-900 dark:border-white' : 'border-slate-200 dark:border-slate-700'}`}>
              <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="mt-1" />
              <div>
                <div className="font-semibold">{r.label}</div>
                <div className="text-sm text-slate-500">{r.help}</div>
              </div>
            </label>
          ))}
        </div>
        {reason === 'not-on-course' && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={disable} onChange={(e) => setDisable(e.target.checked)} />
            Also remove this topic permanently (you can undo this in Settings)
          </label>
        )}
        {rerollError && <p className="mt-3 text-sm text-rose-600">{rerollError}</p>}
        <Button className="mt-4 w-full" variant="danger" disabled={!reason || left <= 0} onClick={doReroll}>
          {left <= 0 ? 'No rerolls left this week' : 'Swap this topic'}
        </Button>
      </Sheet>
    </div>
  );
}
