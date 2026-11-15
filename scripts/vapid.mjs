// Generate VAPID keys for push notifications. Run: npm run vapid
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
const pub = Buffer.from(raw).toString('base64url');
const jwk = JSON.stringify(await crypto.subtle.exportKey('jwk', kp.privateKey));
console.log('\n1) Put this in wrangler.jsonc → vars → VAPID_PUBLIC_KEY:\n');
console.log(pub);
console.log('\n2) Save this as a secret (paste it when asked):  npx wrangler secret put VAPID_PRIVATE_JWK\n');
console.log(jwk);
console.log('\nKeep the private key secret. Never commit it.\n');
