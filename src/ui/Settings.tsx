import { useRef, useState, type ReactNode } from 'react';
import { useStore } from '../state/store';
import { DEFAULT_WEIGHTS, SUBJECTS, SUBJECT_BY_ID } from '../data/subjects';
import { GEO_OPTIONS, POETS, TECH_OPTIONS } from '../data/topics';
import { prettyDate } from '../engine/dates';
import { aiAvailable } from '../ai';
import type { AppState, Settings } from '../engine/types';
import { Button, Card, PageTitle, go } from './common';
import { ConnectSettings } from './ConnectSettings';

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold tracking-wide text-slate-500 uppercase">{title}</h2>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      <Card className="space-y-4">{children}</Card>
    </section>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-10 flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${value === o.id ? 'bg-white shadow-sm dark:bg-slate-950' : 'text-slate-600 dark:text-slate-400'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (b: boolean) => void; label: string; sub?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-medium">{label}</span>
        {sub && <span className="block text-xs text-slate-500">{sub}</span>}
      </span>
      <input type="checkbox" className="h-5 w-5 shrink-0 accent-slate-900 dark:accent-white" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** Text area that saves on blur, so typing doesn't re-plan on every keystroke. */
function LinesInput({ value, onSave, placeholder, rows = 4 }: { value: string[]; onSave: (v: string[]) => void; placeholder?: string; rows?: number }) {
  const [text, setText] = useState(value.join('\n'));
  return (
    <textarea
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onSave(text.split('\n').map((l) => l.trim()).filter(Boolean))}
      className="w-full rounded-xl border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700"
    />
  );
}

function TextInput({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  return <input value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={() => onSave(text.trim())} className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 dark:border-slate-700" />;
}

export function SettingsScreen() {
  const { state, topics, updateSettings, replaceState } = useStore();
  const s = state.settings;
  const set = (fn: (s: Settings) => Settings, replan = false) => updateSettings(fn, { replan });
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState('');

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lc-daily-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function importBackup(file: File) {
    try {
      const data = JSON.parse(await file.text()) as AppState;
      if (data.version !== 1 || !data.settings || !data.plans) throw new Error('bad');
      if (!confirm('Replace everything in the app with this backup?')) return;
      replaceState(data);
      setImportMsg('Backup restored ✓');
    } catch {
      setImportMsg("That file isn't a valid LC Daily backup.");
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle>Settings</PageTitle>

      <Section title="Appearance">
        <Segmented value={s.theme} onChange={(theme) => set((x) => ({ ...x, theme }))} options={[{ id: 'light', label: '☀️ Light' }, { id: 'dark', label: '🌙 Dark' }, { id: 'system', label: '⚙️ System' }]} />
      </Section>

      <ConnectSettings />

      <Section title="Geography" hint="Pick these when you know. While undecided, choose whether those topics are included.">
        <div>
          <div className="mb-2 font-medium">Elective</div>
          <Segmented
            value={(s.geoElective ?? 'undecided') as string}
            onChange={(v) => set((x) => ({ ...x, geoElective: v === 'undecided' ? null : (v as 'economic' | 'human') }), true)}
            options={[{ id: 'economic', label: 'Economic' }, { id: 'human', label: 'Human' }, { id: 'undecided', label: 'Not decided' }]}
          />
          {!s.geoElective && <div className="mt-2"><Toggle label="Include both electives for now" checked={s.undecidedInclude.geoElective} onChange={(b) => set((x) => ({ ...x, undecidedInclude: { ...x.undecidedInclude, geoElective: b } }), true)} /></div>}
        </div>
        <div>
          <div className="mb-2 font-medium">HL option</div>
          <select
            value={s.geoOption ?? ''}
            onChange={(e) => set((x) => ({ ...x, geoOption: e.target.value || null }), true)}
            className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Not decided yet</option>
            {GEO_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          {!s.geoOption && <div className="mt-2"><Toggle label="Include all options for now" checked={s.undecidedInclude.geoOption} onChange={(b) => set((x) => ({ ...x, undecidedInclude: { ...x.undecidedInclude, geoOption: b } }), true)} /></div>}
        </div>
      </Section>

      <Section title="Technology options" hint="Pick exactly 2.">
        <div className="grid gap-2 sm:grid-cols-2">
          {TECH_OPTIONS.map((o) => {
            const on = s.techOptions.includes(o.id);
            const full = s.techOptions.length >= 2 && !on;
            return (
              <label key={o.id} className={`flex items-center gap-2 rounded-xl border p-3 ${on ? 'border-slate-900 dark:border-white' : 'border-slate-200 dark:border-slate-700'} ${full ? 'opacity-40' : 'cursor-pointer'}`}>
                <input type="checkbox" disabled={full} checked={on} onChange={(e) => set((x) => ({ ...x, techOptions: e.target.checked ? [...x.techOptions, o.id] : x.techOptions.filter((t) => t !== o.id) }), true)} />
                {o.name}
              </label>
            );
          })}
        </div>
        {s.techOptions.length < 2 && <Toggle label="Include unchosen options for now" checked={s.undecidedInclude.techOptions} onChange={(b) => set((x) => ({ ...x, undecidedInclude: { ...x.undecidedInclude, techOptions: b } }), true)} />}
      </Section>

      <Section title="Irish prose choices" hint="Your 2 extra prose texts (as well as Clann Lir, Cuairteoir and An tIriseoir).">
        {[0, 1].map((i) => (
          <TextInput key={i} value={s.irishProse[i] ?? ''} placeholder={`Prose choice ${i + 1}`} onSave={(v) => set((x) => { const p = [...x.irishProse]; p[i] = v; return { ...x, irishProse: p }; }, true)} />
        ))}
      </Section>

      <Section title="English prescribed poems" hint="One poem per line. Copy them from your course list. Each poem becomes its own topic.">
        {POETS.map((poet) => (
          <div key={poet}>
            <div className="mb-1 font-medium">{poet}</div>
            <LinesInput value={s.poems[poet] ?? []} rows={3} placeholder="Poem titles, one per line" onSave={(v) => set((x) => ({ ...x, poems: { ...x.poems, [poet]: v } }), true)} />
          </div>
        ))}
      </Section>

      <Section title="Subject weights" hint="Higher means the subject comes up more often. Defaults give weaker subjects more time; Irish stays low but still appears every week or two.">
        {SUBJECTS.map((sub) => (
          <div key={sub.id}>
            <div className="flex justify-between text-sm">
              <span className="font-medium" style={{ color: sub.color }}>{sub.name}</span>
              <span className="tabular-nums text-slate-500">{s.weights[sub.id].toFixed(2)}</span>
            </div>
            <input type="range" min={0.1} max={2} step={0.05} value={s.weights[sub.id]} onChange={(e) => set((x) => ({ ...x, weights: { ...x.weights, [sub.id]: Number(e.target.value) } }))} onPointerUp={() => set((x) => x, true)} className="w-full" style={{ accentColor: sub.color }} />
          </div>
        ))}
        <Button variant="subtle" onClick={() => set((x) => ({ ...x, weights: { ...DEFAULT_WEIGHTS } }), true)}>Reset to defaults</Button>
      </Section>

      <Section title="Deadlines & coursework tasks" hint="Provisional SEC dates. Check with your teachers. Tasks appear as daily picks in the 4 weeks before each deadline.">
        {s.deadlines.map((d, i) => (
          <div key={d.id} className="space-y-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium" style={{ color: d.subject ? SUBJECT_BY_ID[d.subject].color : undefined }}>{d.name}</span>
              <input
                type="date"
                value={d.date}
                onChange={(e) => e.target.value && set((x) => { const ds = [...x.deadlines]; ds[i] = { ...ds[i], date: e.target.value }; return { ...x, deadlines: ds }; }, true)}
                className="rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-sm dark:border-slate-700"
              />
            </div>
            {d.endDate && (
              <div className="flex items-center justify-between gap-2 text-sm text-slate-500">
                <span>Ends</span>
                <input type="date" value={d.endDate} onChange={(e) => e.target.value && set((x) => { const ds = [...x.deadlines]; ds[i] = { ...ds[i], endDate: e.target.value }; return { ...x, deadlines: ds }; })} className="rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 dark:border-slate-700" />
              </div>
            )}
            {d.kind === 'coursework' && (
              <details>
                <summary className="cursor-pointer text-sm text-slate-500">Milestone tasks ({d.tasks.length})</summary>
                <div className="mt-2">
                  <LinesInput value={d.tasks} rows={6} onSave={(tasks) => set((x) => { const ds = [...x.deadlines]; ds[i] = { ...ds[i], tasks }; return { ...x, deadlines: ds }; }, true)} />
                </div>
              </details>
            )}
          </div>
        ))}
      </Section>

      <Section title="Focus timer">
        {(['focusMinutes', 'breakMinutes'] as const).map((k) => (
          <div key={k} className="flex items-center justify-between">
            <span className="font-medium">{k === 'focusMinutes' ? 'Focus length' : 'Break length'}</span>
            <span className="flex items-center gap-2">
              <input type="number" min={1} max={120} value={s[k]} onChange={(e) => set((x) => ({ ...x, [k]: Math.max(1, Math.min(120, Number(e.target.value) || 1)) }))} className="w-20 rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-right dark:border-slate-700" />
              min
            </span>
          </div>
        ))}
      </Section>

      <Section title="Scheduling">
        <Toggle
          label="AI scheduling advisor"
          sub={aiAvailable() ? 'Adjusts when topics come back, within safe limits. Off = standard schedule only.' : "Backend not set up yet, so the standard schedule is used. Turn this on once it's deployed."}
          checked={s.aiEnabled}
          onChange={(b) => set((x) => ({ ...x, aiEnabled: b }))}
        />
        <Toggle label="Final review in May 2027" sub="Bring back each 5★ topic once from 3 May." checked={s.mayReview} onChange={(b) => set((x) => ({ ...x, mayReview: b }), true)} />
      </Section>

      <Section title="Removed topics">
        {s.disabledTopics.length === 0 ? (
          <p className="text-sm text-slate-500">None. Topics you remove with "Not on my course" show up here.</p>
        ) : (
          s.disabledTopics.map((id) => (
            <div key={id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{topics.get(id)?.label ?? id}</span>
              <Button variant="subtle" className="min-h-9 py-1 text-sm" onClick={() => set((x) => ({ ...x, disabledTopics: x.disabledTopics.filter((t) => t !== id) }), true)}>Restore</Button>
            </div>
          ))
        )}
      </Section>

      <Section title="Reroll history">
        {state.rerolls.length === 0 ? (
          <p className="text-sm text-slate-500">No rerolls yet.</p>
        ) : (
          [...state.rerolls].reverse().map((r, i) => (
            <div key={i} className="text-sm">
              <div className="text-slate-500">{prettyDate(r.date, { day: 'numeric', month: 'short' })} · {r.reason.replace(/-/g, ' ')}{r.disabled ? ' · removed' : ''}</div>
              <div>{topics.get(r.fromTopicId)?.label ?? r.fromTopicId} → {r.toTopicId ? topics.get(r.toTopicId)?.label ?? r.toTopicId : '—'}</div>
            </div>
          ))
        )}
      </Section>

      <Section title="Backup" hint="Your progress is saved on this device. Export a backup now and then.">
        <div className="flex gap-2">
          <Button variant="subtle" className="flex-1" onClick={exportBackup}>Export JSON</Button>
          <Button variant="subtle" className="flex-1" onClick={() => fileRef.current?.click()}>Import JSON</Button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
        {importMsg && <p className="text-sm">{importMsg}</p>}
      </Section>

      <Button variant="subtle" className="w-full" onClick={() => go('/install')}>📲 Install on your phone</Button>
      <p className="pb-4 text-center text-xs text-slate-400">LC Daily · no ads, no tracking</p>
    </div>
  );
}
