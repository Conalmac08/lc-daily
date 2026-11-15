import type { Env } from './env';

const COOKIE = 'lc_session';
const YEAR = 365 * 24 * 3600;
const enc = new TextEncoder();

export const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export function b64urlDecode(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function hmac(secret: string, msg: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', key, enc.encode(msg));
}

/** Constant-time string comparison via HMAC of both sides. */
async function safeEqual(a: string, b: string, secret: string): Promise<boolean> {
  const [x, y] = await Promise.all([hmac(secret, a), hmac(secret, b)]);
  const ua = new Uint8Array(x);
  const ub = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

/** A signed session token "<expiry>.<signature>", valid for a year. */
export async function makeSession(env: Env): Promise<{ token: string }> {
  const exp = Math.floor(Date.now() / 1000) + YEAR;
  const sig = b64url(await hmac(env.SESSION_SECRET, `v1.${exp}`));
  return { token: `${exp}.${sig}` };
}

export const sessionCookie = (token: string, secure: boolean) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${YEAR}${secure ? '; Secure' : ''}`;

export const clearCookie = (secure: boolean) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;

/** Accepts either "Authorization: Bearer <token>" or the session cookie. */
export async function isAuthed(req: Request, env: Env): Promise<boolean> {
  const bearer = (req.headers.get('authorization') ?? '').match(/^Bearer ([0-9]+)\.([A-Za-z0-9_-]+)$/);
  const cookie = (req.headers.get('cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9]+)\\.([A-Za-z0-9_-]+)`));
  const m = bearer ?? cookie;
  if (!m) return false;
  const exp = Number(m[1]);
  if (!exp || exp < Date.now() / 1000) return false;
  const expected = b64url(await hmac(env.SESSION_SECRET, `v1.${exp}`));
  return safeEqual(expected, m[2], env.SESSION_SECRET);
}

/** Check the passphrase, with a simple per-IP limit of 10 failed tries per hour. */
export async function checkPassphrase(req: Request, env: Env, passphrase: string): Promise<'ok' | 'wrong' | 'locked'> {
  const ip = req.headers.get('cf-connecting-ip') ?? 'local';
  const key = `login-fail:${ip}:${new Date().toISOString().slice(0, 13)}`;
  const fails = Number((await env.KV.get(key)) ?? 0);
  if (fails >= 10) return 'locked';
  if (env.APP_PASSPHRASE && (await safeEqual(passphrase, env.APP_PASSPHRASE, env.SESSION_SECRET))) return 'ok';
  await env.KV.put(key, String(fails + 1), { expirationTtl: 3600 });
  return 'wrong';
}
