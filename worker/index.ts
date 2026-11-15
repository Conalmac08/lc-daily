import { isWeekday, todayDublin } from '../src/engine/dates';
import type { AppState } from '../src/engine/types';
import { handleSchedule, handleStuck, spentThisMonth } from './ai';
import { b64url, checkPassphrase, clearCookie, isAuthed, makeSession, sessionCookie } from './auth';
import { json, type Env } from './env';
import { loadState, notificationFor, saveMerged, todaySummary } from './summary';
import { sendPush, type PushConfig, type PushSubscriptionJSON } from './webpush';

const SUBS_KEY = 'push-subs';

function pushConfig(env: Env, origin: string): PushConfig | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_JWK) return null;
  return { publicKey: env.VAPID_PUBLIC_KEY, privateJwk: env.VAPID_PRIVATE_JWK, subject: env.VAPID_SUBJECT || origin };
}

async function getSubs(env: Env): Promise<PushSubscriptionJSON[]> {
  return (await env.KV.get<PushSubscriptionJSON[]>(SUBS_KEY, 'json')) ?? [];
}

/** Send today's notification to every subscribed device; prune dead subscriptions. */
async function sendMorningPush(env: Env, origin: string): Promise<{ sent: number; failed: number; reason?: string }> {
  const cfg = pushConfig(env, origin);
  if (!cfg) return { sent: 0, failed: 0, reason: 'push-not-configured' };
  const summary = await todaySummary(env);
  if (!summary) return { sent: 0, failed: 0, reason: 'no-data-yet' };
  const message = notificationFor(summary);
  const subs = await getSubs(env);
  let sent = 0;
  let failed = 0;
  const alive: PushSubscriptionJSON[] = [];
  for (const sub of subs) {
    try {
      const status = await sendPush(sub, message, cfg);
      if (status === 404 || status === 410) continue; // expired
      alive.push(sub);
      if (status >= 200 && status < 300) sent++;
      else failed++;
    } catch {
      alive.push(sub);
      failed++;
    }
  }
  if (alive.length !== subs.length) await env.KV.put(SUBS_KEY, JSON.stringify(alive));
  return { sent, failed };
}

async function api(req: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  const path = url.pathname;
  const secure = url.protocol === 'https:';

  // --- Public routes ---------------------------------------------------------
  if (path === '/api/login' && req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as { passphrase?: string };
    const result = await checkPassphrase(req, env, String(body.passphrase ?? ''));
    if (result === 'locked') return json({ error: 'Too many tries. Wait an hour and try again.' }, 429);
    if (result === 'wrong') return json({ error: 'Wrong passphrase.' }, 401);
    const session = await makeSession(env);
    // Cookie for same-site use; token for the app hosted elsewhere (e.g. GitHub Pages).
    return json({ ok: true, token: session.token }, 200, { 'set-cookie': sessionCookie(session.token, secure) });
  }
  if (path === '/api/logout' && req.method === 'POST') return json({ ok: true }, 200, { 'set-cookie': clearCookie(secure) });

  const widget = path.match(/^\/api\/widget\/([A-Za-z0-9_-]{20,})$/);
  if (widget && req.method === 'GET') {
    const token = await env.KV.get('widget-token');
    if (!token || token !== widget[1]) return json({ error: 'not-found' }, 404);
    const summary = await todaySummary(env);
    return json(summary ?? { error: 'no-data-yet' }, summary ? 200 : 404, { 'access-control-allow-origin': '*' });
  }

  // --- Everything below needs the login cookie ------------------------------
  if (!(await isAuthed(req, env))) return json({ error: 'not-logged-in' }, 401);

  if (path === '/api/me') {
    return json({
      ok: true,
      ai: !!env.ANTHROPIC_API_KEY,
      push: !!pushConfig(env, url.origin),
      aiSpentThisMonth: Math.round((await spentThisMonth(env)) * 100) / 100,
      aiCap: Number(env.MONTHLY_CAP_USD ?? 2),
    });
  }

  if (path === '/api/sync' && req.method === 'POST') {
    const body = (await req.json().catch(() => null)) as { state?: AppState } | null;
    const incoming = body?.state;
    if (!incoming || incoming.version !== 1 || typeof incoming.plans !== 'object' || typeof incoming.progress !== 'object') return json({ error: 'bad-state' }, 400);
    return json({ state: await saveMerged(env, incoming) });
  }
  if (path === '/api/state' && req.method === 'GET') return json({ state: await loadState(env) });

  if (path === '/api/schedule' && req.method === 'POST') return handleSchedule(req, env);
  if (path === '/api/stuck' && req.method === 'POST') return handleStuck(req, env, ctx);

  if (path === '/api/push/key') return json({ key: env.VAPID_PUBLIC_KEY ?? null });
  if (path === '/api/push/subscribe' && req.method === 'POST') {
    const sub = (await req.json().catch(() => null)) as PushSubscriptionJSON | null;
    if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: 'bad-subscription' }, 400);
    const subs = (await getSubs(env)).filter((s) => s.endpoint !== sub.endpoint);
    subs.push({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
    await env.KV.put(SUBS_KEY, JSON.stringify(subs.slice(-10)));
    await env.KV.put('app-origin', url.origin); // used as the VAPID contact for the 7am cron
    return json({ ok: true, devices: subs.length });
  }
  if (path === '/api/push/unsubscribe' && req.method === 'POST') {
    const { endpoint } = ((await req.json().catch(() => ({}))) as { endpoint?: string }) ?? {};
    await env.KV.put(SUBS_KEY, JSON.stringify((await getSubs(env)).filter((s) => s.endpoint !== endpoint)));
    return json({ ok: true });
  }
  if (path === '/api/push/test' && req.method === 'POST') return json(await sendMorningPush(env, url.origin));

  if (path === '/api/widget-token' && req.method === 'POST') {
    const { rotate } = ((await req.json().catch(() => ({}))) as { rotate?: boolean }) ?? {};
    let token = await env.KV.get('widget-token');
    if (!token || rotate) {
      token = b64url(crypto.getRandomValues(new Uint8Array(24)));
      await env.KV.put('widget-token', token);
    }
    return json({ url: `${url.origin}/api/widget/${token}` });
  }

  return json({ error: 'not-found' }, 404);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      // CORS so the app can be hosted on another site (GitHub Pages). Auth across sites uses a
      // bearer token, never cookies, so allowing any origin doesn't expose anything.
      const cors = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-max-age': '86400',
      };
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      let res: Response;
      try {
        res = await api(req, env, ctx, url);
      } catch (e) {
        console.error(e);
        res = json({ error: 'server-error' }, 500);
      }
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
      return out;
    }
    return env.ASSETS.fetch(req);
  },

  /** Runs every 15 minutes. Sends the morning notification once per weekday at the chosen time (Dublin time). */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const today = todayDublin();
    if (!isWeekday(today)) return;
    const state = await loadState(env);
    if (!state) return;
    const now = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Dublin', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const [h, m] = (state.settings.notifyTime || '07:00').split(':').map(Number);
    const [nh, nm] = now.split(':').map(Number);
    const minutesPast = nh * 60 + nm - (h * 60 + m);
    if (minutesPast < 0 || minutesPast >= 60) return; // only within the hour after the chosen time
    const flag = `pushed:${today}`;
    if (await env.KV.get(flag)) return;
    await env.KV.put(flag, '1', { expirationTtl: 3 * 24 * 3600 });
    const origin = (await env.KV.get('app-origin')) ?? '';
    if (!env.VAPID_SUBJECT && !origin) return;
    ctx.waitUntil(sendMorningPush(env, origin).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
