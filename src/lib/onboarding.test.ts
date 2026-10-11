import { describe, expect, it } from "vitest";
import { EMPTY_ANSWERS, buildSetup, explain, planSetup, rankProfiles, type Answers } from "./onboarding";
import { reducer } from "./store/reducer";
import { emptyState } from "./store/types";

const answers = (a: Partial<Answers>): Answers => ({ ...EMPTY_ANSWERS, ...a });

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
    const ranked = rankProfiles(EMPTY_ANSWERS);
    expect([...ranked].sort()).toEqual(["focus", "habits", "planner", "simple"]);
  });
});

describe("buildSetup", () => {
  it("sizes focus sessions from the answer and snaps the daily goal to a real option", () => {
    const s = buildSetup("focus", answers({ span: 50 }));
    expect(s.focusLength).toBe(50);
    expect(s.dailyFocusGoal).toBe(180); // 4 × 50 = 200 → nearest option 3h
    expect(buildSetup("habits", answers({ span: 15 })).dailyFocusGoal).toBe(30);
  });

  it("turns areas into projects and suggests one habit per area without duplicates", () => {
    const s = buildSetup("planner", answers({ span: 25, areas: ["work", "health"] }));
    expect(s.projects).toEqual(["Work", "Health"]);
    // "Plan tomorrow" comes from both the planner style and the Work area — listed once.
    expect(s.habitSuggestions.map((h) => h.name)).toEqual(["Plan tomorrow", "Exercise"]);
    expect(s.defaultHabits).toEqual(["Plan tomorrow"]);
    expect(s.todayView).toBe("timeline");
  });

  it("starts habit builders with several habits and minimalists with none", () => {
    expect(buildSetup("habits", answers({ areas: ["health"] })).defaultHabits).toHaveLength(3);
    expect(buildSetup("simple", answers({ areas: ["health"] })).defaultHabits).toEqual([]);
  });
});

describe("explain", () => {
  it("summarizes the answers in one sentence", () => {
    expect(explain(answers({ goal: "focus", style: "blocks", span: 90 }))).toBe(
      "You want to do more deep work, prefer a few fixed blocks and focus best in 90-minute-plus stretches.",
    );
    expect(explain(EMPTY_ANSWERS)).toBe("");
  });
});

describe("planSetup", () => {
  let n = 0;
  const id = () => `id-${++n}`;

  it("creates projects and the chosen habits, and marks onboarding done", () => {
    const setup = buildSetup("habits", answers({ span: 25, areas: ["work", "health"] }));
    const plan = planSetup(emptyState(), setup, ["Drink water", "Exercise"], id, 1000);
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

  it("never duplicates projects or habits that already exist (retaking the quiz)", () => {
    const state = {
      projects: [{ id: "p", name: "work", color: "emerald" as const, createdAt: 0 }],
      habits: [{ id: "h", name: "EXERCISE", targetPerWeek: 3, log: {}, archived: false, createdAt: 0 }],
    };
    const setup = buildSetup("planner", answers({ areas: ["work", "health", "home"] }));
    const plan = planSetup(state, setup, ["Exercise", "Tidy up for 10 minutes"], id, 0);
    expect(plan.projects.map((p) => p.name)).toEqual(["Health", "Home"]);
    expect(plan.projects[0].color).toBe("sky"); // continues the color order after existing projects
    expect(plan.habits.map((h) => h.name)).toEqual(["Tidy up for 10 minutes"]);
  });

  it("applies atomically through the reducer", () => {
    const setup = buildSetup("focus", answers({ span: 90, areas: ["study"] }));
    const plan = planSetup(emptyState(), setup, setup.defaultHabits, id, 0);
    const s = reducer(emptyState(), { type: "setup/apply", ...plan });
    expect(s.settings).toMatchObject({ onboarded: true, profile: "focus", focusLength: 90, dailyFocusGoal: 360 });
    expect(s.projects.map((p) => p.name)).toEqual(["Study"]);
    expect(s.habits.map((h) => h.name)).toEqual(["Read 20 minutes"]);
  });
});
