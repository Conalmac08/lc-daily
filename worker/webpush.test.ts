import { describe, expect, it } from 'vitest';
import { b64url, b64urlDecode } from './auth';
import { encryptPayload, vapidAuth } from './webpush';

/** Decrypt as the browser (user agent) would, per RFC 8291, to prove the sender is correct. */
async function uaDecrypt(body: Uint8Array, uaKeys: CryptoKeyPair, authSecret: Uint8Array): Promise<string> {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const ciphertext = body.slice(21 + idlen);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', uaKeys.publicKey));
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, uaKeys.privateKey, 256));
  const te = new TextEncoder();
  const hk = async (s: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) =>
    new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  const info = new Uint8Array([...te.encode('WebPush: info\0'), ...uaPublic, ...asPublic]);
  const ikm = await hk(authSecret, ecdh, info, 32);
  const cek = await hk(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hk(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext));
  expect(plain.at(-1)).toBe(2); // last-record delimiter
  return new TextDecoder().decode(plain.slice(0, -1));
}

describe('web push', () => {
  it('encrypts a payload the browser can decrypt (RFC 8291)', async () => {
    const ua = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const sub = { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: b64url(await crypto.subtle.exportKey('raw', ua.publicKey)), auth: b64url(auth) } };
    const msg = JSON.stringify({ title: '🔥 3-day streak', body: 'Maths · Complex numbers: De Moivre’s theorem' });
    const body = await encryptPayload(sub, new TextEncoder().encode(msg));
    expect(new DataView(body.buffer).getUint32(16)).toBe(4096);
    expect(await uaDecrypt(body, ua, auth)).toBe(msg);
  });

  it('signs a VAPID JWT that verifies with the public key', async () => {
    const kp = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const pub = b64url(await crypto.subtle.exportKey('raw', kp.publicKey));
    const jwk = JSON.stringify(await crypto.subtle.exportKey('jwk', kp.privateKey));
    const header = await vapidAuth('https://web.push.apple.com/abc', pub, jwk, 'https://lc-daily.example.com');
    const m = header.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/)!;
    expect(m[4]).toBe(pub);
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(m[2])));
    expect(claims.aud).toBe('https://web.push.apple.com');
    expect(claims.sub).toBe('https://lc-daily.example.com');
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, b64urlDecode(m[3]), new TextEncoder().encode(`${m[1]}.${m[2]}`));
    expect(ok).toBe(true);
  });
});
