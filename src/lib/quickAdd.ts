import { isTime } from "./dates";
import type { Project } from "./store/types";

export type QuickAddResult = {
  title: string;
  start: string | null;
  duration: number | null;
  projectId: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "14:30", "9am", "9:15pm", "12am" → "HH:MM"; anything else → null. */
function parseTime(token: string): string | null {
  const t = token.toLowerCase();
  const twentyFour = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (twentyFour) {
    const value = `${pad(Number(twentyFour[1]))}:${twentyFour[2]}`;
    return isTime(value) ? value : null;
  }
  const twelve = /^(\d{1,2})(?::(\d{2}))?(am|pm)$/.exec(t);
  if (twelve) {
    let h = Number(twelve[1]);
    const m = Number(twelve[2] ?? "0");
    if (h < 1 || h > 12 || m > 59) return null;
    if (twelve[3] === "am") h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
    return `${pad(h)}:${pad(m)}`;
  }
  return null;
}

/** "45m", "1h", "1h30m", "1.5h" → minutes; anything else → null. */
function parseDuration(token: string): number | null {
  const t = token.toLowerCase();
  const hm = /^(\d{1,2})h(\d{1,2})m?$/.exec(t);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const h = /^(\d{1,2}(?:\.\d+)?)h$/.exec(t);
  if (h) return Math.round(Number(h[1]) * 60);
  const m = /^(\d{1,3})m(?:in)?$/.exec(t);
  if (m) return Number(m[1]);
  return null;
}

/**
 * Lightweight natural input for the quick-add bar, e.g.
 *   "Write proposal 14:00 45m #work" → time-block at 14:00 for 45 min in "work".
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
    if (allowTime && start === null) {
      const t = parseTime(token);
      if (t) {
        start = t;
        continue;
      }
    }
    if (duration === null) {
      const d = parseDuration(token);
      if (d !== null && d >= 5 && d <= 24 * 60) {
        duration = d;
        continue;
      }
    }
    if (projectId === null && token.length > 1 && token.startsWith("#")) {
      const name = token.slice(1).toLowerCase();
      const match = projects.find((p) => p.name.toLowerCase().replace(/\s+/g, "-") === name);
      if (match) {
        projectId = match.id;
        continue;
      }
    }
    rest.push(token);
  }

  return { title: rest.join(" "), start, duration, projectId };
}
