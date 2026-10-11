import { describe, expect, it } from "vitest";
import { EMPTY_ANSWERS, buildSetup, planSetup, rankProfiles, type Answers, type SetupLabels } from "./onboarding";
import { reducer } from "./store/reducer";
import { emptyState } from "./store/types";
import { en } from "../i18n/en";
import { ar } from "../i18n/ar";

const answers = (a: Partial<Answers>): Answers => ({ ...EMPTY_ANSWERS, ...a });
const EN: SetupLabels = { areas: en.welcome.areas, habits: en.welcome.habitNames };
const AR: SetupLabels = { areas: ar.welcome.areas, habits: ar.welcome.habitNames };

describe("rankProfiles", () => {
  it("recommends the style that matches clear answers", () => {
    expect(rankProfiles(answers({ goal: "plan", style: "hourly", span: 25 }))[0]).toBe("planner");
    expect(rankProfiles(answers({ goal: "habits", style: "flow", span: 15 }))[0]).toBe("habits");
    expect(rankProfiles(answers({ goal: "focus", style: "blocks", span: 90 }))[0]).toBe("focus");
    expect(rankProfiles(answers({ goal: "list", style: "flow", span: 15 }))[0]).toBe("simple");
  });

  it("lets the other answers outweigh the headline goal when they agree", () => {
    // Wants to plan, but likes a flexible day in short bursts:
    // planner 3 vs minimalist 1 + 2 + 1 = 4.
    expect(rankProfiles(answers({ goal: "plan", style: "flow", span: 15 }))[0]).toBe("simple");
  });

  it("breaks ties in favour of what the user said matters most", () => {
    // habits 3 (goal) vs planner 2 (hourly) + 1 (50m) = 3 → tie, the goal wins.
    expect(rankProfiles(answers({ goal: "habits", style: "hourly", span: 50 }))[0]).toBe("habits");
  });

  it("always returns all four styles exactly once", () => {
    expect([...rankProfiles(EMPTY_ANSWERS)].sort()).toEqual(["focus", "habits", "planner", "simple"]);
  });
});

describe("buildSetup", () => {
  it("sizes focus sessions from the answer and snaps the daily goal to a real option", () => {
    const s = buildSetup("focus", answers({ span: 50 }));
    expect(s.focusLength).toBe(50);
    expect(s.dailyFocusGoal).toBe(180); // 4 × 50 = 200 → nearest option 3h
    expect(buildSetup("habits", answers({ span: 15 })).dailyFocusGoal).toBe(30);
  });

  it("suggests one habit per area without duplicates", () => {
    const s = buildSetup("planner", answers({ span: 25, areas: ["work", "health"] }));
    expect(s.areas).toEqual(["work", "health"]);
    // "Plan tomorrow" comes from both the planner style and the Work area — listed once.
    expect(s.habitSuggestions.map((h) => h.key)).toEqual(["planTomorrow", "exercise"]);
    expect(s.defaultHabits).toEqual(["planTomorrow"]);
    expect(s.todayView).toBe("timeline");
  });

  it("starts habit builders with several habits and minimalists with none", () => {
    expect(buildSetup("habits", answers({ areas: ["health"] })).defaultHabits).toHaveLength(3);
    expect(buildSetup("simple", answers({ areas: ["health"] })).defaultHabits).toEqual([]);
  });
});

describe("planSetup", () => {
  let n = 0;
  const id = () => `id-${++n}`;

  it("creates projects and the chosen habits, and marks onboarding done", () => {
    const setup = buildSetup("habits", answers({ span: 25, areas: ["work", "health"] }));
    const plan = planSetup(emptyState(), setup, ["water", "exercise"], EN, id, 1000);
    expect(plan.projects.map((p) => [p.name, p.color])).toEqual([
      ["Work", "emerald"],
      ["Health", "sky"],
    ]);
    expect(plan.habits.map((h) => [h.name, h.targetPerWeek])).toEqual([
      ["Drink water", 7],
      ["Exercise", 4],
    ]);
    expect(plan.patch).toEqual({ profile: "habits", focusLength: 25, dailyFocusGoal: 60, todayView: "list", onboarded: true });
  });

  it("names everything in the user's language", () => {
    const setup = buildSetup("planner", answers({ areas: ["work", "health"] }));
    const plan = planSetup(emptyState(), setup, ["planTomorrow", "exercise"], AR, id, 0);
    expect(plan.projects.map((p) => p.name)).toEqual(["العمل", "الصحة"]);
    expect(plan.habits.map((h) => h.name)).toEqual(["التخطيط للغد", "الرياضة"]);
  });

  it("never duplicates projects or habits that already exist (retaking the quiz)", () => {
    const state = {
      projects: [{ id: "p", name: "work", color: "emerald" as const, createdAt: 0 }],
      habits: [{ id: "h", name: "EXERCISE", targetPerWeek: 3, log: {}, archived: false, createdAt: 0 }],
    };
    const setup = buildSetup("planner", answers({ areas: ["work", "health", "home"] }));
    const plan = planSetup(state, setup, ["exercise", "tidy"], EN, id, 0);
    expect(plan.projects.map((p) => p.name)).toEqual(["Health", "Home"]);
    expect(plan.projects[0].color).toBe("sky"); // continues the color order after existing projects
    expect(plan.habits.map((h) => h.name)).toEqual(["Tidy up for 10 minutes"]);
  });

  it("applies atomically through the reducer", () => {
    const setup = buildSetup("focus", answers({ span: 90, areas: ["study"] }));
    const plan = planSetup(emptyState(), setup, setup.defaultHabits, EN, id, 0);
    const s = reducer(emptyState(), { type: "setup/apply", ...plan });
    expect(s.settings).toMatchObject({ onboarded: true, profile: "focus", focusLength: 90, dailyFocusGoal: 360 });
    expect(s.projects.map((p) => p.name)).toEqual(["Study"]);
    expect(s.habits.map((h) => h.name)).toEqual(["Read 20 minutes"]);
  });
});

describe("account persistence", () => {
  it("keeps the account (and finished onboarding) when all data is deleted", () => {
    let s = reducer(emptyState(), { type: "settings/update", patch: { onboarded: true, name: "Ahmad", language: "ar", profile: "focus" } });
    s = reducer(s, { type: "task/add", task: { id: "t", title: "x", notes: "", projectId: null, date: null, start: null, duration: 30, priority: "normal", done: false, completedAt: null, createdAt: 0 } });
    s = reducer(s, { type: "data/reset" });
    expect(s.tasks).toHaveLength(0);
    expect(s.settings).toMatchObject({ onboarded: true, name: "Ahmad", language: "ar", profile: "focus" });
  });
});
