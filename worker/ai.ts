import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { BASE_INTERVAL, clampAi } from '../src/engine/schedule';
import { json, type Env } from './env';

const SCHEDULE_MODEL = 'claude-haiku-5-5';
const STUCK_MODEL = 'claude-sonnet-5-5';
// US$ per million tokens (input, output) — used for the monthly spend cap.
const PRICE: Record<string, [number, number]> = { [SCHEDULE_MODEL]: [0.1, 0.5], [STUCK_MODEL]: [2, 10] };

const monthKey = () => `usage:${new Date().toISOString().slice(0, 7)}`;

export async function spentThisMonth(env: Env): Promise<number> {
  return Number((await env.KV.get(monthKey())) ?? 0);
}

async function overCap(env: Env): Promise<boolean> {
  return (await spentThisMonth(env)) >= Number(env.MONTHLY_CAP_USD ?? 2);
}

async function recordUsage(env: Env, model: string, usage: { input_tokens: number; output_tokens: number }) {
  const [pin, pout] = PRICE[model] ?? [2, 10];
  const cost = (usage.input_tokens * pin + usage.output_tokens * pout) / 1_000_000;
  const spent = await spentThisMonth(env);
  await env.KV.put(monthKey(), String(spent + cost), { expirationTtl: 60 * 60 * 24 * 62 });
}

const client = (env: Env, timeout: number) => new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout, maxRetries: 0 });

// ---------------------------------------------------------------------------
// Scheduling advisor (Haiku). Returns a decision the CLIENT and SERVER both clamp.
// ---------------------------------------------------------------------------
const ScheduleRequest = z.object({
  topic: z.string().max(200),
  subject: z.string().max(40),
  level: z.string().max(4),
  stars: z.number().int().min(1).max(5),
  starHistory: z.array(z.number().int().min(1).max(5)).max(50),
  note: z.string().max(200).optional(),
  daysToDeadline: z.number().int().nullable(),
  subjectWeight: z.number(),
});

const Decision = z.object({
  interval_days: z.number().describe('Days until this topic should come back'),
  priority: z.number().int().describe('-1 = lower priority, 0 = normal, 1 = bring forward first when due'),
  reason: z.string().describe('One short sentence the student will read, e.g. "Brought forward: your notes mention confusion twice"'),
});

const SCHEDULE_SYSTEM = `You help an Irish Leaving Certificate student decide when a study topic should come back for review.
The student rated how easy the topic was to study (1 = struggled, 5 = nailed it).
Baseline gaps: 1 star = ${BASE_INTERVAL[1]} days, 2 stars = ${BASE_INTERVAL[2]}, 3 stars = ${BASE_INTERVAL[3]}, 4 stars = ${BASE_INTERVAL[4]}. 5 stars retires the topic.
Adjust the gap using judgement: repeated low ratings, worrying notes, or a close exam/deadline mean bring it back sooner; steady improvement means it can wait longer.
Your answer is limited by the app to between half and one and a half times the baseline, so stay near it unless there is a clear reason.
Write the reason in plain, encouraging language for a 17-year-old, under 20 words.`;

export async function handleSchedule(req: Request, env: Env): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'ai-not-configured' }, 503);
  if (await overCap(env)) return json({ error: 'monthly-cap-reached' }, 429);
  const parsed = ScheduleRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'bad-request' }, 400);
  const r = parsed.data;
  if (r.stars >= 5) return json({ interval_days: null, priority: 0, reason: 'Nailed it — retired.' });

  const facts = [
    `Topic: ${r.topic} (${r.subject}, ${r.level === 'OL' ? 'Ordinary' : 'Higher'} Level)`,
    `Rating now: ${r.stars} stars`,
    `Earlier ratings (oldest first): ${r.starHistory.length ? r.starHistory.join(', ') : 'none'}`,
    `Student note: ${r.note ? JSON.stringify(r.note) : 'none'}`,
    `Days until the nearest exam or deadline for this subject: ${r.daysToDeadline ?? 'unknown'}`,
    `Subject priority weight (higher = weaker subject the student wants more time on): ${r.subjectWeight}`,
    `Baseline gap for this rating: ${BASE_INTERVAL[r.stars]} days`,
  ].join('\n');

  try {
    const response = await client(env, 4500).messages.parse({
      model: SCHEDULE_MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low', format: zodOutputFormat(Decision) },
      system: SCHEDULE_SYSTEM,
      messages: [{ role: 'user', content: facts }],
    });
    await recordUsage(env, SCHEDULE_MODEL, response.usage);
    if (response.stop_reason === 'refusal' || !response.parsed_output) return json({ error: 'no-decision' }, 502);
    // Guardrails enforced in code here as well as on the device.
    const d = clampAi(r.stars, response.parsed_output);
    return json({ interval_days: d.intervalDays, priority: d.priority, reason: d.reason });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'rate-limited' }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: 'ai-error', status: e.status }, 502);
    return json({ error: 'ai-unavailable' }, 502);
  }
}

// ---------------------------------------------------------------------------
// "I'm stuck" help (Sonnet), streamed back as plain text.
// ---------------------------------------------------------------------------
const StuckRequest = z.object({ topic: z.string().max(200), level: z.string().max(120) });

const STUCK_SYSTEM = `You are a friendly, practical study coach for an Irish Leaving Certificate student who has hit a wall on a topic.
Give a fresh angle to get them moving again: 3 to 5 short bullet points, each a concrete thing to do in the next 40 minutes.
Match the SEC Leaving Certificate syllabus and exam style for the level given. Mention a typical exam question type where useful.
Keep it under 150 words. Plain text with "- " bullets, no headings, no markdown bold.`;

export async function handleStuck(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'ai-not-configured' }, 503);
  if (await overCap(env)) return json({ error: 'monthly-cap-reached' }, 429);
  const parsed = StuckRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'bad-request' }, 400);

  const stream = client(env, 60_000).beta.messages.stream({
    model: STUCK_MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // if a safety classifier declines, the API retries on a fallback model
    output_config: { effort: 'medium' },
    system: STUCK_SYSTEM,
    messages: [{ role: 'user', content: `Topic: ${parsed.data.topic}\nCourse: ${parsed.data.level}\nI'm stuck on this. Give me a fresh way in.` }],
  });

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  ctx.waitUntil(
    (async () => {
      try {
        for await (const ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') await writer.write(enc.encode(ev.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') await writer.write(enc.encode('\n\n(Sorry, I can’t help with that one. Try the ideas above.)'));
        await recordUsage(env, final.model ?? STUCK_MODEL, final.usage);
      } catch {
        await writer.write(enc.encode('\n\n(The AI connection dropped. Try again in a minute.)')).catch(() => {});
      } finally {
        await writer.close().catch(() => {});
      }
    })(),
  );
  return new Response(readable, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
