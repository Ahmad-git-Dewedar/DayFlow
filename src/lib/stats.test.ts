import { describe, expect, it } from "vitest";
import { compareTasks, currentStreak, focusByProject, focusMinutesByDay, longestStreak, weekCount } from "./stats";
import type { FocusSession, Habit, Task } from "./store/types";
import { fromKey } from "./dates";

const habit = (days: string[]): Habit => ({
  id: "h",
  name: "Read",
  targetPerWeek: 7,
  log: Object.fromEntries(days.map((d) => [d, true])),
  archived: false,
  createdAt: 0,
});

describe("habit streaks", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak(habit(["2026-10-09", "2026-10-10", "2026-10-11"]), "2026-10-11")).toBe(3);
  });

  it("keeps yesterday's streak alive until today is over", () => {
    expect(currentStreak(habit(["2026-10-09", "2026-10-10"]), "2026-10-11")).toBe(2);
  });

  it("breaks after a missed day", () => {
    expect(currentStreak(habit(["2026-10-08", "2026-10-09"]), "2026-10-11")).toBe(0);
  });

  it("finds the longest run anywhere in history", () => {
    expect(longestStreak(habit(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-10", "2026-09-30", "2026-10-01"]))).toBe(3);
    expect(longestStreak(habit([]))).toBe(0);
  });

  it("counts check-ins within the week", () => {
    // Week of Mon 2026-10-05 … Sun 2026-10-11.
    expect(weekCount(habit(["2026-10-04", "2026-10-05", "2026-10-11", "2026-10-12"]), "2026-10-07", 1)).toBe(2);
  });
});

const session = (day: string, minutes: number, taskId: string | null = null): FocusSession => {
  const startedAt = fromKey(day).getTime() + 10 * 3_600_000;
  return { id: `${day}-${minutes}-${taskId}`, taskId, label: "x", startedAt, endedAt: startedAt + minutes * 60_000, minutes, completed: true };
};

describe("focus aggregation", () => {
  it("sums minutes per day and ignores days outside the range", () => {
    const sessions = [session("2026-10-10", 25), session("2026-10-10", 50), session("2026-10-11", 30), session("2026-09-01", 99)];
    expect(focusMinutesByDay(sessions, ["2026-10-10", "2026-10-11", "2026-10-12"])).toEqual([75, 30, 0]);
  });

  it("groups by the linked task's project, with unlinked sessions under null", () => {
    const tasks = [{ id: "t1", projectId: "p1" }, { id: "t2", projectId: null }] as Task[];
    const sessions = [session("2026-10-10", 25, "t1"), session("2026-10-10", 20, "t2"), session("2026-10-10", 15, null), session("2026-10-10", 10, "deleted")];
    const byProject = focusByProject({ tasks, sessions }, ["2026-10-10"]);
    expect(byProject.get("p1")).toBe(25);
    expect(byProject.get(null)).toBe(45);
  });
});

describe("task ordering", () => {
  const t = (p: Partial<Task>): Task => ({
    id: Math.random().toString(),
    title: "t",
    notes: "",
    projectId: null,
    date: "2026-10-11",
    start: null,
    duration: 30,
    priority: "normal",
    done: false,
    completedAt: null,
    createdAt: 0,
    ...p,
  });

  it("puts open before done, timed before untimed, earlier first, then priority", () => {
    const done = t({ title: "done", done: true, start: "08:00" });
    const late = t({ title: "late", start: "15:00" });
    const early = t({ title: "early", start: "09:00" });
    const high = t({ title: "high", priority: "high" });
    const low = t({ title: "low", priority: "low" });
    const sorted = [done, low, late, high, early].sort(compareTasks).map((x) => x.title);
    expect(sorted).toEqual(["early", "late", "high", "low", "done"]);
  });
});
