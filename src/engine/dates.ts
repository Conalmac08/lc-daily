/** All dates are YYYY-MM-DD strings in Europe/Dublin local time. Arithmetic is done in UTC on the date only, so DST never shifts a day. */
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin', year: 'numeric', month: '2-digit', day: '2-digit' });

export function todayDublin(now: Date = new Date()): string {
  return fmt.format(now); // en-CA gives YYYY-MM-DD
}

const toUTC = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
};
const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(d: string, n: number): string {
  return fromUTC(toUTC(d) + n * 86400000);
}
export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(a) - toUTC(b)) / 86400000); // a - b
}
/** 0 = Sunday … 6 = Saturday */
export function weekday(d: string): number {
  return new Date(toUTC(d)).getUTCDay();
}
export const isWeekday = (d: string) => { const w = weekday(d); return w >= 1 && w <= 5; };

/** Monday of the week containing d (Mon–Sun weeks). */
export function weekStart(d: string): string {
  const w = weekday(d);
  return addDays(d, w === 0 ? -6 : 1 - w);
}
export function nextWeekday(d: string): string {
  let x = addDays(d, 1);
  while (!isWeekday(x)) x = addDays(x, 1);
  return x;
}
export function prevWeekday(d: string): string {
  let x = addDays(d, -1);
  while (!isWeekday(x)) x = addDays(x, -1);
  return x;
}
export function weekdaysOfWeek(monday: string): string[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}
export function prettyDate(d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }): string {
  return new Date(toUTC(d)).toLocaleDateString('en-IE', { ...opts, timeZone: 'UTC' });
}
