import { describe, expect, it } from "vitest";
import { focusElapsedMs, reducer } from "./reducer";
import { emptyState, type State, type Task } from "./types";

const task = (p: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Write",
  notes: "",
  projectId: null,
  date: "2026-10-11",
  start: null,
  duration: 30,
  priority: "normal",
  done: false,
  completedAt: null,
  createdAt: 1,
  ...p,
});

const withTask = (t = task()): State => reducer(emptyState(), { type: "task/add", task: t });

describe("tasks", () => {
  it("toggles completion and records when it happened", () => {
    let s = withTask();
    s = reducer(s, { type: "task/toggle", id: "t1", now: 500 });
    expect(s.tasks[0]).toMatchObject({ done: true, completedAt: 500 });
    s = reducer(s, { type: "task/toggle", id: "t1", now: 900 });
    expect(s.tasks[0]).toMatchObject({ done: false, completedAt: null });
  });

  it("restores a deleted task at its original position (undo)", () => {
    let s = reducer(withTask(task({ id: "a" })), { type: "task/add", task: task({ id: "b" }) });
    s = reducer(s, { type: "task/add", task: task({ id: "c" }) });
    const b = s.tasks[1];
    s = reducer(s, { type: "task/delete", id: "b" });
    expect(s.tasks.map((t) => t.id)).toEqual(["a", "c"]);
    s = reducer(s, { type: "task/restore", task: b, index: 1 });
    expect(s.tasks.map((t) => t.id)).toEqual(["a", "b", "c"]);
    // Restoring twice is a no-op.
    expect(reducer(s, { type: "task/restore", task: b, index: 0 })).toBe(s);
  });

  it("keeps tasks when their project is deleted", () => {
    let s = reducer(emptyState(), { type: "project/add", project: { id: "p", name: "Work", color: "emerald", createdAt: 0 } });
    s = reducer(s, { type: "task/add", task: task({ projectId: "p" }) });
    s = reducer(s, { type: "project/delete", id: "p" });
    expect(s.projects).toHaveLength(0);
    expect(s.tasks[0].projectId).toBeNull();
  });
});

describe("habits", () => {
  it("toggles a day on and off", () => {
    let s = reducer(emptyState(), { type: "habit/add", habit: { id: "h", name: "Read", targetPerWeek: 7, log: {}, archived: false, createdAt: 0 } });
    s = reducer(s, { type: "habit/toggleDay", id: "h", day: "2026-10-11" });
    expect(s.habits[0].log).toEqual({ "2026-10-11": true });
    s = reducer(s, { type: "habit/toggleDay", id: "h", day: "2026-10-11" });
    expect(s.habits[0].log).toEqual({});
  });
});

describe("focus timer", () => {
  const start = (durationMin = 25): State =>
    reducer(emptyState(), {
      type: "focus/start",
      focus: { taskId: "t1", label: "Write", durationMin, firstStartedAt: 0, runningSince: 0, accumulatedMs: 0 },
    });

  it("excludes paused time from elapsed time", () => {
    let s = start();
    s = reducer(s, { type: "focus/pause", now: 10 * 60_000 });
    expect(focusElapsedMs(s.activeFocus!, 30 * 60_000)).toBe(10 * 60_000);
    s = reducer(s, { type: "focus/resume", now: 30 * 60_000 });
    expect(focusElapsedMs(s.activeFocus!, 35 * 60_000)).toBe(15 * 60_000);
  });

  it("logs a completed session capped at the planned length", () => {
    let s = start(25);
    s = reducer(s, { type: "focus/finish", now: 40 * 60_000, sessionId: "s1", completed: true });
    expect(s.activeFocus).toBeNull();
    expect(s.sessions[0]).toMatchObject({ id: "s1", minutes: 25, completed: true, taskId: "t1", label: "Write" });
  });

  it("logs partial sessions when finished early, but not ones under a minute", () => {
    let s = reducer(start(), { type: "focus/finish", now: 12 * 60_000, sessionId: "s1", completed: false });
    expect(s.sessions[0]).toMatchObject({ minutes: 12, completed: false });
    s = reducer(start(), { type: "focus/finish", now: 20_000, sessionId: "s2", completed: false });
    expect(s.sessions).toHaveLength(0);
    expect(s.activeFocus).toBeNull();
  });

  it("extends the planned length, capped at 4 hours", () => {
    let s = reducer(start(25), { type: "focus/extend", minutes: 5 });
    expect(s.activeFocus!.durationMin).toBe(30);
    s = reducer(start(238), { type: "focus/extend", minutes: 5 });
    expect(s.activeFocus!.durationMin).toBe(240);
  });

  it("unlinks the timer if its task is deleted, keeping the session going", () => {
    let s = reducer(start(), { type: "task/add", task: task() });
    s = reducer(s, { type: "task/delete", id: "t1" });
    expect(s.activeFocus).toMatchObject({ taskId: null, label: "Write" });
  });
});
