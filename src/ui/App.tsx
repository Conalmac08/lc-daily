import { useEffect } from 'react';
import { StoreProvider, useStore } from '../state/store';
import { TimerProvider, useTimer, fmtMs } from '../state/timer';
import { go, useHash } from './common';
import { Home } from './Home';
import { TopicDetail } from './TopicDetail';
import { Week } from './Week';
import { ProgressScreen } from './Progress';
import { Deadlines } from './Deadlines';
import { SettingsScreen } from './Settings';
import { TimerScreen } from './TimerScreen';
import { InstallGuide } from './InstallGuide';

export function App() {
  return (
    <StoreProvider>
      <TimerProvider>
        <Shell />
      </TimerProvider>
    </StoreProvider>
  );
}

const NAV = [
  { path: '/', label: 'Today', icon: '☀️' },
  { path: '/week', label: 'Week', icon: '🗓️' },
  { path: '/progress', label: 'Progress', icon: '📊' },
  { path: '/deadlines', label: 'Deadlines', icon: '⏳' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

function useTheme() {
  const { state } = useStore();
  const theme = state.settings.theme;
  useEffect(() => {
    localStorage.setItem('lc-daily-theme', theme);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#020617' : '#f8fafc');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

function Shell() {
  useTheme();
  const route = useHash();
  const { timer, remaining } = useTimer();
  const [, page, a, b] = route.split('/');

  let screen;
  if (page === 'topic') screen = <TopicDetail date={a} topicId={decodeURIComponent(b ?? '')} />;
  else if (page === 'week') screen = <Week />;
  else if (page === 'progress') screen = <ProgressScreen />;
  else if (page === 'deadlines') screen = <Deadlines />;
  else if (page === 'settings') screen = <SettingsScreen />;
  else if (page === 'timer') screen = <TimerScreen />;
  else if (page === 'install') screen = <InstallGuide />;
  else screen = <Home />;

  const active = '/' + (page ?? '');
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <main className="pt-safe flex-1 px-4 pb-28">{screen}</main>

      {timer && page !== 'timer' && (
        <button
          onClick={() => go('/timer')}
          className="fixed right-4 bottom-24 z-40 rounded-full bg-slate-900 px-4 py-2.5 font-mono text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-slate-900"
        >
          {timer.phase === 'focus' ? '🎯' : '☕'} {fmtMs(remaining)}
        </button>
      )}

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-2xl justify-around">
          {NAV.map((n) => {
            const on = n.path === active || (n.path === '/' && (active === '/' || active === '/topic'));
            return (
              <a
                key={n.path}
                href={`#${n.path}`}
                className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${on ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                <span className={`text-xl ${on ? '' : 'grayscale opacity-60'}`}>{n.icon}</span>
                {n.label}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
