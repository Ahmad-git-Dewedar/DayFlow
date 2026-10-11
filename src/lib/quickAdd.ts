import { isTime } from "./dates";
import type { Project } from "./store/types";

export type QuickAddResult = {
  title: string;
  start: string | null;
  duration: number | null;
  projectId: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) digits → 0-9, so "٢م" works like "2م". */
function asciiDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

/** "14:30", "9am", "9:15pm", "12am", Arabic "9ص" / "2م" → "HH:MM"; anything else → null. */
function parseTime(token: string): string | null {
  const t = token.toLowerCase();
  const twentyFour = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (twentyFour) {
    const value = `${pad(Number(twentyFour[1]))}:${twentyFour[2]}`;
    return isTime(value) ? value : null;
  }
  const twelve = /^(\d{1,2})(?::(\d{2}))?(am|pm|ص|م)$/.exec(t);
  if (twelve) {
    let h = Number(twelve[1]);
    const m = Number(twelve[2] ?? "0");
    if (h < 1 || h > 12 || m > 59) return null;
    const pm = twelve[3] === "pm" || twelve[3] === "م";
    if (!pm) h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
    return `${pad(h)}:${pad(m)}`;
  }
  return null;
}

const H = "(?:h|س|ساعة|ساعات)";
const M = "(?:m|min|د|دقيقة|دقائق)";

/** "45m", "1h", "1h30m", "1.5h", Arabic "45د", "1س", "1س30د" → minutes; anything else → null. */
function parseDuration(token: string): number | null {
  const t = token.toLowerCase();
  const hm = new RegExp(`^(\\d{1,2})${H}(\\d{1,2})${M}?$`).exec(t);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const h = new RegExp(`^(\\d{1,2}(?:\\.\\d+)?)${H}$`).exec(t);
  if (h) return Math.round(Number(h[1]) * 60);
  const m = new RegExp(`^(\\d{1,3})${M}$`).exec(t);
  if (m) return Number(m[1]);
  return null;
}

/** Project names compare case-, space- and Arabic-article-insensitively ("#عمل" finds "العمل"). */
function projectKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^ال/, "");
}

/**
 * Lightweight natural input for the quick-add bar, e.g.
 *   "Write proposal 14:00 45m #work" → time-block at 14:00 for 45 min in "work"
 *   "كتابة تقرير 2م 45د #عمل"        → time-block at 14:00 for 45 min in "العمل"
 * Only whole-word tokens are consumed; everything else stays in the title.
 */
export function parseQuickAdd(
  input: string,
  projects: Project[],
  options: { parseTime?: boolean } = {},
): QuickAddResult {
  const { parseTime: allowTime = true } = options;
  let start: string | null = null;
  let duration: number | null = null;
  let projectId: string | null = null;
  const rest: string[] = [];

  for (const token of input.trim().split(/\s+/)) {
    if (!token) continue;
    const norm = asciiDigits(token);
    if (allowTime && start === null) {
      const t = parseTime(norm);
      if (t) {
        start = t;
        continue;
      }
    }
    if (duration === null) {
      const d = parseDuration(norm);
      if (d !== null && d >= 5 && d <= 24 * 60) {
        duration = d;
        continue;
      }
    }
    if (projectId === null && token.length > 1 && token.startsWith("#")) {
      const key = projectKey(token.slice(1));
      const match = projects.find((p) => projectKey(p.name) === key);
      if (match) {
        projectId = match.id;
        continue;
      }
    }
    rest.push(token);
  }

  return { title: rest.join(" "), start, duration, projectId };
}
