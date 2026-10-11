import type {
  ActiveFocus,
  FocusSession,
  Habit,
  Project,
  Settings,
  State,
  Task,
} from "./types";
import { emptyState } from "./types";
import type { DateKey } from "../dates";

/**
 * All state changes go through this pure reducer. Anything non-deterministic
 * (ids, timestamps) is supplied in the action by the caller, which keeps the
 * reducer trivially testable.
 */
export type Action =
  | { type: "task/add"; task: Task }
  | { type: "task/update"; id: string; patch: Partial<Omit<Task, "id" | "createdAt">> }
  | { type: "task/toggle"; id: string; now: number }
  | { type: "task/delete"; id: string }
  | { type: "task/restore"; task: Task; index: number }
  | { type: "project/add"; project: Project }
  | { type: "project/update"; id: string; patch: Partial<Pick<Project, "name" | "color">> }
  | { type: "project/delete"; id: string }
  | { type: "habit/add"; habit: Habit }
  | { type: "habit/update"; id: string; patch: Partial<Pick<Habit, "name" | "targetPerWeek" | "archived">> }
  | { type: "habit/toggleDay"; id: string; day: DateKey }
  | { type: "habit/delete"; id: string }
  | { type: "habit/restore"; habit: Habit; index: number }
  | { type: "focus/start"; focus: ActiveFocus }
  | { type: "focus/pause"; now: number }
  | { type: "focus/resume"; now: number }
  | { type: "focus/extend"; minutes: number }
  | { type: "focus/finish"; now: number; sessionId: string; completed: boolean }
  | { type: "focus/discard" }
  | { type: "session/delete"; id: string }
  | { type: "settings/update"; patch: Partial<Settings> }
  | { type: "setup/apply"; patch: Partial<Settings>; projects: Project[]; habits: Habit[] }
  | { type: "data/replace"; state: State }
  | { type: "data/reset" };

export function focusElapsedMs(f: ActiveFocus, now: number): number {
  return f.accumulatedMs + (f.runningSince === null ? 0 : Math.max(0, now - f.runningSince));
}

function insertAt<T>(list: T[], item: T, index: number): T[] {
  const i = Math.max(0, Math.min(list.length, index));
  return [...list.slice(0, i), item, ...list.slice(i)];
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    /* ---------------- tasks ---------------- */
    case "task/add":
      return { ...state, tasks: [...state.tasks, action.task] };

    case "task/update":
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };

    case "task/toggle":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? { ...t, done: !t.done, completedAt: t.done ? null : action.now }
            : t,
        ),
      };

    case "task/delete": {
      const activeFocus =
        state.activeFocus?.taskId === action.id
          ? { ...state.activeFocus, taskId: null }
          : state.activeFocus;
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id), activeFocus };
    }

    case "task/restore":
      if (state.tasks.some((t) => t.id === action.task.id)) return state;
      return { ...state, tasks: insertAt(state.tasks, action.task, action.index) };

    /* ---------------- projects ---------------- */
    case "project/add":
      return { ...state, projects: [...state.projects, action.project] };

    case "project/update":
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      };

    case "project/delete":
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        // Tasks are kept and simply lose their project.
        tasks: state.tasks.map((t) => (t.projectId === action.id ? { ...t, projectId: null } : t)),
      };

    /* ---------------- habits ---------------- */
    case "habit/add":
      return { ...state, habits: [...state.habits, action.habit] };

    case "habit/update":
      return {
        ...state,
        habits: state.habits.map((h) => (h.id === action.id ? { ...h, ...action.patch } : h)),
      };

    case "habit/toggleDay":
      return {
        ...state,
        habits: state.habits.map((h) => {
          if (h.id !== action.id) return h;
          const log = { ...h.log };
          if (log[action.day]) delete log[action.day];
          else log[action.day] = true;
          return { ...h, log };
        }),
      };

    case "habit/delete":
      return { ...state, habits: state.habits.filter((h) => h.id !== action.id) };

    case "habit/restore":
      if (state.habits.some((h) => h.id === action.habit.id)) return state;
      return { ...state, habits: insertAt(state.habits, action.habit, action.index) };

    /* ---------------- focus ---------------- */
    case "focus/start":
      return { ...state, activeFocus: action.focus };

    case "focus/pause": {
      const f = state.activeFocus;
      if (!f || f.runningSince === null) return state;
      return {
        ...state,
        activeFocus: { ...f, runningSince: null, accumulatedMs: focusElapsedMs(f, action.now) },
      };
    }

    case "focus/resume": {
      const f = state.activeFocus;
      if (!f || f.runningSince !== null) return state;
      return { ...state, activeFocus: { ...f, runningSince: action.now } };
    }

    case "focus/extend": {
      const f = state.activeFocus;
      if (!f) return state;
      return { ...state, activeFocus: { ...f, durationMin: Math.min(240, f.durationMin + action.minutes) } };
    }

    case "focus/finish": {
      const f = state.activeFocus;
      if (!f) return state;
      const plannedMs = f.durationMin * 60_000;
      const elapsed = Math.min(focusElapsedMs(f, action.now), plannedMs);
      const minutes = Math.round(elapsed / 60_000);
      // Sessions shorter than a minute aren't worth recording.
      if (minutes < 1) return { ...state, activeFocus: null };
      const session: FocusSession = {
        id: action.sessionId,
        taskId: f.taskId,
        label: f.label,
        startedAt: f.firstStartedAt,
        endedAt: action.now,
        minutes,
        completed: action.completed,
      };
      return { ...state, activeFocus: null, sessions: [...state.sessions, session] };
    }

    case "focus/discard":
      return { ...state, activeFocus: null };

    case "session/delete":
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) };

    /* ---------------- settings & data ---------------- */
    case "settings/update":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case "setup/apply":
      // One atomic step, so the welcome quiz can never half-apply.
      return {
        ...state,
        settings: { ...state.settings, ...action.patch },
        projects: [...state.projects, ...action.projects],
        habits: [...state.habits, ...action.habits],
      };

    case "data/replace":
      return action.state;

    case "data/reset":
      return emptyState();

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
