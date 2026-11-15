# LC Daily

Two Leaving Cert 2027 topics from two different subjects, every weekday. You rate each one from 1 to 5 stars after studying it, and the app decides when (or whether) it comes back.

- **App:** React + TypeScript PWA (installable, works offline, data saved on the device)
- **Backend:** one Cloudflare Worker (free tier) that serves the app and handles sync, AI, push notifications and the widget feed
- **AI:** Claude Haiku 5.5 suggests review gaps (always clamped to 50–150% of the standard gap, in code). Claude Sonnet 5.5 writes the "I'm stuck" tips. Without an API key, the app uses the standard schedule.

---

## 1. What you need

- A computer with **Node.js 20 or newer** ([nodejs.org](https://nodejs.org/))
- A free **Cloudflare** account ([dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up))
- Optional: a **Claude API key** from [console.anthropic.com](https://console.anthropic.com/) for the AI features

Open a terminal in this `lc-daily` folder for every command below.

```bash
npm install
```

## 2. Try it on your computer (optional)

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173). This runs the app only, with no backend, which is fine for trying it out.

To run the app **and** the backend together, create a file called `.dev.vars` (it's already in `.gitignore`, so it never gets committed) containing:

```
APP_PASSPHRASE=pick-any-test-passphrase
SESSION_SECRET=any-long-random-string
```

Then:

```bash
npm run worker:dev
```

Open http://localhost:8787.

## 3. Deploy to Cloudflare (step by step)

**3.1 Log in to Cloudflare** (a browser window opens):

```bash
npx wrangler login
```

**3.2 Create the storage** for your progress:

```bash
npx wrangler kv namespace create KV
```

It prints an `id`. Open `wrangler.jsonc` and replace `REPLACE_WITH_YOUR_KV_ID` with it.

**3.3 Deploy:**

```bash
npm run deploy
```

It prints your app's address, something like `https://lc-daily.<your-name>.workers.dev`. That's your app.

**3.4 Add your secrets.** Each command asks you to paste a value. Nothing is stored in the code.

Your passphrase, which you'll type once on each device. Make it long and not used anywhere else:

```bash
npx wrangler secret put APP_PASSPHRASE
```

A random signing key for logins. Generate one with the first command, then paste it into the second:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

```bash
npx wrangler secret put SESSION_SECRET
```

Optional, for the AI features: your Claude API key.

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

The Worker stops calling the AI once it has spent **$2 in a month** (change `MONTHLY_CAP_USD` in `wrangler.jsonc`). It's also worth setting a spend limit in the Anthropic Console. In normal use, expect a few cents a month: a rating costs about $0.0002 and an "I'm stuck" answer about $0.02.

**3.5 Turn on push notifications.** Generate a key pair:

```bash
npm run vapid
```

1. Paste the **public key** into `wrangler.jsonc` → `vars` → `VAPID_PUBLIC_KEY`.
2. Save the **private key** as a secret (paste the whole `{...}` line when asked):

```bash
npx wrangler secret put VAPID_PRIVATE_JWK
```

3. Deploy again so the public key is live:

```bash
npm run deploy
```

## 4. Set up your iPhone

1. Open your app's address in **Safari**.
2. Tap **Share → Add to Home Screen → Add**. From now on, always open LC Daily from the Home Screen icon.
3. In the app, go to **Settings → Sync & AI**, type your passphrase and tap **Connect this device**.
4. Under **Morning notification**, pick a time (default 07:00), tap **Turn on notifications**, then **Allow**, then **Send test**. A notification should appear within a few seconds.
5. On your laptop, open the same address and connect it the same way. Ratings sync both ways.

**Notifications on iPhone need iOS 16.4 or later, and only work from the Home Screen app**, not from a Safari tab. If you remove the app from your Home Screen, add it again and turn notifications on again.

## 5. iPhone widget (Home Screen and Lock Screen)

A website can't create real iPhone widgets. The free **Scriptable** app can, using your private widget link:

1. Install **Scriptable** from the App Store.
2. In LC Daily: **Settings → iPhone widget → Create my widget link → Copy widget script**.
3. In Scriptable, tap **+**, paste, and name the script **LC Daily**.
4. **Home Screen:** long-press an empty area → **Edit** → **Add Widget** → Scriptable → Medium → Add. Long-press the new widget → **Edit Widget** → Script: **LC Daily**.
5. **Lock Screen:** long-press the Lock Screen → **Customise** → Lock Screen → tap the widget row → Scriptable → the rectangular widget. Tap it → Script: **LC Daily**.

The widget shows your streak and today's 2 topics (Monday's at the weekend), and refreshes about every 30 minutes. If you're offline, it shows the last copy it loaded.

There's also a template at `widget/LC-Daily-Widget.js`, where you replace `PASTE_YOUR_WIDGET_URL_HERE` yourself. The in-app copy button does this for you.

Anyone with the widget link can see your 2 topics, streak and next deadline, and nothing else. **Settings → iPhone widget → Reset link** cancels the old link.

> A true native widget (no Scriptable) would need a native iOS app written in Swift and published through Apple. That's out of scope for v1.

## 6. Backup and restore

**Settings → Backup → Export JSON** downloads everything (ratings, plans, settings). **Import JSON** restores it on any device. If you're connected, the server also keeps a synced copy.

## 7. How it works

| Piece | Where |
|---|---|
| Subjects, topics, study ideas | `src/data/topics.ts`, `src/data/subjects.ts` |
| Deadlines and coursework tasks | `src/data/deadlines.ts` (editable in Settings) |
| Daily picking, deadline boost, Irish floor | `src/engine/select.ts` |
| Star ratings → review gaps, AI clamping | `src/engine/schedule.ts` |
| Streaks, reroll limits, progress | `src/engine/actions.ts` |
| Merging two devices | `src/engine/merge.ts` |
| Backend routes, 7am cron | `worker/index.ts` |
| AI prompts and spend cap | `worker/ai.ts` |
| Push encryption (RFC 8291 / VAPID) | `worker/webpush.ts` |

**Rules:**
- **Picks:** 2 topics from 2 different subjects, Monday to Friday, using Europe/Dublin dates. Today's picks never change once made.
- **Stars:** 5★ retires a topic. 4★ brings it back in about 6 weeks, 3★ about 3 weeks, 2★ about 10 days, 1★ about 5 days (bumped to the front). Two low ratings in a row mark it **weak**.
- **AI:** may move the gap between 50% and 150% of those values, and its one-line reason shows in the topic history. If it's switched off, offline, slow (more than 5 seconds) or returns something invalid, the standard gap is used.
- **Deadline boost:** a subject comes up ×1.5 more often 4 weeks before its deadline, rising to ×2.5 in the final week. Coursework tasks take one of the day's slots, and the Irish oral pulls from oral topics.
- **Reroll:** one per week, a reason is required, and the swap is always from the same subject.

## 8. Tests and simulation

```bash
npm test
```

Runs 40 tests: dates and DST, selection, spaced repetition, AI clamping, deadline boost, rerolls, streaks, merging and push encryption.

```bash
npm run simulate
```

Simulates September 2026 to June 2027 with random ratings and prints coverage per subject and how often Irish came up.

## 9. Free-tier limits

Cloudflare's free plan covers this comfortably:
- **Requests:** 100,000 a day.
- **Storage writes:** 1,000 a day, and each sync is one write.
- **Scheduled checks:** the 7am job checks every 15 minutes and does real work once per weekday.

## 10. Troubleshooting

- **"Wrong passphrase"**: re-run `npx wrangler secret put APP_PASSPHRASE`. After 10 wrong tries, that network is locked out for an hour.
- **No notification on iPhone**: make sure you opened the app from the Home Screen icon (not Safari), notifications are allowed in iPhone Settings → Notifications → LC Daily, and **Send test** says "Test sent".
- **AI says "standard schedule"**: there's no `ANTHROPIC_API_KEY` secret, or this month's cap is used up (shown in Settings → Sync & AI).
- **Widget says "Couldn't load"**: copy the script again from Settings (the link may have been reset).

## 11. Hosting the app on GitHub Pages

This repo has a workflow (`.github/workflows/pages.yml`) that runs the tests, builds the app and publishes it to GitHub Pages on every push to `main`. The address is `https://<your-username>.github.io/<repo-name>/`.

GitHub Pages only hosts static files, so the Pages copy works fully on its own: picks, ratings, streaks, timer and offline use, with progress saved on the device. Sync, AI, notifications and the widget need the Cloudflare Worker (steps 3–5). Once it's deployed:

1. In the Pages app, go to **Settings → Sync & AI**.
2. Paste the Worker address (e.g. `https://lc-daily.<your-name>.workers.dev`) into **Server address**.
3. Type your passphrase and tap **Connect this device**.

The Worker allows the Pages app to call it, using a login token rather than cookies.

Use one address on your phone. Data saved in the Pages app and in the Worker-hosted app is separate on each device until you connect both to the same Worker.
