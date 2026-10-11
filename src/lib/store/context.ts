import { createContext, useContext, useMemo, type Dispatch } from "react";
import type { Action } from "./reducer";
import type { Habit, Priority, Project, ProjectColor, State, Task } from "./types";
import { newId } from "../id";
import type { DateKey } from "../dates";

export const StateContext = createContext<State | null>(null);
export const DispatchContext = createContext<Dispatch<Action> | null>(null);

export function useAppState(): State {
  const s = useContext(StateContext);
  if (!s) throw new Error("useAppState must be used inside <StoreProvider>");
  return s;
}

export function useDispatch(): Dispatch<Action> {
  const d = useContext(DispatchContext);
  if (!d) throw new Error("useDispatch must be used inside <StoreProvider>");
  return d;
}

export type NewTask = {
  title: string;
  notes?: string;
  projectId?: string | null;
  date?: DateKey | null;
  start?: string | null;
  duration?: number;
  priority?: Priority;
};

/**
 * Intent-level actions. These create ids and timestamps so the reducer stays
 * pure. The returned object is stable for the lifetime of the provider.
 */
export function useActions() {
  const dispatch = useDispatch();
  return useMemo(
    () => ({
      addTask(input: NewTask): Task {
        const task: Task = {
          id: newId(),
          title: input.title.trim(),
          notes: input.notes ?? "",
          projectId: input.projectId ?? null,
          date: input.date ?? null,
          start: input.start ?? null,
          duration: input.duration ?? 30,
          priority: input.priority ?? "normal",
          done: false,
          completedAt: null,
          createdAt: Date.now(),
        };
        dispatch({ type: "task/add", task });
        return task;
      },
      updateTask(id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) {
        dispatch({ type: "task/update", id, patch });
      },
      toggleTask(id: string) {
        dispatch({ type: "task/toggle", id, now: Date.now() });
      },
      deleteTask(id: string) {
        dispatch({ type: "task/delete", id });
      },
      restoreTask(task: Task, index: number) {
        dispatch({ type: "task/restore", task, index });
      },

      addProject(name: string, color: ProjectColor): Project {
        const project: Project = { id: newId(), name: name.trim(), color, createdAt: Date.now() };
        dispatch({ type: "project/add", project });
        return project;
      },
      updateProject(id: string, patch: { name?: string; color?: ProjectColor }) {
        dispatch({ type: "project/update", id, patch });
      },
      deleteProject(id: string) {
        dispatch({ type: "project/delete", id });
      },

      addHabit(name: string, targetPerWeek: number): Habit {
        const habit: Habit = {
          id: newId(),
          name: name.trim(),
          targetPerWeek,
          log: {},
          archived: false,
          createdAt: Date.now(),
        };
        dispatch({ type: "habit/add", habit });
        return habit;
      },
      updateHabit(id: string, patch: { name?: string; targetPerWeek?: number; archived?: boolean }) {
        dispatch({ type: "habit/update", id, patch });
      },
      toggleHabitDay(id: string, day: DateKey) {
        dispatch({ type: "habit/toggleDay", id, day });
      },
      deleteHabit(id: string) {
        dispatch({ type: "habit/delete", id });
      },
      restoreHabit(habit: Habit, index: number) {
        dispatch({ type: "habit/restore", habit, index });
      },

      startFocus(opts: { taskId: string | null; label: string; durationMin: number }) {
        const now = Date.now();
        dispatch({
          type: "focus/start",
          focus: { ...opts, firstStartedAt: now, runningSince: now, accumulatedMs: 0 },
        });
      },
      pauseFocus() {
        dispatch({ type: "focus/pause", now: Date.now() });
      },
      resumeFocus() {
        dispatch({ type: "focus/resume", now: Date.now() });
      },
      extendFocus(minutes: number) {
        dispatch({ type: "focus/extend", minutes });
      },
      finishFocus(completed: boolean) {
        dispatch({ type: "focus/finish", now: Date.now(), sessionId: newId(), completed });
      },
      discardFocus() {
        dispatch({ type: "focus/discard" });
      },
      deleteSession(id: string) {
        dispatch({ type: "session/delete", id });
      },

      updateSettings(patch: Partial<State["settings"]>) {
        dispatch({ type: "settings/update", patch });
      },
      applySetup(plan: { patch: Partial<State["settings"]>; projects: Project[]; habits: Habit[] }) {
        dispatch({ type: "setup/apply", ...plan });
      },
      replaceData(state: State) {
        dispatch({ type: "data/replace", state });
      },
      resetData() {
        dispatch({ type: "data/reset" });
      },
    }),
    [dispatch],
  );
}

export type Actions = ReturnType<typeof useActions>;
