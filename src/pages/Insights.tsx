import { useMemo, useState, type ReactNode } from "react";
import { useAppState } from "../lib/store/context";
import { addDays, formatDayShort, formatDuration, formatWeekday, fromKey, todayKey, weekDays } from "../lib/dates";
import { currentStreak, focusByProject, focusMinutesByDay, tasksCompletedByDay, weekCount } from "../lib/stats";
import { projectDot } from "../lib/projectColors";
import { usePageTitle } from "../lib/usePageTitle";
import { Button, IconButton } from "../components/Button";
import { Card, CardHeader, EmptyState, PageHeader, ProjectDot } from "../components/ui";
import { BarList, ColumnChart, type BarRow } from "../components/charts";
import { IconChart, IconChevronLeft, IconChevronRight, IconFlame } from "../components/icons";
import { cx } from "../lib/utils";

function Delta({ current, previous, unit }: { current: number; previous: number; unit: "duration" | "count" }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted">No activity either week</span>;
  if (previous === 0) return <span className="text-xs text-muted">No data last week</span>;
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  const up = diff > 0;
  const same = diff === 0;
  const amount = unit === "duration" ? formatDuration(Math.abs(diff)) : String(Math.abs(diff));
  return (
    <span className={cx("text-xs font-medium", same ? "text-muted" : up ? "text-brand-600 dark:text-brand-400" : "text-[#d9730d]")}>
      {same ? "Same as last week" : `${up ? "▲" : "▼"} ${amount} (${up ? "+" : ""}${pct}%) vs last week`}
    </span>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-line bg-surface px-5 py-4">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="text-2xl font-semibold text-ink">{value}</span>
      {children}
    </div>
  );
}

export function Insights() {
  usePageTitle("Insights");
  const state = useAppState();
  const { tasks, sessions, habits, projects, settings } = state;
  const [offset, setOffset] = useState(0);
  const today = todayKey();
  const days = weekDays(addDays(today, offset * 7), settings.weekStartsOn);
  const prevDays = days.map((d) => addDays(d, -7));
  const isCurrent = offset === 0;

  const data = useMemo(() => {
    const focus = focusMinutesByDay(sessions, days);
    const prevFocus = focusMinutesByDay(sessions, prevDays);
    const done = tasksCompletedByDay(tasks, days);
    const prevDone = tasksCompletedByDay(tasks, prevDays);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

    // Only days that have happened count toward averages.
    const elapsed = days.filter((d) => d <= today).length || 1;

    const activeHabits = habits.filter((h) => !h.archived);
    const habitRows = activeHabits.map((h) => ({
      habit: h,
      count: weekCount(h, days[0], settings.weekStartsOn),
      streak: currentStreak(h, today),
    }));
    const targetSum = habitRows.reduce((a, r) => a + r.habit.targetPerWeek, 0);
    const metSum = habitRows.reduce((a, r) => a + Math.min(r.count, r.habit.targetPerWeek), 0);

    const byProject = focusByProject(state, days);
    const projectRows: BarRow[] = [...byProject.entries()]
      .filter(([, v]) => v > 0)
      .map(([id, minutes]) => {
        const p = id ? projects.find((x) => x.id === id) : undefined;
        return p
          ? { key: p.id, label: p.name, value: minutes, swatch: <ProjectDot color={p.color} />, colorClass: projectDot[p.color] }
          : {
              key: "none",
              label: "No project",
              value: minutes,
              swatch: <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-ink-soft/50" />,
              colorClass: "bg-ink-soft/50",
            };
      })
      // Largest first; "No project" always last as the catch-all.
      .sort((a, b) => (a.key === "none" ? 1 : b.key === "none" ? -1 : b.value - a.value));

    return {
      focus,
      done,
      focusTotal: sum(focus),
      prevFocusTotal: sum(prevFocus),
      doneTotal: sum(done),
      prevDoneTotal: sum(prevDone),
      avgFocus: Math.round(sum(focus) / elapsed),
      goalDays: focus.filter((m) => m >= settings.dailyFocusGoal).length,
      habitRows,
      habitRate: targetSum ? Math.round((metSum / targetSum) * 100) : null,
      projectRows,
    };
    // days/prevDays derive from offset + settings
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, sessions, habits, projects, settings, offset, today]);

  const columns = (values: number[]) =>
    days.map((d, i) => ({ key: d, label: formatWeekday(d), sublabel: String(fromKey(d).getDate()), value: values[i] }));

  const hasAnyData = sessions.length > 0 || tasks.some((t) => t.done) || habits.length > 0;
  const rangeLabel = `${formatDayShort(days[0])} – ${formatDayShort(days[6])}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insights"
        subtitle={isCurrent ? `This week · ${rangeLabel}` : offset === -1 ? `Last week · ${rangeLabel}` : rangeLabel}
        actions={
          <div className="flex items-center gap-1">
            {!isCurrent && (
              <Button variant="secondary" size="sm" className="mr-1" onClick={() => setOffset(0)}>
                This week
              </Button>
            )}
            <IconButton label="Previous week" onClick={() => setOffset((o) => o - 1)}>
              <IconChevronLeft />
            </IconButton>
            <IconButton label="Next week" disabled={isCurrent} onClick={() => setOffset((o) => o + 1)}>
              <IconChevronRight />
            </IconButton>
          </div>
        }
      />

      {!hasAnyData ? (
        <Card>
          <EmptyState icon={<IconChart width={22} height={22} />} title="Your insights will appear here">
            Complete tasks, check off habits and run focus sessions — DayFlow turns them into weekly trends.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Focus time" value={formatDuration(data.focusTotal)}>
              <Delta current={data.focusTotal} previous={data.prevFocusTotal} unit="duration" />
            </Stat>
            <Stat label="Tasks completed" value={String(data.doneTotal)}>
              <Delta current={data.doneTotal} previous={data.prevDoneTotal} unit="count" />
            </Stat>
            <Stat label="Daily focus average" value={formatDuration(data.avgFocus)}>
              <span className="text-xs text-muted">
                Goal met on {data.goalDays} day{data.goalDays === 1 ? "" : "s"}
              </span>
            </Stat>
            <Stat label="Habit targets met" value={data.habitRate === null ? "—" : `${data.habitRate}%`}>
              <span className="text-xs text-muted">{data.habitRows.length ? "Across all active habits" : "No active habits"}</span>
            </Stat>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Focus time per day" />
              <div className="px-5 pb-5 pt-3">
                <ColumnChart
                  title="Focus time per day"
                  data={columns(data.focus)}
                  format={(v) => (v === 0 ? "0" : formatDuration(v))}
                  tickFormat={(v) => (v === 0 ? "0" : v < 60 ? `${v}m` : `${Number((v / 60).toFixed(1))}h`)}
                  kind="duration"
                  reference={{ value: settings.dailyFocusGoal, label: `Goal ${formatDuration(settings.dailyFocusGoal)}` }}
                  highlightKey={isCurrent ? today : undefined}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Tasks completed per day" />
              <div className="px-5 pb-5 pt-3">
                <ColumnChart
                  title="Tasks completed per day"
                  data={columns(data.done)}
                  format={(v) => String(v)}
                  kind="count"
                  highlightKey={isCurrent ? today : undefined}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Focus by project" />
              <div className="px-5 pb-5 pt-3">
                {data.projectRows.length ? (
                  <BarList title="Focus by project" rows={data.projectRows} format={formatDuration} />
                ) : (
                  <p className="py-6 text-center text-sm text-muted">No focus sessions this week.</p>
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Habits this week" />
              <div className="px-5 pb-5 pt-3">
                {data.habitRows.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">No active habits.</p>
                ) : (
                  <ul className="flex flex-col gap-3.5">
                    {data.habitRows.map(({ habit, count, streak }) => {
                      const ratio = Math.min(1, count / habit.targetPerWeek);
                      return (
                        <li key={habit.id} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate text-ink">{habit.name}</span>
                            <span className="inline-flex shrink-0 items-center gap-3 tabular-nums text-ink-soft">
                              {streak > 0 && isCurrent && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted">
                                  <IconFlame width={13} height={13} /> {streak}
                                </span>
                              )}
                              {count}/{habit.targetPerWeek}
                            </span>
                          </div>
                          <div
                            className="h-2.5 rounded-[4px] bg-brand-100 dark:bg-brand-900/60"
                            role="meter"
                            aria-valuemin={0}
                            aria-valuemax={habit.targetPerWeek}
                            aria-valuenow={count}
                            aria-label={`${habit.name}: ${count} of ${habit.targetPerWeek} this week`}
                          >
                            <div
                              className="h-full rounded-[4px] bg-brand-500 transition-[width] duration-500 ease-[var(--ease-out-soft)] dark:bg-brand-400"
                              style={{ width: `${ratio * 100}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
