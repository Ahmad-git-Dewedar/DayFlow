import { addDays, fromKey, todayKey, type DateKey } from "../dates";
import { newId } from "../id";
import { DEFAULT_SETTINGS, type FocusSession, type Habit, type Project, type State, type Task } from "./types";

/** Small seeded PRNG so the sample history looks organic but stays stable. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** A realistic starter workspace anchored to `today`, for trying DayFlow out. */
export function sampleState(today: DateKey = todayKey(), settings = DEFAULT_SETTINGS): State {
  const now = Date.now();
  const rand = rng(42);

  const work: Project = { id: newId(), name: "Work", color: "emerald", createdAt: now };
  const personal: Project = { id: newId(), name: "Personal", color: "sky", createdAt: now };
  const learning: Project = { id: newId(), name: "Learning", color: "amber", createdAt: now };

  const task = (p: Partial<Task> & Pick<Task, "title">): Task => ({
    id: newId(),
    notes: "",
    projectId: null,
    date: today,
    start: null,
    duration: 30,
    priority: "normal",
    done: false,
    completedAt: null,
    createdAt: now,
    ...p,
  });

  const yesterday = addDays(today, -1);
  const tasks: Task[] = [
    task({ title: "Review product roadmap", start: "09:00", duration: 60, projectId: work.id, priority: "high", done: true, completedAt: now }),
    task({ title: "Team standup", start: "10:30", duration: 15, projectId: work.id, done: true, completedAt: now }),
    task({ title: "Draft Q3 proposal", start: "13:00", duration: 90, projectId: work.id, priority: "high", notes: "Outline goals, budget and the three key bets." }),
    task({ title: "Workout", start: "18:00", duration: 45, projectId: personal.id }),
    task({ title: "Read 20 pages", projectId: learning.id, duration: 30 }),
    task({ title: "Reply to design feedback", projectId: work.id, duration: 20, priority: "low" }),
    task({ title: "Plan weekend trip", date: addDays(today, 1), projectId: personal.id }),
    task({ title: "1:1 with Sam", date: addDays(today, 1), start: "11:00", duration: 30, projectId: work.id }),
    task({ title: "Finish online course module", date: addDays(today, 3), projectId: learning.id, duration: 60 }),
    task({ title: "Send invoice", date: yesterday, projectId: work.id, priority: "high" }),
    task({ title: "Book dentist appointment", date: null, projectId: personal.id, duration: 15 }),
    task({ title: "Research note-taking methods", date: null, projectId: learning.id }),
  ];
  // Some history so Insights has something to show.
  for (let i = 1; i <= 13; i++) {
    const day = addDays(today, -i);
    const n = Math.floor(rand() * 4) + 1;
    for (let j = 0; j < n; j++) {
      const done = fromKey(day).getTime() + (9 + j * 2) * 3_600_000;
      tasks.push(task({ title: `Archived task ${i}.${j + 1}`, date: day, done: true, completedAt: done, projectId: [work.id, personal.id, learning.id][j % 3] }));
    }
  }

  const habit = (name: string, targetPerWeek: number, rate: number): Habit => {
    const log: Habit["log"] = {};
    for (let i = 1; i <= 45; i++) if (rand() < rate) log[addDays(today, -i)] = true;
    return { id: newId(), name, targetPerWeek, log, archived: false, createdAt: now };
  };
  const habits = [habit("Read", 7, 0.85), habit("Drink water", 7, 0.7), habit("Exercise", 4, 0.55), habit("Meditate", 5, 0.6)];
  // Make "Read" a clean, motivating streak.
  for (let i = 1; i <= 12; i++) habits[0].log[addDays(today, -i)] = true;

  const sessions: FocusSession[] = [];
  const workTaskIds = tasks.filter((t) => t.projectId === work.id).map((t) => t.id);
  const learnTaskIds = tasks.filter((t) => t.projectId === learning.id).map((t) => t.id);
  for (let i = 0; i <= 13; i++) {
    const day = addDays(today, -i);
    const count = i === 0 ? 2 : Math.floor(rand() * 4);
    for (let j = 0; j < count; j++) {
      const minutes = [25, 25, 50, 45][Math.floor(rand() * 4)];
      const startedAt = fromKey(day).getTime() + (9 + j * 2) * 3_600_000;
      const fromLearning = rand() < 0.3;
      const ids = fromLearning ? learnTaskIds : workTaskIds;
      sessions.push({
        id: newId(),
        taskId: ids[Math.floor(rand() * ids.length)] ?? null,
        label: fromLearning ? "Study session" : "Deep work",
        startedAt,
        endedAt: startedAt + minutes * 60_000,
        minutes,
        completed: true,
      });
    }
  }

  return {
    version: 1,
    tasks,
    projects: [work, personal, learning],
    habits,
    sessions,
    activeFocus: null,
    settings: { ...settings },
  };
}
