import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../state/store';
import { currentPushSubscription, disablePush, enablePush, getServer, isConnected, login, logout, me, needsServerAddress, pushSupported, setServer, testPush, widgetUrl, type Me } from '../api';
import { scriptableWidget } from '../widgetScript';
import { Button, Card } from './common';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold tracking-wide text-slate-500 uppercase">{title}</h2>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      <Card className="space-y-3">{children}</Card>
    </section>
  );
}

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

export function ConnectSettings() {
  const { state, updateSettings, sync } = useStore();
  const [connected, setConnected] = useState(isConnected());
  const [info, setInfo] = useState<Me | null>(null);
  const [pass, setPass] = useState('');
  const [server, setServerInput] = useState(getServer());
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushMsg, setPushMsg] = useState('');
  const [wUrl, setWUrl] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!connected) return;
    me().then(setInfo).catch(() => setConnected(isConnected()));
    currentPushSubscription().then((s) => setPushOn(!!s));
  }, [connected]);

  async function doLogin() {
    setBusy(true);
    setMsg('');
    try {
      if (needsServerAddress() && !/^https:\/\/.+/.test(server.trim())) throw new Error('Enter your server address first (it starts with https://).');
      setServer(server);
      await login(pass);
      setPass('');
      setConnected(true);
      await sync.now();
    } catch (e) {
      const m = (e as Error).message;
      setMsg(m === 'HTTP 404' || m === 'Failed to fetch' || m.startsWith('NetworkError') ? "Couldn't reach the server. Check the address and that the Worker is deployed." : m);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, what: string) {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(''), 2000);
  }

  const statusText = { off: 'Not connected', syncing: 'Syncing…', ok: 'Synced ✓', error: "Couldn't sync — will retry", offline: 'Offline — will sync when back online' }[sync.status];

  return (
    <>
      <Section title="Sync & AI" hint="Connect this device to your server to sync between phone and laptop, and to turn on the AI scheduling advisor and “I'm stuck” help.">
        {!connected ? (
          <>
            {(needsServerAddress() || server) && (
              <input type="url" inputMode="url" value={server} onChange={(e) => setServerInput(e.target.value)} placeholder="Server address, e.g. https://lc-daily.yourname.workers.dev" autoCapitalize="off" autoCorrect="off" className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 dark:border-slate-700" />
            )}
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && pass && doLogin()} placeholder="Your app passphrase" autoComplete="current-password" className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 dark:border-slate-700" />
            <Button className="w-full" disabled={!pass || busy} onClick={doLogin}>{busy ? 'Connecting…' : 'Connect this device'}</Button>
            {msg && <p className="text-sm text-rose-600">{msg}</p>}
            <p className="text-xs text-slate-500">The app works fully offline without this. Your progress stays on this device until you connect.</p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="font-medium">{statusText}</span>
              <Button variant="subtle" className="min-h-9 py-1 text-sm" onClick={() => sync.now()}>Sync now</Button>
            </div>
            {sync.lastAt && <p className="text-xs text-slate-500">Last synced {new Date(sync.lastAt).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}</p>}
            {info && (
              <p className="text-sm text-slate-500">
                AI: {info.ai ? `on · $${info.aiSpentThisMonth.toFixed(2)} of $${info.aiCap.toFixed(2)} monthly cap used` : 'no API key on the server yet — using the standard schedule'}
              </p>
            )}
            <Button variant="ghost" className="w-full" onClick={async () => { await logout(); setConnected(false); sync.now(); }}>Disconnect this device</Button>
          </>
        )}
      </Section>

      {connected && (
        <Section title="Morning notification" hint="Today's 2 topics and your streak on your lock screen, every weekday.">
          <div className="flex items-center justify-between">
            <span className="font-medium">Time</span>
            <input type="time" value={state.settings.notifyTime} onChange={(e) => e.target.value && updateSettings((s) => ({ ...s, notifyTime: e.target.value }))} className="rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 dark:border-slate-700" />
          </div>
          {isIOS() && !isStandalone() && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              On iPhone, notifications only work from the installed app. Add LC Daily to your Home Screen first (Settings → Install on your phone), then open it from there and come back here.
            </p>
          )}
          {!pushSupported() && !isIOS() && <p className="text-sm text-slate-500">This browser doesn't support notifications.</p>}
          {info && !info.push && <p className="text-sm text-slate-500">Push isn't set up on the server yet (README → step 6).</p>}
          <div className="flex gap-2">
            {pushOn ? (
              <Button variant="subtle" className="flex-1" onClick={async () => { await disablePush(); setPushOn(false); setPushMsg('Notifications off for this device.'); }}>Turn off</Button>
            ) : (
              <Button className="flex-1" disabled={!pushSupported()} onClick={async () => { try { await enablePush(); setPushOn(true); setPushMsg('Notifications on ✓'); } catch (e) { setPushMsg((e as Error).message); } }}>Turn on notifications</Button>
            )}
            <Button variant="subtle" className="flex-1" disabled={!pushOn} onClick={async () => { try { const r = await testPush(); setPushMsg(r.sent ? 'Test sent — check your lock screen.' : r.reason ? `Not sent: ${r.reason}` : r.failed ? `The push service rejected it (${r.failed} failed).` : 'No devices are signed up yet.'); } catch (e) { setPushMsg((e as Error).message); } }}>Send test</Button>
          </div>
          {pushMsg && <p className="text-sm">{pushMsg}</p>}
        </Section>
      )}

      {connected && (
        <Section title="iPhone widget" hint="Shows today's topics and streak on your Home Screen or Lock Screen, using the free Scriptable app.">
          {!wUrl ? (
            <Button variant="subtle" className="w-full" onClick={async () => setWUrl((await widgetUrl()).url)}>Create my widget link</Button>
          ) : (
            <>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => copy(scriptableWidget(wUrl, location.origin + location.pathname), 'script')}>{copied === 'script' ? 'Copied ✓' : 'Copy widget script'}</Button>
                <Button variant="subtle" className="flex-1" onClick={() => copy(wUrl, 'url')}>{copied === 'url' ? 'Copied ✓' : 'Copy link only'}</Button>
              </div>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                <li>Install <b>Scriptable</b> from the App Store (free).</li>
                <li>Open Scriptable, tap <b>+</b>, paste the script, and name it “LC Daily”.</li>
                <li>Home Screen: long-press → <b>Edit Home Screen</b> → <b>+</b> → Scriptable → Medium → Add. Long-press the widget → <b>Edit Widget</b> → Script: LC Daily.</li>
                <li>Lock Screen: long-press the Lock Screen → <b>Customise</b> → Lock Screen → tap the widget area → Scriptable → rectangular → tap it → Script: LC Daily.</li>
              </ol>
              <p className="text-xs text-slate-500">Anyone with this link can see your 2 topics and streak (nothing else).</p>
              <Button variant="ghost" className="w-full text-sm" onClick={async () => { if (confirm('Make a new link? The old widget will stop working until you paste the new script.')) setWUrl((await widgetUrl(true)).url); }}>Reset link</Button>
            </>
          )}
        </Section>
      )}
    </>
  );
}
