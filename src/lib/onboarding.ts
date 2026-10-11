import { PROJECT_COLORS, type Habit, type ProfileId, type Project, type Settings, type State } from "./store/types";

export type { ProfileId };

/*
 * The welcome quiz: a few questions whose answers score four DayFlow styles.
 * The best fit becomes a concrete setup (focus length, daily goal, projects,
 * starter habits, start page) — so the quiz configures the app rather than
 * just labelling the user. Everything here is pure and unit-tested.
 */

export type GoalAnswer = "plan" | "habits" | "focus" | "list";
export type StyleAnswer = "hourly" | "blocks" | "flow";
export type SpanAnswer = 15 | 25 | 50 | 90;
export type Area = "work" | "study" | "personal" | "health" | "side" | "home";

export type Answers = {
  goal: GoalAnswer | null;
  style: StyleAnswer | null;
  span: SpanAnswer | null;
  areas: Area[];
};

export const EMPTY_ANSWERS: Answers = { goal: null, style: null, span: null, areas: [] };

export type IconKey = "calendar" | "repeat" | "focus" | "list" | "clock" | "layers" | "wave";

export type Option<T> = { value: T; label: string; hint?: string; icon?: IconKey };

export type Question =
  | { id: "goal"; kind: "single"; title: string; subtitle: string; options: Option<GoalAnswer>[] }
  | { id: "style"; kind: "single"; title: string; subtitle: string; options: Option<StyleAnswer>[] }
  | { id: "span"; kind: "single"; title: string; subtitle: string; options: Option<SpanAnswer>[] }
  | { id: "areas"; kind: "multi"; title: string; subtitle: string; options: Option<Area>[] };

export const QUESTIONS: Question[] = [
  {
    id: "goal",
    kind: "single",
    title: "What do you want DayFlow to help with most?",
    subtitle: "Pick the one that matters most right now.",
    options: [
      { value: "plan", label: "Planning my day", hint: "Know what to do and when", icon: "calendar" },
      { value: "habits", label: "Building habits", hint: "Show up a little every day", icon: "repeat" },
      { value: "focus", label: "Focusing deeply", hint: "Protect time for real work", icon: "focus" },
      { value: "list", label: "Keeping a simple list", hint: "Capture tasks, check them off", icon: "list" },
    ],
  },
  {
    id: "style",
    kind: "single",
    title: "How do you like your day to run?",
    subtitle: "There's no wrong answer.",
    options: [
      { value: "hourly", label: "Planned hour by hour", hint: "Every block has a job", icon: "clock" },
      { value: "blocks", label: "A few fixed blocks", hint: "Anchors, with space between", icon: "layers" },
      { value: "flow", label: "Go with the flow", hint: "Flexible, decided as I go", icon: "wave" },
    ],
  },
  {
    id: "span",
    kind: "single",
    title: "How long can you usually focus in one go?",
    subtitle: "We'll size your focus sessions to match.",
    options: [
      { value: 15, label: "About 15 minutes", hint: "Short bursts" },
      { value: 25, label: "About 25 minutes", hint: "The classic Pomodoro" },
      { value: 50, label: "About 50 minutes", hint: "Long, steady stretches" },
      { value: 90, label: "90 minutes or more", hint: "Deep-work sessions" },
    ],
  },
  {
    id: "areas",
    kind: "multi",
    title: "Which parts of life do you want to organize?",
    subtitle: "Choose any — each becomes a project. You can skip this.",
    options: [
      { value: "work", label: "Work" },
      { value: "study", label: "Study" },
      { value: "personal", label: "Personal" },
      { value: "health", label: "Health" },
      { value: "side", label: "Side project" },
      { value: "home", label: "Home" },
    ],
  },
];

export type Profile = {
  id: ProfileId;
  name: string;
  tagline: string;
  description: string;
  icon: IconKey;
  /** Where DayFlow opens after setup. */
  home: "/" | "/habits" | "/focus";
  homeLabel: string;
  todayView: Settings["todayView"];
  /** Focus sessions per day, used to derive the daily goal. */
  sessionsPerDay: number;
};

export const PROFILES: Record<ProfileId, Profile> = {
  planner: {
    id: "planner",
    name: "The Time-Blocker",
    tagline: "Give every hour a job.",
    description: "Your day lives on a timeline, so you always know what's next and what still fits.",
    icon: "calendar",
    home: "/",
    homeLabel: "Today, on the timeline",
    todayView: "timeline",
    sessionsPerDay: 3,
  },
  habits: {
    id: "habits",
    name: "The Habit Builder",
    tagline: "Small wins, every day.",
    description: "Daily check-ins, streaks and gentle weekly targets keep you consistent without pressure.",
    icon: "repeat",
    home: "/habits",
    homeLabel: "Your habits",
    todayView: "list",
    sessionsPerDay: 2,
  },
  focus: {
    id: "focus",
    name: "The Deep Worker",
    tagline: "Protect the hours that matter.",
    description: "Long, focused sessions on one thing at a time — and a clear view of where your focus goes.",
    icon: "focus",
    home: "/focus",
    homeLabel: "Focus",
    todayView: "list",
    sessionsPerDay: 4,
  },
  simple: {
    id: "simple",
    name: "The Minimalist",
    tagline: "A clean list, nothing more.",
    description: "Capture tasks, check them off, and keep everything else out of the way.",
    icon: "list",
    home: "/",
    homeLabel: "Today, as a simple list",
    todayView: "list",
    sessionsPerDay: 2,
  },
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

export const AREA_LABELS: Record<Area, string> = {
  work: "Work",
  study: "Study",
  personal: "Personal",
  health: "Health",
  side: "Side project",
  home: "Home",
};

export type HabitSuggestion = { name: string; targetPerWeek: number };

const AREA_HABITS: Record<Area, HabitSuggestion> = {
  work: { name: "Plan tomorrow", targetPerWeek: 5 },
  study: { name: "Study for 30 minutes", targetPerWeek: 5 },
  personal: { name: "Journal", targetPerWeek: 7 },
  health: { name: "Exercise", targetPerWeek: 4 },
  side: { name: "Work on my side project", targetPerWeek: 3 },
  home: { name: "Tidy up for 10 minutes", targetPerWeek: 5 },
};

const PROFILE_HABITS: Record<ProfileId, HabitSuggestion[]> = {
  planner: [{ name: "Plan tomorrow", targetPerWeek: 5 }],
  habits: [
    { name: "Drink water", targetPerWeek: 7 },
    { name: "Read 20 minutes", targetPerWeek: 7 },
  ],
  focus: [{ name: "Read 20 minutes", targetPerWeek: 7 }],
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
  projects: string[];
  habitSuggestions: HabitSuggestion[];
  /** Names of suggestions that start selected. */
  defaultHabits: string[];
};

export function buildSetup(profileId: ProfileId, a: Answers): Setup {
  const p = PROFILES[profileId];
  const focusLength = a.span ?? 25;
  const target = focusLength * p.sessionsPerDay;
  const dailyFocusGoal = GOAL_OPTIONS.reduce((best, g) => (Math.abs(g - target) < Math.abs(best - target) ? g : best));

  const suggestions: HabitSuggestion[] = [];
  const seen = new Set<string>();
  for (const h of [...PROFILE_HABITS[profileId], ...a.areas.map((ar) => AREA_HABITS[ar])]) {
    const key = h.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push(h);
    }
  }
  const habitSuggestions = suggestions.slice(0, 5);

  return {
    profile: profileId,
    focusLength,
    dailyFocusGoal,
    todayView: p.todayView,
    projects: a.areas.map((ar) => AREA_LABELS[ar]),
    habitSuggestions,
    defaultHabits: habitSuggestions.slice(0, PRESELECTED_HABITS[profileId]).map((h) => h.name),
  };
}

const GOAL_PHRASE: Record<GoalAnswer, string> = {
  plan: "plan your day",
  habits: "build lasting habits",
  focus: "do more deep work",
  list: "keep a simple to-do list",
};
const STYLE_PHRASE: Record<StyleAnswer, string> = {
  hourly: "a day planned hour by hour",
  blocks: "a few fixed blocks",
  flow: "a flexible day",
};

/** One plain sentence explaining the recommendation from the user's own answers. */
export function explain(a: Answers): string {
  const parts: string[] = [];
  if (a.goal) parts.push(`want to ${GOAL_PHRASE[a.goal]}`);
  if (a.style) parts.push(`prefer ${STYLE_PHRASE[a.style]}`);
  if (a.span) parts.push(`focus best in ${a.span === 90 ? "90-minute-plus" : `${a.span}-minute`} stretches`);
  if (parts.length === 0) return "";
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `You ${list}.`;
}

/**
 * Concrete changes for the store. Skips projects and habits whose names
 * already exist, so retaking the quiz never creates duplicates.
 */
export function planSetup(
  state: Pick<State, "projects" | "habits">,
  setup: Setup,
  chosenHabits: string[],
  makeId: () => string,
  now: number,
): { patch: Partial<Settings>; projects: Project[]; habits: Habit[] } {
  const existingProjects = new Set(state.projects.map((p) => p.name.toLowerCase()));
  const existingHabits = new Set(state.habits.map((h) => h.name.toLowerCase()));

  const projects: Project[] = setup.projects
    .filter((name) => !existingProjects.has(name.toLowerCase()))
    .map((name, i) => ({
      id: makeId(),
      name,
      color: PROJECT_COLORS[(state.projects.length + i) % PROJECT_COLORS.length],
      createdAt: now,
    }));

  const chosen = new Set(chosenHabits);
  const habits: Habit[] = setup.habitSuggestions
    .filter((h) => chosen.has(h.name) && !existingHabits.has(h.name.toLowerCase()))
    .map((h) => ({ id: makeId(), name: h.name, targetPerWeek: h.targetPerWeek, log: {}, archived: false, createdAt: now }));

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
