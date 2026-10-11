import { PROJECT_COLORS, type Habit, type ProfileId, type Project, type Settings, type State } from "./store/types";

export type { ProfileId };

/*
 * The welcome quiz: a few questions whose answers score four DayFlow styles.
 * The best fit becomes a concrete setup (focus length, daily goal, projects,
 * starter habits, start page) — so the quiz configures the app rather than
 * just labelling the user. All wording lives in the i18n messages; this file
 * is pure logic and unit-tested.
 */

export type GoalAnswer = "plan" | "habits" | "focus" | "list";
export type StyleAnswer = "hourly" | "blocks" | "flow";
export type SpanAnswer = 15 | 25 | 50 | 90;
export type Area = "work" | "study" | "personal" | "health" | "side" | "home";
export type HabitKey = "planTomorrow" | "study" | "journal" | "exercise" | "sideProject" | "tidy" | "water" | "read";

export type Answers = {
  goal: GoalAnswer | null;
  style: StyleAnswer | null;
  span: SpanAnswer | null;
  areas: Area[];
};

export const EMPTY_ANSWERS: Answers = { goal: null, style: null, span: null, areas: [] };

export type IconKey = "calendar" | "repeat" | "focus" | "list" | "clock" | "layers" | "wave";

export type Question =
  | { id: "goal"; kind: "single"; options: { value: GoalAnswer; icon: IconKey }[] }
  | { id: "style"; kind: "single"; options: { value: StyleAnswer; icon: IconKey }[] }
  | { id: "span"; kind: "single"; options: { value: SpanAnswer }[] }
  | { id: "areas"; kind: "multi"; options: { value: Area }[] };

export const QUESTIONS: Question[] = [
  {
    id: "goal",
    kind: "single",
    options: [
      { value: "plan", icon: "calendar" },
      { value: "habits", icon: "repeat" },
      { value: "focus", icon: "focus" },
      { value: "list", icon: "list" },
    ],
  },
  {
    id: "style",
    kind: "single",
    options: [
      { value: "hourly", icon: "clock" },
      { value: "blocks", icon: "layers" },
      { value: "flow", icon: "wave" },
    ],
  },
  { id: "span", kind: "single", options: [{ value: 15 }, { value: 25 }, { value: 50 }, { value: 90 }] },
  {
    id: "areas",
    kind: "multi",
    options: [{ value: "work" }, { value: "study" }, { value: "personal" }, { value: "health" }, { value: "side" }, { value: "home" }],
  },
];

export type Profile = {
  id: ProfileId;
  icon: IconKey;
  /** Where DayFlow opens after setup. */
  home: "/" | "/habits" | "/focus";
  todayView: Settings["todayView"];
  /** Focus sessions per day, used to derive the daily goal. */
  sessionsPerDay: number;
};

export const PROFILES: Record<ProfileId, Profile> = {
  planner: { id: "planner", icon: "calendar", home: "/", todayView: "timeline", sessionsPerDay: 3 },
  habits: { id: "habits", icon: "repeat", home: "/habits", todayView: "list", sessionsPerDay: 2 },
  focus: { id: "focus", icon: "focus", home: "/focus", todayView: "list", sessionsPerDay: 4 },
  simple: { id: "simple", icon: "list", home: "/", todayView: "list", sessionsPerDay: 2 },
};

const PROFILE_ORDER: ProfileId[] = ["planner", "focus", "habits", "simple"];
const PRIMARY_FOR_GOAL: Record<GoalAnswer, ProfileId> = { plan: "planner", habits: "habits", focus: "focus", list: "simple" };

type Scores = Record<ProfileId, number>;

const GOAL_POINTS: Record<GoalAnswer, Partial<Scores>> = {
  plan: { planner: 3, simple: 1 },
  habits: { habits: 3 },
  focus: { focus: 3, planner: 1 },
  list: { simple: 3 },
};
const STYLE_POINTS: Record<StyleAnswer, Partial<Scores>> = {
  hourly: { planner: 2, focus: 1 },
  blocks: { focus: 2, planner: 1, habits: 1 },
  flow: { simple: 2, habits: 1 },
};
const SPAN_POINTS: Record<SpanAnswer, Partial<Scores>> = {
  15: { habits: 1, simple: 1 },
  25: { planner: 1, habits: 1 },
  50: { focus: 1, planner: 1 },
  90: { focus: 2 },
};

export function scoreProfiles(a: Answers): Scores {
  const s: Scores = { planner: 0, habits: 0, focus: 0, simple: 0 };
  const add = (pts: Partial<Scores>) => {
    for (const [k, v] of Object.entries(pts)) s[k as ProfileId] += v ?? 0;
  };
  if (a.goal) add(GOAL_POINTS[a.goal]);
  if (a.style) add(STYLE_POINTS[a.style]);
  if (a.span) add(SPAN_POINTS[a.span]);
  return s;
}

/** All four styles, best fit first. Ties go to what the user said matters most. */
export function rankProfiles(a: Answers): ProfileId[] {
  const s = scoreProfiles(a);
  const primary = a.goal ? PRIMARY_FOR_GOAL[a.goal] : null;
  const tieBreak = (x: ProfileId) => (x === primary ? -1 : PROFILE_ORDER.indexOf(x));
  return [...PROFILE_ORDER].sort((x, y) => s[y] - s[x] || tieBreak(x) - tieBreak(y));
}

/* ---------------- turning a style into a setup ---------------- */

export type HabitSuggestion = { key: HabitKey; targetPerWeek: number };

const AREA_HABITS: Record<Area, HabitSuggestion> = {
  work: { key: "planTomorrow", targetPerWeek: 5 },
  study: { key: "study", targetPerWeek: 5 },
  personal: { key: "journal", targetPerWeek: 7 },
  health: { key: "exercise", targetPerWeek: 4 },
  side: { key: "sideProject", targetPerWeek: 3 },
  home: { key: "tidy", targetPerWeek: 5 },
};

const PROFILE_HABITS: Record<ProfileId, HabitSuggestion[]> = {
  planner: [{ key: "planTomorrow", targetPerWeek: 5 }],
  habits: [
    { key: "water", targetPerWeek: 7 },
    { key: "read", targetPerWeek: 7 },
  ],
  focus: [{ key: "read", targetPerWeek: 7 }],
  simple: [],
};

/** How many suggested habits start switched on — habit builders get a head start. */
const PRESELECTED_HABITS: Record<ProfileId, number> = { planner: 1, habits: 3, focus: 1, simple: 0 };

export const GOAL_OPTIONS = [30, 60, 90, 120, 180, 240, 300, 360];

export type Setup = {
  profile: ProfileId;
  focusLength: number;
  dailyFocusGoal: number;
  todayView: Settings["todayView"];
  /** Each chosen area becomes a project. */
  areas: Area[];
  habitSuggestions: HabitSuggestion[];
  /** Suggestions that start selected. */
  defaultHabits: HabitKey[];
};

export function buildSetup(profileId: ProfileId, a: Answers): Setup {
  const p = PROFILES[profileId];
  const focusLength = a.span ?? 25;
  const target = focusLength * p.sessionsPerDay;
  const dailyFocusGoal = GOAL_OPTIONS.reduce((best, g) => (Math.abs(g - target) < Math.abs(best - target) ? g : best));

  const suggestions: HabitSuggestion[] = [];
  for (const h of [...PROFILE_HABITS[profileId], ...a.areas.map((ar) => AREA_HABITS[ar])]) {
    if (!suggestions.some((s) => s.key === h.key)) suggestions.push(h);
  }
  const habitSuggestions = suggestions.slice(0, 5);

  return {
    profile: profileId,
    focusLength,
    dailyFocusGoal,
    todayView: p.todayView,
    areas: [...a.areas],
    habitSuggestions,
    defaultHabits: habitSuggestions.slice(0, PRESELECTED_HABITS[profileId]).map((h) => h.key),
  };
}

/** Localized names for what the setup creates (from the current language's messages). */
export type SetupLabels = { areas: Record<Area, string>; habits: Record<HabitKey, string> };

/**
 * Concrete changes for the store. Skips projects and habits whose names
 * already exist, so retaking the quiz never creates duplicates.
 */
export function planSetup(
  state: Pick<State, "projects" | "habits">,
  setup: Setup,
  chosenHabits: HabitKey[],
  labels: SetupLabels,
  makeId: () => string,
  now: number,
): { patch: Partial<Settings>; projects: Project[]; habits: Habit[] } {
  const existingProjects = new Set(state.projects.map((p) => p.name.toLowerCase()));
  const existingHabits = new Set(state.habits.map((h) => h.name.toLowerCase()));

  const projects: Project[] = setup.areas
    .map((a) => labels.areas[a])
    .filter((name) => !existingProjects.has(name.toLowerCase()))
    .map((name, i) => ({
      id: makeId(),
      name,
      color: PROJECT_COLORS[(state.projects.length + i) % PROJECT_COLORS.length],
      createdAt: now,
    }));

  const chosen = new Set(chosenHabits);
  const habits: Habit[] = setup.habitSuggestions
    .filter((h) => chosen.has(h.key) && !existingHabits.has(labels.habits[h.key].toLowerCase()))
    .map((h) => ({
      id: makeId(),
      name: labels.habits[h.key],
      targetPerWeek: h.targetPerWeek,
      log: {},
      archived: false,
      createdAt: now,
    }));

  return {
    patch: {
      profile: setup.profile,
      focusLength: setup.focusLength,
      dailyFocusGoal: setup.dailyFocusGoal,
      todayView: setup.todayView,
      onboarded: true,
    },
    projects,
    habits,
  };
}
