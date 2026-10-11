import { addDays, toKey, type DateKey, type WeekStart, weekDays } from "./dates";
import type { FocusSession, Habit, State, Task } from "./store/types";

/* ---------------- habits ---------------- */

/**
 * Consecutive done-days ending today. If today isn't checked yet the streak
 * still counts through yesterday — a streak only breaks once a day is missed.
 */
export function currentStreak(habit: Habit, today: DateKey): number {
  let day = habit.log[today] ? today : addDays(today, -1);
  let count = 0;
  while (habit.log[day]) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

export function longestStreak(habit: Habit): number {
  const days = Object.keys(habit.log).sort();
  let best = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const d of days) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function weekCount(habit: Habit, anyDayInWeek: DateKey, weekStartsOn: WeekStart): number {
  return weekDays(anyDayInWeek, weekStartsOn).filter((d) => habit.log[d]).length;
}

/* ---------------- focus ---------------- */

export function sessionDay(s: FocusSession): DateKey {
  return toKey(new Date(s.startedAt));
}

export function focusMinutesByDay(sessions: FocusSession[], days: DateKey[]): number[] {
  const totals = new Map<DateKey, number>(days.map((d) => [d, 0]));
  for (const s of sessions) {
    const d = sessionDay(s);
    if (totals.has(d)) totals.set(d, totals.get(d)! + s.minutes);
  }
  return days.map((d) => totals.get(d)!);
}

export function focusMinutesOn(sessions: FocusSession[], day: DateKey): number {
  return focusMinutesByDay(sessions, [day])[0];
}

/** Focus minutes per project across the given days. Unlinked sessions go to `null`. */
export function focusByProject(
  state: Pick<State, "sessions" | "tasks">,
  days: DateKey[],
): Map<string | null, number> {
  const inRange = new Set(days);
  const taskProject = new Map(state.tasks.map((t) => [t.id, t.projectId]));
  const out = new Map<string | null, number>();
  for (const s of state.sessions) {
    if (!inRange.has(sessionDay(s))) continue;
    const key = s.taskId ? (taskProject.get(s.taskId) ?? null) : null;
    out.set(key, (out.get(key) ?? 0) + s.minutes);
  }
  return out;
}

/* ---------------- tasks ---------------- */

export function tasksCompletedByDay(tasks: Task[], days: DateKey[]): number[] {
  const totals = new Map<DateKey, number>(days.map((d) => [d, 0]));
  for (const t of tasks) {
    if (!t.done || t.completedAt === null) continue;
    const d = toKey(new Date(t.completedAt));
    if (totals.has(d)) totals.set(d, totals.get(d)! + 1);
  }
  return days.map((d) => totals.get(d)!);
}

/** Order for a day's list: open before done, timed by start, then priority, then creation. */
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 } as const;
export function compareTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.start && b.start && a.start !== b.start) return a.start < b.start ? -1 : 1;
  if (!!a.start !== !!b.start) return a.start ? -1 : 1;
  if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return a.createdAt - b.createdAt;
}

export function tasksForDay(tasks: Task[], day: DateKey): Task[] {
  return tasks.filter((t) => t.date === day).sort(compareTasks);
}

/** Minutes of time-blocked work planned on a day (open tasks only). */
export function plannedMinutes(tasks: Task[], day: DateKey): number {
  return tasks
    .filter((t) => t.date === day && !t.done && t.start)
    .reduce((sum, t) => sum + t.duration, 0);
}
