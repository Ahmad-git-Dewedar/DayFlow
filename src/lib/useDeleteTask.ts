import { useCallback } from "react";
import { useActions, useAppState } from "./store/context";
import { useToast } from "./toast";
import { useI18n } from "../i18n/context";
import type { Habit, Task } from "./store/types";

/** Delete a task with an Undo toast instead of a confirmation dialog. */
export function useDeleteTask() {
  const { tasks } = useAppState();
  const actions = useActions();
  const toast = useToast();
  const { m, f } = useI18n();
  return useCallback(
    (task: Task) => {
      const index = tasks.findIndex((t) => t.id === task.id);
      actions.deleteTask(task.id);
      toast.show({
        message: f(m.task.deleted, { title: task.title }),
        action: { label: m.common.undo, onClick: () => actions.restoreTask(task, index) },
      });
    },
    [tasks, actions, toast, m, f],
  );
}

export function useDeleteHabit() {
  const { habits } = useAppState();
  const actions = useActions();
  const toast = useToast();
  const { m, f } = useI18n();
  return useCallback(
    (habit: Habit) => {
      const index = habits.findIndex((h) => h.id === habit.id);
      actions.deleteHabit(habit.id);
      toast.show({
        message: f(m.habits.deleted, { name: habit.name }),
        action: { label: m.common.undo, onClick: () => actions.restoreHabit(habit, index) },
      });
    },
    [habits, actions, toast, m, f],
  );
}
