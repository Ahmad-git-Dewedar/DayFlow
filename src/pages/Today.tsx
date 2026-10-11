import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useActions, useAppState, type NewTask } from "../lib/store/context";
import type { Task } from "../lib/store/types";
import {
  addDays,
  diffDays,
  formatDayLong,
  formatDuration,
  isDateKey,
  relativeDayLabel,
  todayKey,
  type DateKey,
} from "../lib/dates";
import { focusMinutesOn, plannedMinutes, tasksForDay } from "../lib/stats";
import { usePageTitle } from "../lib/usePageTitle";
import { useDeleteTask } from "../lib/useDeleteTask";
import { useToast } from "../lib/toast";
import { Button, IconButton } from "../components/Button";
import { Card, CardHeader, EmptyState, PageHeader, ProgressRing, Segmented } from "../components/ui";
import { QuickAdd } from "../components/QuickAdd";
import { TaskItem, Checkbox } from "../components/TaskItem";
import { TaskEditor } from "../components/TaskEditor";
import { Timeline } from "../components/Timeline";
import { IconCalendar, IconChevronLeft, IconChevronRight, IconPlus } from "../components/icons";
import { cx } from "../lib/utils";

type EditorState = { task: Task | null; defaults?: NewTask } | null;

function HabitStrip({ day }: { day: DateKey }) {
  const { habits } = useAppState();
  const actions = useActions();
  const active = habits.filter((h) => !h.archived);
  const future = day > todayKey();
  // No habits yet: show nothing here rather than an empty box (Habits is one tap away).
  if (active.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Habits"
        action={
          <Link to="/habits" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
            Manage
          </Link>
        }
      />
      <ul className="flex flex-col gap-0.5 p-2">
          {active.map((h) => {
            const done = !!h.log[day];
            return (
              <li key={h.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2">
                {future ? (
                  <span className="h-5.5 w-5.5 shrink-0 rounded-md border-[1.5px] border-dashed border-line" aria-hidden />
                ) : (
                  <Checkbox
                    checked={done}
                    onChange={() => actions.toggleHabitDay(h.id, day)}
                    label={`${h.name} ${done ? "done" : "not done"} on ${relativeDayLabel(day)}`}
                  />
                )}
                <span className={cx("flex-1 text-[0.95rem]", done ? "text-muted" : "text-ink")}>{h.name}</span>
              </li>
            );
          })}
      </ul>
      {future && <p className="px-5 pb-4 text-xs text-muted">Habits can be checked off on the day.</p>}
    </Card>
  );
}

export function Today() {
  const state = useAppState();
  const { tasks, projects, sessions, settings } = state;
  const actions = useActions();
  const toast = useToast();
  const deleteTask = useDeleteTask();
  const [params, setParams] = useSearchParams();
  const [editor, setEditor] = useState<EditorState>(null);
  // Small screens show one view at a time; start with the one the welcome quiz picked.
  const [view, setView] = useState<"list" | "timeline">(settings.todayView);

  const today = todayKey();
  const dayParam = params.get("day");
  const day: DateKey = dayParam && isDateKey(dayParam) ? dayParam : today;
  const isToday = day === today;
  const label = relativeDayLabel(day, today);
  usePageTitle(isToday ? "Today" : label);

  const setDay = (d: DateKey) => setParams(d === today ? {} : { day: d });

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const dayTasks = useMemo(() => tasksForDay(tasks, day), [tasks, day]);
  const overdue = useMemo(
    () => (isToday ? tasks.filter((t) => !t.done && t.date !== null && t.date < today) : []),
    [tasks, isToday, today],
  );

  const open = dayTasks.filter((t) => !t.done);
  const done = dayTasks.filter((t) => t.done);
  const scheduled = open.filter((t) => t.start);
  const anytime = open.filter((t) => !t.start);
  const focusToday = focusMinutesOn(sessions, day);
  const planned = plannedMinutes(tasks, day);
  // Only show the summary once there's something to summarize.
  const showSummary = dayTasks.length > 0 || focusToday > 0;

  const onEdit = (task: Task) => setEditor({ task });
  const listProps = { onToggle: actions.toggleTask, onEdit, onDelete: deleteTask };

  const dayNav = (
    <div className="flex items-center gap-1">
      {!isToday && (
        <Button variant="secondary" size="sm" onClick={() => setDay(today)} className="mr-1">
          Today
        </Button>
      )}
      <IconButton label="Previous day" onClick={() => setDay(addDays(day, -1))}>
        <IconChevronLeft />
      </IconButton>
      <IconButton label="Next day" onClick={() => setDay(addDays(day, 1))}>
        <IconChevronRight />
      </IconButton>
      <Button size="sm" className="ml-1" onClick={() => setEditor({ task: null, defaults: { title: "", date: day } })}>
        <IconPlus width={17} height={17} /> New task
      </Button>
    </div>
  );

  const timelineCard = (
    <Card className="overflow-hidden">
      <CardHeader
        title="Timeline"
        action={<span className="text-xs text-muted">{planned > 0 ? `${formatDuration(planned)} planned` : "Click a slot to plan"}</span>}
      />
      <div className="pb-2 pt-1">
        <Timeline
          key={day}
          tasks={dayTasks}
          projects={projectMap}
          isToday={isToday}
          onEdit={onEdit}
          onChange={(id, start, duration) => actions.updateTask(id, { start, duration })}
          onCreateAt={(start) => setEditor({ task: null, defaults: { title: "", date: day, start, duration: 30 } })}
        />
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isToday ? "Today" : label}
        subtitle={
          <span className="inline-flex items-center gap-2">
            {formatDayLong(day)}
            {!isToday && Math.abs(diffDays(day, today)) > 1 && (
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-ink-soft">
                {day < today ? "Past" : "Upcoming"}
              </span>
            )}
          </span>
        }
        actions={dayNav}
      />

      {showSummary && (
        <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface-2 px-5 py-4">
          <ProgressRing value={dayTasks.length ? done.length / dayTasks.length : 0} size={52} stroke={5} label={`${done.length} of ${dayTasks.length} tasks done`}>
            <span className="text-xs font-semibold tabular-nums text-ink">
              {dayTasks.length ? Math.round((done.length / dayTasks.length) * 100) : 0}%
            </span>
          </ProgressRing>
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Tasks</dt>
              <dd className="font-semibold tabular-nums text-ink">
                {done.length}/{dayTasks.length} done
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Time-blocked</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatDuration(planned)}</dd>
            </div>
            <div className="hidden sm:block">
              <dt className="text-xs text-muted">Focus {isToday ? "today" : ""}</dt>
              <dd className="font-semibold tabular-nums text-ink">
                {formatDuration(focusToday)}
                <span className="font-normal text-muted"> / {formatDuration(settings.dailyFocusGoal)}</span>
              </dd>
            </div>
          </dl>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[#e5484d]/30 bg-[#e5484d]/5 px-5 py-3">
          <p className="text-sm text-ink">
            <span className="font-semibold">{overdue.length} overdue</span>{" "}
            <span className="text-ink-soft">task{overdue.length === 1 ? "" : "s"} from earlier days.</span>
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const moved = overdue.map((t) => ({ task: t, date: t.date }));
              for (const t of overdue) actions.updateTask(t.id, { date: today });
              toast.show({
                message: `Moved ${moved.length} task${moved.length === 1 ? "" : "s"} to today`,
                action: { label: "Undo", onClick: () => moved.forEach((m) => actions.updateTask(m.task.id, { date: m.date })) },
              });
            }}
          >
            Move to today
          </Button>
        </div>
      )}

      <div className="lg:hidden">
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "List" },
            { value: "timeline", label: "Timeline" },
          ]}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className={cx("flex flex-col gap-6", view === "timeline" && "hidden lg:flex")}>
          <QuickAdd date={day} placeholder={isToday ? "Add a task for today" : `Add a task for ${label}`} />

          <Card>
            {dayTasks.length === 0 ? (
              <EmptyState
                icon={<IconCalendar width={22} height={22} />}
                title={isToday ? "Nothing planned yet" : `Nothing planned for ${label}`}
              >
                Add a task above, or click a slot on the timeline to block out time.
              </EmptyState>
            ) : (
              <div className="flex flex-col gap-1 py-2">
                {scheduled.length > 0 && (
                  <section aria-label="Scheduled">
                    <h3 className="px-5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">Scheduled</h3>
                    <ul className="flex flex-col px-2">
                      {scheduled.map((t) => (
                        <TaskItem key={t.id} task={t} project={t.projectId ? projectMap.get(t.projectId) : undefined} {...listProps} />
                      ))}
                    </ul>
                  </section>
                )}
                {anytime.length > 0 && (
                  <section aria-label="Anytime">
                    <h3 className="px-5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">Anytime</h3>
                    <ul className="flex flex-col px-2">
                      {anytime.map((t) => (
                        <TaskItem key={t.id} task={t} project={t.projectId ? projectMap.get(t.projectId) : undefined} {...listProps} />
                      ))}
                    </ul>
                  </section>
                )}
                {open.length === 0 && (
                  <p className="px-5 py-3 text-sm font-medium text-brand-600 dark:text-brand-400">All done for {isToday ? "today" : label}. Nice work.</p>
                )}
                {done.length > 0 && (
                  <details className="group/done" open={open.length === 0}>
                    <summary className="mx-2 flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                      <IconChevronRight width={14} height={14} className="transition-transform group-open/done:rotate-90" />
                      Completed · {done.length}
                    </summary>
                    <ul className="flex flex-col px-2">
                      {done.map((t) => (
                        <TaskItem key={t.id} task={t} project={t.projectId ? projectMap.get(t.projectId) : undefined} {...listProps} />
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </Card>

          <HabitStrip day={day} />
        </div>

        <div className={cx("lg:sticky lg:top-8", view === "list" && "hidden lg:block")}>{timelineCard}</div>
      </div>

      <TaskEditor open={editor !== null} onClose={() => setEditor(null)} task={editor?.task} defaults={editor?.defaults} />
    </div>
  );
}
