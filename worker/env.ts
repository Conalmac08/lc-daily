export interface Env {
  KV: KVNamespace;
  ASSETS: Fetcher;
  /** Secret: the passphrase you type to connect a device. */
  APP_PASSPHRASE: string;
  /** Secret: random string used to sign login cookies. */
  SESSION_SECRET: string;
  /** Secret: Claude API key (optional — without it the app uses the standard schedule). */
  ANTHROPIC_API_KEY?: string;
  /** Var: VAPID public key (base64url) for push notifications. */
  VAPID_PUBLIC_KEY?: string;
  /** Secret: VAPID private key as a JWK JSON string. */
  VAPID_PRIVATE_JWK?: string;
  /** Var: contact for push services, e.g. "https://lc-daily.example.workers.dev" or "mailto:you@example.com". */
  VAPID_SUBJECT?: string;
  /** Var: monthly AI spend cap in US dollars (default 2). */
  MONTHLY_CAP_USD?: string;
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
