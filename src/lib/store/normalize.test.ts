import { describe, expect, it } from "vitest";
import { looksLikeExport, normalizeState } from "./normalize";
import { emptyState } from "./types";
import { sampleState } from "./sample";

describe("normalizeState", () => {
  it("returns an empty state for garbage", () => {
    expect(normalizeState(null)).toEqual(emptyState());
    expect(normalizeState("nope")).toEqual(emptyState());
    expect(normalizeState([1, 2])).toEqual(emptyState());
  });

  it("drops invalid records and repairs invalid fields", () => {
    const s = normalizeState({
      projects: [{ id: "p", name: "Work", color: "neon" }, { id: "", name: "x" }],
      tasks: [
        { id: "a", title: "  Valid  ", date: "2026-02-30", start: "25:00", duration: -5, priority: "urgent", projectId: "p" },
        { id: "b", title: "" },
        { id: "c", title: "Ghost project", projectId: "missing" },
        { id: "a", title: "Duplicate id" },
        "not an object",
      ],
      habits: [{ id: "h", name: "Read", targetPerWeek: 99, log: { "2026-10-11": true, bad: true, "2026-10-10": "yes" } }],
      sessions: [{ id: "s", minutes: 0, startedAt: 1 }, { id: "s2", minutes: 25, startedAt: 1000 }],
      settings: { dailyFocusGoal: "lots", weekStartsOn: 0, focusLength: 1, profile: "wizard", todayView: "grid" },
    });

    expect(s.projects).toEqual([{ id: "p", name: "Work", color: "emerald", createdAt: 0 }]);
    expect(s.tasks.map((t) => t.id)).toEqual(["a", "c"]);
    expect(s.tasks[0]).toMatchObject({ title: "Valid", date: null, start: null, duration: 5, priority: "normal", projectId: "p" });
    expect(s.tasks[1].projectId).toBeNull();
    expect(s.habits[0]).toMatchObject({ targetPerWeek: 7, log: { "2026-10-11": true } });
    expect(s.sessions.map((x) => x.id)).toEqual(["s2"]);
    expect(s.settings).toEqual({
      dailyFocusGoal: 120,
      focusLength: 5,
      weekStartsOn: 0,
      notifications: false,
      onboarded: false,
      profile: null,
      todayView: "list",
      name: "",
      language: "en",
    });
  });

  it("round-trips real data unchanged, including through JSON", () => {
    const sample = sampleState("2026-10-11");
    expect(normalizeState(JSON.parse(JSON.stringify(sample)))).toEqual(sample);
  });

  it("keeps the local account (name, language) and rejects bad values", () => {
    expect(normalizeState({ settings: { name: "  Sara  ", language: "ar", onboarded: true } }).settings).toMatchObject({
      name: "Sara",
      language: "ar",
      onboarded: true,
    });
    expect(normalizeState({ settings: { name: 42, language: "fr" } }).settings).toMatchObject({ name: "", language: "en" });
  });

  it("recognizes exports", () => {
    expect(looksLikeExport({ tasks: [] })).toBe(true);
    expect(looksLikeExport({ hello: "world" })).toBe(false);
  });
});
