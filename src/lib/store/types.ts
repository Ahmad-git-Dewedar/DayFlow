import type { DateKey, WeekStart } from "../dates";

export type Priority = "low" | "normal" | "high";

export type Task = {
  id: string;
  title: string;
  notes: string;
  projectId: string | null;
  /** Day the task is planned for; null = inbox (unscheduled). */
  date: DateKey | null;
  /** Time-block start ("HH:MM"); null = anytime that day. */
  start: string | null;
  /** Planned length in minutes. */
  duration: number;
  priority: Priority;
  done: boolean;
  completedAt: number | null;
  createdAt: number;
};

/**
 * Fixed order, validated (all-pairs, light + dark) with the dataviz palette
 * checker: five hues is the most that stay distinguishable when any two
 * projects can sit side by side in a chart.
 */
export const PROJECT_COLORS = ["emerald", "sky", "amber", "violet", "rose"] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

export type Project = {
  id: string;
  name: string;
  color: ProjectColor;
  createdAt: number;
};

export type Habit = {
  id: string;
  name: string;
  /** Days per week the habit should be done (1–7). */
  targetPerWeek: number;
  /** Days the habit was done, keyed by DateKey. */
  log: Record<DateKey, true>;
  archived: boolean;
  createdAt: number;
};

export type FocusSession = {
  id: string;
  taskId: string | null;
  /** Snapshot of what was focused on, so history survives task deletion. */
  label: string;
  startedAt: number;
  endedAt: number;
  minutes: number;
  /** True when the full planned length was reached. */
  completed: boolean;
};

/**
 * The running/paused focus timer. Remaining time is derived from timestamps
 * (never ticked into the store), so it survives navigation and reloads.
 */
export type ActiveFocus = {
  taskId: string | null;
  label: string;
  durationMin: number;
  /** When the timer first started (for the session record). */
  firstStartedAt: number;
  /** Start of the current running stretch; null while paused. */
  runningSince: number | null;
  /** Milliseconds accumulated in earlier running stretches. */
  accumulatedMs: number;
};

export type Settings = {
  dailyFocusGoal: number; // minutes
  focusLength: number; // minutes
  weekStartsOn: WeekStart;
  notifications: boolean;
  /** Finished (or skipped) the welcome quiz. */
  onboarded: boolean;
  /** The DayFlow style picked in the welcome quiz. */
  profile: ProfileId | null;
  /** Which Today view opens first on small screens. */
  todayView: "list" | "timeline";
};

export const PROFILE_IDS = ["planner", "habits", "focus", "simple"] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];

export type State = {
  version: 1;
  tasks: Task[];
  projects: Project[];
  habits: Habit[];
  sessions: FocusSession[];
  activeFocus: ActiveFocus | null;
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  dailyFocusGoal: 120,
  focusLength: 25,
  weekStartsOn: 1,
  notifications: false,
  onboarded: false,
  profile: null,
  todayView: "list",
};

export function emptyState(): State {
  return {
    version: 1,
    tasks: [],
    projects: [],
    habits: [],
    sessions: [],
    activeFocus: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}
