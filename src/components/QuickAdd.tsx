import { useId, useMemo, useState, type FormEvent } from "react";
import { useActions, useAppState } from "../lib/store/context";
import { parseQuickAdd } from "../lib/quickAdd";
import { formatDuration, formatTime, type DateKey } from "../lib/dates";
import { IconClock, IconPlus } from "./icons";
import { ProjectDot } from "./ui";

type Props = {
  /** Day new tasks are planned for; null adds to the Inbox. */
  date: DateKey | null;
  /** Project to assign when the input doesn't name one. */
  projectId?: string | null;
  placeholder?: string;
};

export function QuickAdd({ date, projectId = null, placeholder = "Add a task" }: Props) {
  const { projects } = useAppState();
  const actions = useActions();
  const [value, setValue] = useState("");
  const hintId = useId();

  // Time-blocks need a day, so in the Inbox a typed time stays in the title.
  const parsed = useMemo(() => parseQuickAdd(value, projects, { parseTime: date !== null }), [value, projects, date]);
  const project = projects.find((p) => p.id === (parsed.projectId ?? projectId));
  const start = parsed.start;

  function submit(e: FormEvent) {
    e.preventDefault();
    const title = parsed.title.trim();
    if (!title) return;
    actions.addTask({
      title,
      date,
      start,
      duration: parsed.duration ?? 30,
      projectId: parsed.projectId ?? projectId,
    });
    setValue("");
  }

  const hasTokens = start || parsed.duration || parsed.projectId;
  // The hint only appears while typing here; otherwise it stays out of the way
  // (still available to screen readers via aria-describedby).
  const [focused, setFocused] = useState(false);
  const showHint = focused || (value !== "" && hasTokens);

  return (
    <form onSubmit={submit} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 transition-colors focus-within:border-brand-400 focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-brand-400)_22%,transparent)]">
        <IconPlus width={18} height={18} className="shrink-0 text-muted" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-describedby={hintId}
          maxLength={300}
          className="h-11 min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="rounded-lg px-2.5 py-1 text-sm font-semibold text-brand-600 transition-opacity disabled:opacity-0 dark:text-brand-400"
        >
          Add
        </button>
      </div>
      {/* Floats below the field so showing it never pushes the page around. */}
      <p
        id={hintId}
        className={
          showHint
            ? "absolute inset-x-0 top-full mt-1.5 flex animate-fade-in flex-wrap items-center gap-2 px-1 text-xs text-muted"
            : "sr-only"
        }
      >
        {value && hasTokens ? (
          <>
            {start && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-ink-soft">
                <IconClock width={12} height={12} /> {formatTime(start)}
              </span>
            )}
            {parsed.duration && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-ink-soft">{formatDuration(parsed.duration)}</span>}
            {parsed.projectId && project && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2 py-0.5 text-ink-soft">
                <ProjectDot color={project.color} className="h-2 w-2" /> {project.name}
              </span>
            )}
          </>
        ) : (
          <span>
            Tip: type a time, length or project — e.g. <span className="text-ink-soft">“Write report {date ? "2pm " : ""}45m{projects[0] ? ` #${projects[0].name.toLowerCase().replace(/\s+/g, "-")}` : ""}”</span>
          </span>
        )}
      </p>
    </form>
  );
}
