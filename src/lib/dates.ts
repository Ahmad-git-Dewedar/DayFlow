/**
 * Date helpers built on local-time "YYYY-MM-DD" keys. Keys sort lexically,
 * serialize cleanly, and never drift across time zones or DST changes because
 * day arithmetic goes through the Date constructor's own normalization.
 */

export type DateKey = string;
export type WeekStart = 0 | 1; // 0 = Sunday, 1 = Monday

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toKey(fromKey(value)) === value;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export function startOfWeek(key: DateKey, weekStartsOn: WeekStart): DateKey {
  const offset = (fromKey(key).getDay() - weekStartsOn + 7) % 7;
  return addDays(key, -offset);
}

export function weekDays(key: DateKey, weekStartsOn: WeekStart): DateKey[] {
  const start = startOfWeek(key, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Inclusive list of keys from `from` to `to`. */
export function rangeKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export function diffDays(a: DateKey, b: DateKey): number {
  const ms = fromKey(a).getTime() - fromKey(b).getTime();
  return Math.round(ms / 86_400_000);
}

/* ---------- time of day ("HH:MM") ---------- */

export function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function nowMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

/* ---------- formatting ---------- */

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const id = JSON.stringify(opts);
  let f = fmtCache.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, opts);
    fmtCache.set(id, f);
  }
  return f;
}

export function formatDayLong(key: DateKey): string {
  return fmt({ weekday: "long", month: "long", day: "numeric" }).format(fromKey(key));
}

export function formatDayShort(key: DateKey): string {
  return fmt({ month: "short", day: "numeric" }).format(fromKey(key));
}

export function formatWeekday(key: DateKey, style: "short" | "narrow" = "short"): string {
  return fmt({ weekday: style }).format(fromKey(key));
}

export function formatTime(t: string): string {
  const d = new Date(2000, 0, 1, ...(t.split(":").map(Number) as [number, number]));
  return fmt({ hour: "numeric", minute: "2-digit" }).format(d);
}

/** "Today", "Tomorrow", "Yesterday", or a short date. */
export function relativeDayLabel(key: DateKey, today: DateKey = todayKey()): string {
  const diff = diffDays(key, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDayShort(key);
}

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
