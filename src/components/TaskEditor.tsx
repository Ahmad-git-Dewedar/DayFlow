import { useId, useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Field, Segmented } from "./ui";
import { useActions, useAppState, type NewTask } from "../lib/store/context";
import type { Priority, Task } from "../lib/store/types";
import { formatDuration, isDateKey, isTime } from "../lib/dates";
import { useToast } from "../lib/toast";
import { useDeleteTask } from "../lib/useDeleteTask";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Existing task to edit; omit to create a new one. */
  task?: Task | null;
  /** Prefilled values for a new task (e.g. the day being viewed). */
  defaults?: NewTask;
};

type Draft = {
  title: string;
  notes: string;
  date: string;
  start: string;
  duration: number;
  projectId: string;
  priority: Priority;
};

function toDraft(task: Task | null | undefined, defaults: NewTask | undefined): Draft {
  const src = task ?? defaults ?? { title: "" };
  return {
    title: src.title ?? "",
    notes: src.notes ?? "",
    date: src.date ?? "",
    start: src.start ?? "",
    duration: src.duration ?? 30,
    projectId: src.projectId ?? "",
    priority: src.priority ?? "normal",
  };
}

/** Inner form; remounted (via key) every time the modal opens so state starts fresh. */
function TaskForm({ task, defaults, onClose }: Omit<Props, "open">) {
  const { projects } = useAppState();
  const actions = useActions();
  const toast = useToast();
  const deleteTask = useDeleteTask();
  const formId = useId();
  const [draft, setDraft] = useState<Draft>(() => toDraft(task, defaults));
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const durations = DURATIONS.includes(draft.duration) ? DURATIONS : [...DURATIONS, draft.duration].sort((a, b) => a - b);

  function submit(e: FormEvent) {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setError("Give the task a name.");
      return;
    }
    const date = isDateKey(draft.date) ? draft.date : null;
    const values = {
      title,
      notes: draft.notes.trim(),
      date,
      // A time-block only makes sense on a specific day.
      start: date && isTime(draft.start) ? draft.start : null,
      duration: draft.duration,
      projectId: draft.projectId || null,
      priority: draft.priority,
    };
    if (task) {
      actions.updateTask(task.id, values);
    } else {
      actions.addTask(values);
      toast.show({ message: date ? "Task added" : "Task added to Inbox", tone: "success" });
    }
    onClose();
  }

  const id = (name: string) => `${formId}-${name}`;

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Task" htmlFor={id("title")} error={error ?? undefined}>
        <input
          id={id("title")}
          className="field"
          value={draft.title}
          data-autofocus
          maxLength={300}
          placeholder="What needs doing?"
          aria-invalid={!!error}
          aria-describedby={error ? `${id("title")}-error` : undefined}
          onChange={(e) => {
            set("title", e.target.value);
            if (error) setError(null);
          }}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Day" htmlFor={id("date")} hint={draft.date ? undefined : "Empty = Inbox"}>
          <input id={id("date")} type="date" className="field" value={draft.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Start time" htmlFor={id("start")} hint={draft.date ? "Optional" : "Pick a day first"}>
          <input
            id={id("start")}
            type="time"
            step={300}
            className="field"
            value={draft.start}
            disabled={!draft.date}
            onChange={(e) => set("start", e.target.value)}
          />
        </Field>
        <Field label="Duration" htmlFor={id("duration")}>
          <select id={id("duration")} className="field" value={draft.duration} onChange={(e) => set("duration", Number(e.target.value))}>
            {durations.map((d) => (
              <option key={d} value={d}>
                {formatDuration(d)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Project" htmlFor={id("project")}>
          <select id={id("project")} className="field" value={draft.projectId} onChange={(e) => set("projectId", e.target.value)}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Priority</span>
        <Segmented<Priority>
          label="Priority"
          value={draft.priority}
          onChange={(v) => set("priority", v)}
          options={[
            { value: "low", label: "Low" },
            { value: "normal", label: "Normal" },
            { value: "high", label: "High" },
          ]}
        />
      </div>

      <Field label="Notes" htmlFor={id("notes")}>
        <textarea
          id={id("notes")}
          className="field min-h-20 resize-y"
          rows={3}
          maxLength={5000}
          value={draft.notes}
          placeholder="Details, links, next steps…"
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 pt-1">
        {task ? (
          <Button
            variant="danger-ghost"
            onClick={() => {
              deleteTask(task);
              onClose();
            }}
          >
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{task ? "Save" : "Add task"}</Button>
        </div>
      </div>
    </form>
  );
}

export function TaskEditor({ open, onClose, task, defaults }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      {open && <TaskForm key={task?.id ?? "new"} task={task} defaults={defaults} onClose={onClose} />}
    </Modal>
  );
}
