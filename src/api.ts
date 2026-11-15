/**
 * Client for the backend (the Cloudflare Worker).
 * - If the app is served by the Worker itself, the server address is blank (same site).
 * - If the app is on GitHub Pages, the server address is the Worker's URL, set in Settings.
 * Login gives a signed token, kept on this device and sent as "Authorization: Bearer".
 */
import type { AppState } from './engine/types';

const TOKEN = 'lc-daily-token';
const SERVER = 'lc-daily-server';

export const getServer = () => (localStorage.getItem(SERVER) ?? '').replace(/\/+$/, '');
export const setServer = (url: string) => {
  const clean = url.trim().replace(/\/+$/, '');
  if (clean) localStorage.setItem(SERVER, clean);
  else localStorage.removeItem(SERVER);
};
export const isConnected = () => !!localStorage.getItem(TOKEN);
const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN));

/** True when the app is hosted somewhere other than the Worker (so a server address is needed). */
export const needsServerAddress = () => location.hostname.endsWith('github.io');

/** fetch() to the backend with the right address and login token. */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN);
  const server = getServer();
  return fetch(`${server}${path}`, {
    ...init,
    credentials: server ? 'omit' : 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (res.status === 401 && path !== '/api/login') setToken(null);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? `HTTP ${res.status}`), { status: res.status });
  return data as T;
}

export interface Me {
  ok: boolean;
  ai: boolean;
  push: boolean;
  aiSpentThisMonth: number;
  aiCap: number;
}

export async function login(passphrase: string): Promise<void> {
  const r = await call<{ ok: boolean; token?: string }>('/api/login', { method: 'POST', body: JSON.stringify({ passphrase }) });
  if (!r.token) throw new Error('The server did not return a login token. Deploy the latest version of the Worker.');
  setToken(r.token);
}

export async function logout(): Promise<void> {
  await call('/api/logout', { method: 'POST' }).catch(() => {});
  setToken(null);
}

export const me = () => call<Me>('/api/me');

/** Send local state; the server merges it with what it has and returns the merged result. */
export async function syncState(state: AppState): Promise<AppState> {
  const r = await call<{ state: AppState }>('/api/sync', { method: 'POST', body: JSON.stringify({ state }) });
  return r.state;
}

// --- Push notifications ------------------------------------------------------
const urlB64ToUint8 = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('This browser does not support notifications. On iPhone, install the app to your home screen first.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were not allowed. You can allow them in your phone’s Settings → Notifications.');
  const { key } = await call<{ key: string | null }>('/api/push/key');
  if (!key) throw new Error('Push is not set up on the server yet (see README → push notifications).');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(key) }));
  await call('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
}

export async function disablePush(): Promise<void> {
  const sub = await currentPushSubscription();
  if (sub) {
    await call('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  }
}

export const testPush = () => call<{ sent: number; failed: number; reason?: string }>('/api/push/test', { method: 'POST' });

// --- Widget -------------------------------------------------------------------
export const widgetUrl = (rotate = false) => call<{ url: string }>('/api/widget-token', { method: 'POST', body: JSON.stringify({ rotate }) });
