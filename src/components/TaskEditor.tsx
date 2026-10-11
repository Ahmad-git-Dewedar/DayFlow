import { useId, useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Field, Segmented } from "./ui";
import { useActions, useAppState, type NewTask } from "../lib/store/context";
import type { Priority, Task } from "../lib/store/types";
import { formatDuration, isDateKey, isTime } from "../lib/dates";
import { useToast } from "../lib/toast";
import { useDeleteTask } from "../lib/useDeleteTask";
import { useI18n } from "../i18n/context";

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
  const { m } = useI18n();
  const formId = useId();
  const [draft, setDraft] = useState<Draft>(() => toDraft(task, defaults));
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const durations = DURATIONS.includes(draft.duration) ? DURATIONS : [...DURATIONS, draft.duration].sort((a, b) => a - b);

  function submit(e: FormEvent) {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setError(m.editor.nameError);
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
      toast.show({ message: date ? m.task.added : m.task.addedInbox, tone: "success" });
    }
    onClose();
  }

  const id = (name: string) => `${formId}-${name}`;

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label={m.editor.task} htmlFor={id("title")} error={error ?? undefined}>
        <input
          id={id("title")}
          className="field"
          value={draft.title}
          data-autofocus
          maxLength={300}
          placeholder={m.editor.taskPlaceholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id("title")}-error` : undefined}
          onChange={(e) => {
            set("title", e.target.value);
            if (error) setError(null);
          }}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={m.editor.day} htmlFor={id("date")} hint={draft.date ? undefined : m.editor.dayEmptyHint}>
          <input id={id("date")} type="date" className="field" value={draft.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label={m.editor.start} htmlFor={id("start")} hint={draft.date ? m.common.optional : m.editor.pickDayFirst}>
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
        <Field label={m.editor.duration} htmlFor={id("duration")}>
          <select id={id("duration")} className="field" value={draft.duration} onChange={(e) => set("duration", Number(e.target.value))}>
            {durations.map((d) => (
              <option key={d} value={d}>
                {formatDuration(d)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={m.editor.project} htmlFor={id("project")}>
          <select id={id("project")} className="field" value={draft.projectId} onChange={(e) => set("projectId", e.target.value)}>
            <option value="">{m.common.noProject}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{m.editor.priority}</span>
        <Segmented<Priority>
          label={m.editor.priority}
          value={draft.priority}
          onChange={(v) => set("priority", v)}
          options={[
            { value: "low", label: m.editor.low },
            { value: "normal", label: m.editor.normal },
            { value: "high", label: m.editor.high },
          ]}
        />
      </div>

      <Field label={m.editor.notes} htmlFor={id("notes")}>
        <textarea
          id={id("notes")}
          className="field min-h-20 resize-y"
          rows={3}
          maxLength={5000}
          value={draft.notes}
          placeholder={m.editor.notesPlaceholder}
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
            {m.common.delete}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            {m.common.cancel}
          </Button>
          <Button type="submit">{task ? m.common.save : m.editor.add}</Button>
        </div>
      </div>
    </form>
  );
}

export function TaskEditor({ open, onClose, task, defaults }: Props) {
  const { m } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={task ? m.editor.editTitle : m.editor.newTitle}>
      {open && <TaskForm key={task?.id ?? "new"} task={task} defaults={defaults} onClose={onClose} />}
    </Modal>
  );
}
