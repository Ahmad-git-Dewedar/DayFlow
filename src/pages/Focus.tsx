import { useId, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useActions, useAppState } from "../lib/store/context";
import { formatClock, formatClockTime, formatDuration, todayKey } from "../lib/dates";
import { focusMinutesOn, sessionDay } from "../lib/stats";
import { useFocusClock } from "../lib/useFocusClock";
import { usePageTitle } from "../lib/usePageTitle";
import { useToast } from "../lib/toast";
import { Button, IconButton } from "../components/Button";
import { Card, CardHeader, EmptyState, Field, PageHeader, ProgressRing, ProjectDot } from "../components/ui";
import { IconCheck, IconFocus, IconPause, IconPlay, IconStop, IconTrash } from "../components/icons";
import { cx } from "../lib/utils";
import { useI18n } from "../i18n/context";

const PRESETS = [15, 25, 50, 90];

function ActiveTimer() {
  const { m, f } = useI18n();
  const { activeFocus, tasks, projects } = useAppState();
  const actions = useActions();
  const toast = useToast();
  const clock = useFocusClock(activeFocus);
  if (!activeFocus || !clock) return null;

  const task = activeFocus.taskId ? tasks.find((t) => t.id === activeFocus.taskId) : undefined;
  const project = task?.projectId ? projects.find((p) => p.id === task.projectId) : undefined;
  // Rounded the same way the reducer rounds when it logs the session.
  const elapsedMin = Math.round(clock.elapsedMs / 60_000);

  return (
    <Card className="flex flex-col items-center gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className={cx("text-xs font-semibold uppercase tracking-wider", clock.running ? "text-brand-600 dark:text-brand-400" : "text-muted")}>
          {clock.running ? m.focus.focusing : m.focus.paused}
        </span>
        <h2 className="max-w-md text-xl font-semibold">{activeFocus.label}</h2>
        {project && (
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <ProjectDot color={project.color} className="h-2 w-2" /> {project.name}
          </span>
        )}
      </div>

      <ProgressRing value={clock.progress} size={232} stroke={10} label={f(m.focus.remaining, { time: formatClock(clock.remainingMs / 1000) })}>
        <span className="flex flex-col items-center">
          <span className="font-display text-5xl font-semibold tabular-nums tracking-tight text-ink" aria-live="off">
            {formatClock(clock.remainingMs / 1000)}
          </span>
          <span className="mt-1 text-sm text-muted">{f(m.focus.of, { time: formatDuration(activeFocus.durationMin) })}</span>
        </span>
      </ProgressRing>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {clock.running ? (
          <Button size="lg" onClick={actions.pauseFocus} className="min-w-36">
            <IconPause width={18} height={18} /> {m.focus.pause}
          </Button>
        ) : (
          <Button size="lg" onClick={actions.resumeFocus} className="min-w-36">
            <IconPlay width={18} height={18} /> {m.focus.resume}
          </Button>
        )}
        <Button
          size="lg"
          variant="secondary"
          onClick={() => {
            actions.finishFocus(false);
            toast.show(
              elapsedMin >= 1
                ? { message: f(m.focus.logged, { time: formatDuration(elapsedMin) }), tone: "success" }
                : { message: m.focus.tooShort },
            );
          }}
        >
          <IconStop width={16} height={16} /> {m.focus.finish}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        <button type="button" className="font-medium text-ink-soft hover:text-ink" onClick={() => actions.extendFocus(5)} disabled={activeFocus.durationMin >= 240}>
          {m.focus.extend}
        </button>
        {task && !task.done && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 font-medium text-ink-soft hover:text-ink"
            onClick={() => {
              actions.toggleTask(task.id);
              toast.show({ message: f(m.focus.completedTask, { title: task.title }), tone: "success" });
            }}
          >
            <IconCheck width={15} height={15} /> {m.focus.markDone}
          </button>
        )}
        <button
          type="button"
          className="font-medium text-muted hover:text-[#e5484d]"
          onClick={() => {
            actions.discardFocus();
            toast.show({ message: m.focus.discarded });
          }}
        >
          {m.focus.discard}
        </button>
      </div>
    </Card>
  );
}

function SetupForm() {
  const { m, f } = useI18n();
  const { tasks, settings } = useAppState();
  const actions = useActions();
  const [params, setParams] = useSearchParams();
  const formId = useId();
  const today = todayKey();

  const candidates = useMemo(
    () =>
      tasks
        .filter((t) => !t.done && (t.date === today || (t.date !== null && t.date < today)))
        .sort((a, b) => (a.start ?? "99").localeCompare(b.start ?? "99")),
    [tasks, today],
  );
  const requested = params.get("task");
  const requestedTask = requested ? tasks.find((t) => t.id === requested && !t.done) : undefined;
  const options = requestedTask && !candidates.includes(requestedTask) ? [requestedTask, ...candidates] : candidates;

  const [taskId, setTaskId] = useState<string>(requestedTask?.id ?? "");
  const [label, setLabel] = useState("");
  const [minutes, setMinutes] = useState(settings.focusLength);
  const task = tasks.find((t) => t.id === taskId);

  function start() {
    actions.startFocus({
      taskId: task?.id ?? null,
      label: task?.title ?? (label.trim() || m.focus.defaultLabel),
      durationMin: minutes,
    });
    if (requested) setParams({}, { replace: true });
  }

  return (
    <Card className="flex flex-col gap-6 px-6 py-8 sm:px-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
          <IconFocus width={28} height={28} />
        </span>
        <h2 className="text-xl font-semibold">{m.focus.setupTitle}</h2>
        <p className="max-w-sm text-sm text-ink-soft">{m.focus.setupBody}</p>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <Field label={m.focus.focusOn} htmlFor={`${formId}-task`}>
          <select id={`${formId}-task`} className="field" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">{m.focus.somethingElse}</option>
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
        {!task && (
          <Field label={m.focus.workingOn} htmlFor={`${formId}-label`} hint={m.common.optional}>
            <input
              id={`${formId}-label`}
              className="field"
              value={label}
              maxLength={120}
              placeholder={m.focus.workingOnPlaceholder}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && start()}
            />
          </Field>
        )}

        <div className="flex flex-col gap-1.5">
          <span id={`${formId}-len`} className="text-sm font-medium text-ink">
            {m.focus.length}
          </span>
          <div role="radiogroup" aria-labelledby={`${formId}-len`} className="grid grid-cols-4 gap-2">
            {PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                role="radio"
                aria-checked={minutes === mins}
                onClick={() => setMinutes(mins)}
                className={cx(
                  "rounded-xl border py-2.5 text-sm font-semibold tabular-nums transition-colors",
                  minutes === mins
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200"
                    : "border-line text-ink-soft hover:border-brand-300",
                )}
              >
                {formatDuration(mins)}
              </button>
            ))}
          </div>
          <label className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
            {m.focus.custom}
            <input
              type="number"
              min={5}
              max={240}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(5, Math.min(240, Number(e.target.value) || 5)))}
              className="field h-9 w-20 py-1 tabular-nums"
              aria-label={m.focus.customLabel}
            />
            {m.focus.minutes}
          </label>
        </div>

        <Button size="lg" className="mt-2" onClick={start}>
          <IconPlay width={18} height={18} /> {f(m.focus.start, { time: formatDuration(minutes) })}
        </Button>
      </div>
    </Card>
  );
}

export function Focus() {
  const { m, f } = useI18n();
  usePageTitle(m.focus.title);
  const { activeFocus, sessions, settings } = useAppState();
  const actions = useActions();
  const today = todayKey();
  const todaySessions = useMemo(
    () => sessions.filter((s) => sessionDay(s) === today).sort((a, b) => b.startedAt - a.startedAt),
    [sessions, today],
  );
  const total = focusMinutesOn(sessions, today);
  const goal = settings.dailyFocusGoal;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={m.focus.title} subtitle={m.focus.tagline} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {activeFocus ? <ActiveTimer /> : <SetupForm />}

        <Card>
          <CardHeader title={m.focus.today} />
          <div className="flex items-center gap-4 px-5 py-3">
            <ProgressRing value={total / goal} size={56} stroke={6} label={f(m.focus.goalLabel, { done: formatDuration(total), goal: formatDuration(goal) })}>
              <span className="text-xs font-semibold tabular-nums">{Math.min(100, Math.round((total / goal) * 100))}%</span>
            </ProgressRing>
            <div>
              <p className="text-lg font-semibold tabular-nums text-ink">{formatDuration(total)}</p>
              <p className="text-xs text-muted">
                {f(m.focus.goalOf, { time: formatDuration(goal) })} ·{" "}
                <Link to="/settings" className="underline-offset-2 hover:underline">
                  {m.focus.change}
                </Link>
              </p>
            </div>
          </div>
          {todaySessions.length === 0 ? (
            <EmptyState compact icon={<IconFocus width={22} height={22} />} title={m.focus.noSessions} />
          ) : (
            <ul className="flex flex-col px-2 pb-3">
              {todaySessions.map((s) => (
                <li key={s.id} className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2">
                  <span
                    className={cx(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      s.completed ? "bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300" : "bg-surface-3 text-muted",
                    )}
                    aria-label={s.completed ? m.focus.sessionCompleted : m.focus.sessionEnded}
                  >
                    {s.completed ? <IconCheck width={14} height={14} strokeWidth={2.5} /> : <IconStop width={10} height={10} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{s.label}</p>
                    <p className="text-xs tabular-nums text-muted">
                      {formatClockTime(s.startedAt)} · {formatDuration(s.minutes)}
                    </p>
                  </div>
                  <IconButton
                    label={f(m.focus.deleteSession, { label: s.label })}
                    size="sm"
                    className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                    onClick={() => actions.deleteSession(s.id)}
                  >
                    <IconTrash width={16} height={16} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
