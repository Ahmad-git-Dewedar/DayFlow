import { memo } from "react";
import { useNavigate } from "react-router-dom";
import type { Project, Task } from "../lib/store/types";
import { cx } from "../lib/utils";
import { formatDuration, formatTime, minutesToTime, relativeDayLabel, timeToMinutes, todayKey } from "../lib/dates";
import { IconCheck, IconFlag, IconFocus, IconNote, IconTrash } from "./icons";
import { IconButton } from "./Button";
import { ProjectDot } from "./ui";
import { useI18n } from "../i18n/context";

type Props = {
  task: Task;
  project?: Project;
  /** Show the planned day (used in lists that span several days). */
  showDate?: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cx(
        "flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors",
        checked
          ? "border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-400"
          : "border-ink-soft/40 hover:border-brand-500 dark:border-ink-soft/50",
      )}
    >
      {checked && <IconCheck width={14} height={14} strokeWidth={3} className="animate-pop" />}
    </button>
  );
}

export const TaskItem = memo(function TaskItem({ task, project, showDate, onToggle, onEdit, onDelete }: Props) {
  const navigate = useNavigate();
  const { m, f } = useI18n();
  const overdue = !task.done && task.date !== null && task.date < todayKey();
  const timeRange = task.start
    ? `${formatTime(task.start)} – ${formatTime(minutesToTime(timeToMinutes(task.start) + task.duration))}`
    : null;

  return (
    <li className="group animate-rise-in flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2">
      <div className="pt-0.5">
        <Checkbox
          checked={task.done}
          onChange={() => onToggle(task.id)}
          label={f(task.done ? m.task.uncomplete : m.task.complete, { title: task.title })}
        />
      </div>

      <button
        type="button"
        onClick={() => onEdit(task)}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md text-start"
        aria-label={f(m.task.edit, { title: task.title })}
      >
        <span
          className={cx(
            "w-full break-words text-[0.95rem] leading-snug",
            task.done ? "text-muted line-through decoration-ink-soft/40" : "text-ink",
          )}
        >
          {task.priority === "high" && !task.done && (
            <IconFlag width={14} height={14} className="me-1.5 inline -translate-y-px text-[#e5484d]" aria-label={m.task.highPriority} />
          )}
          {task.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {showDate && task.date && (
            <span className={cx(overdue && "font-medium text-[#e5484d]")}>
              {overdue ? f(m.task.overdueOn, { day: relativeDayLabel(task.date) }) : relativeDayLabel(task.date)}
            </span>
          )}
          {timeRange ? <span className="tabular-nums">{timeRange}</span> : <span>{formatDuration(task.duration)}</span>}
          {project && (
            <span className="inline-flex items-center gap-1.5">
              <ProjectDot color={project.color} className="h-2 w-2" />
              {project.name}
            </span>
          )}
          {task.notes && <IconNote width={14} height={14} aria-label={m.task.hasNotes} />}
        </span>
      </button>

      <div className="flex items-center gap-0.5 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
        {!task.done && (
          <IconButton label={f(m.task.focus, { title: task.title })} size="sm" onClick={() => navigate(`/focus?task=${task.id}`)}>
            <IconFocus width={17} height={17} />
          </IconButton>
        )}
        <IconButton label={f(m.task.delete, { title: task.title })} size="sm" onClick={() => onDelete(task)}>
          <IconTrash width={17} height={17} />
        </IconButton>
      </div>
    </li>
  );
});
