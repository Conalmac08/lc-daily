import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { get, set } from 'idb-keyval';
import { defaultSettings, defaultState } from '../engine/defaults';
import { todayDublin } from '../engine/dates';
import { ensurePlans, replanFuture } from '../engine/select';
import { mergeStates } from '../engine/merge';
import { topicMap } from '../engine/catalog';
import { isConnected, syncState } from '../api';
import type { AppState, Settings } from '../engine/types';
import type { Topic } from '../data/topics';

const KEY = 'lc-daily-state-v1';

export type SyncStatus = 'off' | 'syncing' | 'ok' | 'error' | 'offline';

interface Store {
  state: AppState;
  today: string;
  topics: Map<string, Topic>;
  update: (fn: (s: AppState) => AppState) => void;
  updateSettings: (fn: (s: Settings) => Settings, opts?: { replan?: boolean }) => void;
  replaceState: (s: AppState) => void;
  sync: { status: SyncStatus; lastAt: number | null; now: () => Promise<void> };
}

const Ctx = createContext<Store | null>(null);

/** Fill in any settings added in newer versions. */
function migrate(raw: AppState): AppState {
  const d = defaultSettings();
  return { ...defaultState(), ...raw, settings: { ...d, ...raw.settings, undecidedInclude: { ...d.undecidedInclude, ...raw.settings?.undecidedInclude }, poems: { ...d.poems, ...raw.settings?.poems } } };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [today, setToday] = useState(todayDublin());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isConnected() ? 'ok' : 'off');
  const [lastAt, setLastAt] = useState<number | null>(null);
  const loaded = useRef(false);
  const stateRef = useRef<AppState | null>(null);
  const lastSynced = useRef<string>('');
  const syncing = useRef(false);
  stateRef.current = state;

  // Load from IndexedDB once.
  useEffect(() => {
    get<AppState>(KEY).then((saved) => {
      const s = saved ? migrate(saved) : defaultState();
      setState(ensurePlans(s, todayDublin()));
      loaded.current = true;
    });
  }, []);

  // Persist on every change.
  useEffect(() => {
    if (state && loaded.current) set(KEY, state);
  }, [state]);

  // ---- Sync with the backend (only when this device is connected) ---------
  const syncNow = useCallback(async () => {
    if (!isConnected()) return setSyncStatus('off');
    if (!navigator.onLine) return setSyncStatus('offline');
    const local = stateRef.current;
    if (!local || syncing.current) return;
    syncing.current = true;
    setSyncStatus('syncing');
    try {
      const merged = await syncState(local);
      lastSynced.current = JSON.stringify(merged);
      // Merge again with anything changed locally while the request was in flight.
      setState((cur) => (cur ? ensurePlans(mergeStates(cur, merged, todayDublin()), todayDublin()) : cur));
      setSyncStatus('ok');
      setLastAt(Date.now());
    } catch {
      setSyncStatus(isConnected() ? 'error' : 'off');
    } finally {
      syncing.current = false;
    }
  }, []);

  // Sync shortly after any change.
  useEffect(() => {
    if (!state || !loaded.current || !isConnected()) return;
    if (JSON.stringify(state) === lastSynced.current) return;
    const id = setTimeout(syncNow, 1500);
    return () => clearTimeout(id);
  }, [state, syncNow]);

  // Sync when coming back online or reopening the app; also check for day rollover.
  useEffect(() => {
    const onShow = () => {
      setToday(todayDublin());
      if (document.visibilityState === 'visible') syncNow();
    };
    const id = setInterval(() => setToday(todayDublin()), 30_000);
    document.addEventListener('visibilitychange', onShow);
    addEventListener('online', syncNow);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onShow);
      removeEventListener('online', syncNow);
    };
  }, [syncNow]);

  useEffect(() => {
    setState((s) => (s ? ensurePlans(s, today) : s));
  }, [today]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => (s ? { ...fn(s), updatedAt: Date.now() } : s)), []);
  const updateSettings = useCallback(
    (fn: (s: Settings) => Settings, opts: { replan?: boolean } = {}) =>
      setState((s) => {
        if (!s) return s;
        const next = { ...s, settings: fn(s.settings), updatedAt: Date.now() };
        return opts.replan ? replanFuture(next, todayDublin()) : next;
      }),
    [],
  );
  const replaceState = useCallback((s: AppState) => setState(ensurePlans(migrate({ ...s, updatedAt: Date.now() }), todayDublin())), []);

  const topics = useMemo(() => (state ? topicMap(state.settings) : new Map()), [state?.settings]);

  if (!state) return <div className="flex h-dvh items-center justify-center text-slate-400">Loading…</div>;
  return (
    <Ctx.Provider value={{ state, today, topics, update, updateSettings, replaceState, sync: { status: syncStatus, lastAt, now: syncNow } }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
