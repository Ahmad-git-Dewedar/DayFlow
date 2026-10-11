import { useCallback } from "react";
import { useActions, useAppState } from "./store/context";
import { useToast } from "./toast";
import type { Habit, Task } from "./store/types";

/** Delete a task with an Undo toast instead of a confirmation dialog. */
export function useDeleteTask() {
  const { tasks } = useAppState();
  const actions = useActions();
  const toast = useToast();
  return useCallback(
    (task: Task) => {
      const index = tasks.findIndex((t) => t.id === task.id);
      actions.deleteTask(task.id);
      toast.show({
        message: `Deleted “${task.title}”`,
        action: { label: "Undo", onClick: () => actions.restoreTask(task, index) },
      });
    },
    [tasks, actions, toast],
  );
}

export function useDeleteHabit() {
  const { habits } = useAppState();
  const actions = useActions();
  const toast = useToast();
  return useCallback(
    (habit: Habit) => {
      const index = habits.findIndex((h) => h.id === habit.id);
      actions.deleteHabit(habit.id);
      toast.show({
        message: `Deleted “${habit.name}”`,
        action: { label: "Undo", onClick: () => actions.restoreHabit(habit, index) },
      });
    },
    [habits, actions, toast],
  );
}
