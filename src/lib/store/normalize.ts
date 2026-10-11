import { isDateKey, isTime } from "../dates";
import {
  DEFAULT_SETTINGS,
  PROFILE_IDS,
  PROJECT_COLORS,
  emptyState,
  type ActiveFocus,
  type ProfileId,
  type FocusSession,
  type Habit,
  type Priority,
  type Project,
  type ProjectColor,
  type Settings,
  type State,
  type Task,
} from "./types";

/**
 * Turns untrusted data (localStorage, an imported file) into a valid State.
 * Invalid records are dropped and invalid fields fall back to defaults, so a
 * single bad value never takes the whole app down.
 */

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const PRIORITIES: Priority[] = ["low", "normal", "high"];

function normTask(v: unknown, projectIds: Set<string>): Task | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const title = str(v.title).trim();
  if (!id || !title) return null;
  const done = v.done === true;
  const projectId = typeof v.projectId === "string" && projectIds.has(v.projectId) ? v.projectId : null;
  return {
    id,
    title: title.slice(0, 300),
    notes: str(v.notes).slice(0, 5000),
    projectId,
    date: isDateKey(v.date) ? v.date : null,
    start: isTime(v.start) ? v.start : null,
    duration: clamp(Math.round(num(v.duration, 30)), 5, 24 * 60),
    priority: PRIORITIES.includes(v.priority as Priority) ? (v.priority as Priority) : "normal",
    done,
    completedAt: done ? num(v.completedAt, num(v.createdAt, 0)) : null,
    createdAt: num(v.createdAt, 0),
  };
}

function normProject(v: unknown): Project | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const name = str(v.name).trim();
  if (!id || !name) return null;
  const color = PROJECT_COLORS.includes(v.color as ProjectColor) ? (v.color as ProjectColor) : "emerald";
  return { id, name: name.slice(0, 60), color, createdAt: num(v.createdAt, 0) };
}

function normHabit(v: unknown): Habit | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const name = str(v.name).trim();
  if (!id || !name) return null;
  const log: Habit["log"] = {};
  if (isObj(v.log)) {
    for (const [k, val] of Object.entries(v.log)) if (val === true && isDateKey(k)) log[k] = true;
  }
  return {
    id,
    name: name.slice(0, 80),
    targetPerWeek: clamp(Math.round(num(v.targetPerWeek, 7)), 1, 7),
    log,
    archived: v.archived === true,
    createdAt: num(v.createdAt, 0),
  };
}

function normSession(v: unknown): FocusSession | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const minutes = Math.round(num(v.minutes, 0));
  const startedAt = num(v.startedAt, NaN);
  if (!id || minutes < 1 || !Number.isFinite(startedAt)) return null;
  return {
    id,
    taskId: typeof v.taskId === "string" ? v.taskId : null,
    label: str(v.label, "Focus session").slice(0, 300),
    startedAt,
    endedAt: num(v.endedAt, startedAt + minutes * 60_000),
    minutes: clamp(minutes, 1, 24 * 60),
    completed: v.completed === true,
  };
}

function normFocus(v: unknown): ActiveFocus | null {
  if (!isObj(v)) return null;
  const durationMin = Math.round(num(v.durationMin, 0));
  const firstStartedAt = num(v.firstStartedAt, NaN);
  if (durationMin < 1 || !Number.isFinite(firstStartedAt)) return null;
  return {
    taskId: typeof v.taskId === "string" ? v.taskId : null,
    label: str(v.label, "Focus session"),
    durationMin: clamp(durationMin, 1, 240),
    firstStartedAt,
    runningSince: typeof v.runningSince === "number" && Number.isFinite(v.runningSince) ? v.runningSince : null,
    accumulatedMs: Math.max(0, num(v.accumulatedMs, 0)),
  };
}

function normSettings(v: unknown): Settings {
  const s = isObj(v) ? v : {};
  return {
    dailyFocusGoal: clamp(Math.round(num(s.dailyFocusGoal, DEFAULT_SETTINGS.dailyFocusGoal)), 15, 16 * 60),
    focusLength: clamp(Math.round(num(s.focusLength, DEFAULT_SETTINGS.focusLength)), 5, 240),
    weekStartsOn: s.weekStartsOn === 0 ? 0 : 1,
    notifications: s.notifications === true,
    onboarded: s.onboarded === true,
    profile: PROFILE_IDS.includes(s.profile as ProfileId) ? (s.profile as ProfileId) : null,
    todayView: s.todayView === "timeline" ? "timeline" : "list",
  };
}

function compact<T>(items: (T | null)[]): T[] {
  return items.filter((x): x is T => x !== null);
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

export function normalizeState(raw: unknown): State {
  if (!isObj(raw)) return emptyState();
  const projects = uniqueById(compact(list(raw.projects).map(normProject)));
  const projectIds = new Set(projects.map((p) => p.id));
  // Key order matches emptyState() so identical data serializes identically.
  return {
    version: 1,
    tasks: uniqueById(compact(list(raw.tasks).map((t) => normTask(t, projectIds)))),
    projects,
    habits: uniqueById(compact(list(raw.habits).map(normHabit))),
    sessions: uniqueById(compact(list(raw.sessions).map(normSession))),
    activeFocus: normFocus(raw.activeFocus),
    settings: normSettings(raw.settings),
  };
}

/** True when the value looks like a DayFlow export (used to reject random JSON on import). */
export function looksLikeExport(raw: unknown): boolean {
  return isObj(raw) && (Array.isArray(raw.tasks) || Array.isArray(raw.habits));
}
