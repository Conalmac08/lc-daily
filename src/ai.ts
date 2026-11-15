/**
 * Client for the AI features. Requests go to the app's own backend (/api), which
 * holds the Claude API key — it never touches the browser. If the device isn't
 * connected, is offline, or anything fails, the standard schedule is used.
 */
import { apiFetch, isConnected } from './api';
import { baselineDecision, clampAi, type Decision } from './engine/schedule';

export const aiAvailable = () => isConnected() && navigator.onLine;

export interface ScheduleRequest {
  topic: string;
  subject: string;
  level: string;
  stars: number;
  starHistory: number[];
  note?: string;
  daysToDeadline: number | null;
  subjectWeight: number;
}

/** Ask the AI advisor; any failure, timeout (>5 s) or bad JSON → baseline. */
export async function scheduleDecision(req: ScheduleRequest, enabled: boolean): Promise<Decision> {
  if (!enabled || !aiAvailable() || req.stars >= 5) return baselineDecision(req.stars);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await apiFetch('/api/schedule', { method: 'POST', body: JSON.stringify(req), signal: ctrl.signal });
    if (!res.ok) return baselineDecision(req.stars);
    return clampAi(req.stars, await res.json());
  } catch {
    return baselineDecision(req.stars);
  } finally {
    clearTimeout(timer);
  }
}

/** Stream "I'm stuck" help. Calls onText with the text so far. */
export async function stuckHelp(topic: string, level: string, onText: (t: string) => void): Promise<void> {
  const res = await apiFetch('/api/stuck', { method: 'POST', body: JSON.stringify({ topic, level }) });
  if (!res.ok || !res.body) throw Object.assign(new Error('failed'), { status: res.status });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    onText(text);
  }
}
