/**
 * Minimal Web Push sender using only WebCrypto (works in Cloudflare Workers).
 * - Payload encryption: RFC 8291 (aes128gcm content encoding, RFC 8188)
 * - Sender identification: VAPID (RFC 8292) with an ES256 JWT
 */
import { b64url, b64urlDecode } from './auth';

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const enc = new TextEncoder();
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

/** Encrypt a payload for one subscription. Returns the request body (aes128gcm). */
export async function encryptPayload(sub: PushSubscriptionJSON, payload: Uint8Array, opts: { salt?: Uint8Array; asKeys?: CryptoKeyPair } = {}): Promise<Uint8Array> {
  const uaPublic = b64urlDecode(sub.keys.p256dh); // 65 bytes, uncompressed point
  const authSecret = b64urlDecode(sub.keys.auth); // 16 bytes
  const asKeys = opts.asKeys ?? ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair);
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', asKeys.publicKey)) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey } as unknown as Parameters<SubtleCrypto['deriveBits']>[0], asKeys.privateKey, 256));

  // RFC 8291 §3.4
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  // Single record: payload + 0x02 delimiter.
  const plaintext = concat(payload, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext));

  // RFC 8188 header: salt(16) | rs(4) | idlen(1) | keyid(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

/** VAPID Authorization header value for an endpoint. */
export async function vapidAuth(endpoint: string, publicKey: string, privateJwk: string, subject: string): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', JSON.parse(privateJwk), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64url(sig)}, k=${publicKey}`;
}

export interface PushConfig {
  publicKey: string;
  privateJwk: string;
  subject: string;
}

/** Send one notification. Returns the HTTP status (404/410 mean the subscription is dead). */
export async function sendPush(sub: PushSubscriptionJSON, message: object, cfg: PushConfig): Promise<number> {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(message)));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      authorization: await vapidAuth(sub.endpoint, cfg.publicKey, cfg.privateJwk, cfg.subject),
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: String(6 * 3600),
      urgency: 'normal',
    },
    body,
  });
  return res.status;
}
