import { useId, useState, type FormEvent } from "react";
import { useActions, useAppState } from "../lib/store/context";
import type { Habit } from "../lib/store/types";
import { addDays, formatDayShort, formatWeekday, fromKey, relativeDayLabel, todayKey, weekDays } from "../lib/dates";
import { currentStreak, longestStreak, weekCount } from "../lib/stats";
import { usePageTitle } from "../lib/usePageTitle";
import { useDeleteHabit } from "../lib/useDeleteTask";
import { useToast } from "../lib/toast";
import { Button, IconButton } from "../components/Button";
import { Card, EmptyState, Field, PageHeader } from "../components/ui";
import { Modal } from "../components/Modal";
import { IconArchive, IconCheck, IconChevronLeft, IconChevronRight, IconEdit, IconFlame, IconPlus, IconRepeat, IconTrash } from "../components/icons";
import { cx } from "../lib/utils";

const SUGGESTIONS = ["Read 20 minutes", "Drink water", "Exercise", "Meditate", "Journal", "No phone after 10pm"];

function HabitForm({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const actions = useActions();
  const toast = useToast();
  const id = useId();
  const [name, setName] = useState(habit?.name ?? "");
  const [target, setTarget] = useState(habit?.targetPerWeek ?? 7);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Name your habit.");
    if (habit) actions.updateHabit(habit.id, { name: trimmed, targetPerWeek: target });
    else {
      actions.addHabit(trimmed, target);
      toast.show({ message: `Started “${trimmed}”`, tone: "success" });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Habit" htmlFor={`${id}-name`} error={error ?? undefined}>
        <input
          id={`${id}-name`}
          className="field"
          data-autofocus
          maxLength={80}
          value={name}
          placeholder="e.g. Read 20 minutes"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-name-error` : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
      </Field>
      {!habit && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setName(s);
                setError(null);
              }}
              className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft transition-colors hover:border-brand-300 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <Field label="Weekly target" htmlFor={`${id}-target`} hint={target === 7 ? "Every day" : `${target} day${target === 1 ? "" : "s"} a week`}>
        <div className="flex items-center gap-3">
          <input
            id={`${id}-target`}
            type="range"
            min={1}
            max={7}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="flex-1 accent-[var(--color-brand-500)]"
          />
          <span className="w-10 text-right font-semibold tabular-nums text-ink">{target}/7</span>
        </div>
      </Field>
      <div className="flex justify-end gap-2 pb-2 pt-1">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{habit ? "Save" : "Add habit"}</Button>
      </div>
    </form>
  );
}

function HabitMenu({ habit, onEdit }: { habit: Habit; onEdit: (h: Habit) => void }) {
  const actions = useActions();
  const toast = useToast();
  const deleteHabit = useDeleteHabit();
  return (
    <>
      <IconButton label={`Edit ${habit.name}`} size="sm" onClick={() => onEdit(habit)}>
        <IconEdit width={17} height={17} />
      </IconButton>
      <IconButton
        label={`Archive ${habit.name}`}
        size="sm"
        onClick={() => {
          actions.updateHabit(habit.id, { archived: true });
          toast.show({
            message: `Archived “${habit.name}”`,
            action: { label: "Undo", onClick: () => actions.updateHabit(habit.id, { archived: false }) },
          });
        }}
      >
        <IconArchive width={17} height={17} />
      </IconButton>
      <IconButton label={`Delete ${habit.name}`} size="sm" onClick={() => deleteHabit(habit)}>
        <IconTrash width={17} height={17} />
      </IconButton>
    </>
  );
}

function HabitRow({ habit, days, onEdit }: { habit: Habit; days: string[]; onEdit: (h: Habit) => void }) {
  const { settings } = useAppState();
  const actions = useActions();
  const today = todayKey();
  const streak = currentStreak(habit, today);
  const best = longestStreak(habit);
  const thisWeek = weekCount(habit, days[0], settings.weekStartsOn);
  const hit = thisWeek >= habit.targetPerWeek;

  return (
    <li className="flex flex-col gap-4 border-b border-line px-5 py-4 last:border-0 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{habit.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className={cx("inline-flex items-center gap-1", streak > 0 && "font-medium text-[#d9730d]")}>
              <IconFlame width={14} height={14} />
              {streak} day streak
            </span>
            <span>Best {best}</span>
            <span className={cx(hit && "font-medium text-brand-600 dark:text-brand-400")}>
              {thisWeek}/{habit.targetPerWeek} this week{hit ? " ✓" : ""}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center lg:hidden">
          <HabitMenu habit={habit} onEdit={onEdit} />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 lg:w-[22rem]">
        {days.map((d) => {
          const done = !!habit.log[d];
          const future = d > today;
          return (
            <button
              key={d}
              type="button"
              disabled={future}
              aria-pressed={done}
              aria-label={`${habit.name}, ${relativeDayLabel(d, today)} (${formatDayShort(d)}): ${done ? "done" : "not done"}`}
              onClick={() => actions.toggleHabitDay(habit.id, d)}
              className={cx(
                "flex aspect-square max-h-11 w-full items-center justify-center rounded-lg border text-xs transition-colors",
                done
                  ? "border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-brand-950"
                  : future
                    ? "border-dashed border-line text-muted/60"
                    : d === today
                      ? "border-brand-400 text-ink ring-1 ring-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/40"
                      : "border-line text-muted hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/40",
              )}
            >
              {done ? <IconCheck width={16} height={16} strokeWidth={3} className="animate-pop" /> : fromKey(d).getDate()}
            </button>
          );
        })}
      </div>

      <div className="hidden shrink-0 items-center lg:flex">
        <HabitMenu habit={habit} onEdit={onEdit} />
      </div>
    </li>
  );
}

export function Habits() {
  usePageTitle("Habits");
  const { habits, settings } = useAppState();
  const actions = useActions();
  const deleteHabit = useDeleteHabit();
  const [editor, setEditor] = useState<{ habit: Habit | null } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const today = todayKey();
  const anchor = addDays(today, weekOffset * 7);
  const days = weekDays(anchor, settings.weekStartsOn);

  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const doneToday = active.filter((h) => h.log[today]).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Habits"
        subtitle={active.length ? `${doneToday} of ${active.length} done today` : "Small things, every day."}
        actions={
          <Button size="sm" onClick={() => setEditor({ habit: null })}>
            <IconPlus width={17} height={17} /> New habit
          </Button>
        }
      />

      <Card>
        {active.length === 0 ? (
          <EmptyState
            icon={<IconRepeat width={22} height={22} />}
            title="Build your first habit"
            action={<Button onClick={() => setEditor({ habit: null })}>Add a habit</Button>}
          >
            Check it off each day to grow a streak. Set a weekly target for habits you don't need every day.
          </EmptyState>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <p className="text-sm font-medium text-ink">
                {weekOffset === 0 ? "This week" : weekOffset === -1 ? "Last week" : `${formatDayShort(days[0])} – ${formatDayShort(days[6])}`}
              </p>
              <div className="flex items-center gap-1">
                {weekOffset !== 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                    This week
                  </Button>
                )}
                <IconButton label="Previous week" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
                  <IconChevronLeft width={18} height={18} />
                </IconButton>
                <IconButton label="Next week" size="sm" disabled={weekOffset >= 0} onClick={() => setWeekOffset((w) => w + 1)}>
                  <IconChevronRight width={18} height={18} />
                </IconButton>
              </div>
            </div>
            {/* Weekday header: full-width grid on small screens, aligned to the right column on desktop. */}
            <div className="grid grid-cols-7 gap-1.5 px-5 pt-3 sm:gap-2 lg:hidden" aria-hidden>
              {days.map((d) => (
                <span key={d} className={cx("text-center text-xs", d === today ? "font-semibold text-brand-600 dark:text-brand-400" : "text-muted")}>
                  {formatWeekday(d, "narrow")}
                </span>
              ))}
            </div>
            <div className="hidden gap-6 px-5 pt-3 lg:flex" aria-hidden>
              <div className="flex-1" />
              <div className="grid w-[22rem] grid-cols-7 gap-2">
                {days.map((d) => (
                  <span key={d} className={cx("text-center text-xs", d === today ? "font-semibold text-brand-600 dark:text-brand-400" : "text-muted")}>
                    {formatWeekday(d, "narrow")}
                  </span>
                ))}
              </div>
              <div className="w-24 shrink-0" />
            </div>
            <ul>
              {active.map((h) => (
                <HabitRow key={h.id} habit={h} days={days} onEdit={(habit) => setEditor({ habit })} />
              ))}
            </ul>
          </>
        )}
      </Card>

      {archived.length > 0 && (
        <details className="group/arch">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
            <IconChevronRight width={15} height={15} className="transition-transform group-open/arch:rotate-90" />
            Archived habits · {archived.length}
          </summary>
          <Card className="mt-3">
            <ul>
              {archived.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0">
                  <div>
                    <p className="text-ink">{h.name}</p>
                    <p className="text-xs text-muted">Best streak {longestStreak(h)} · {Object.keys(h.log).length} check-ins</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="secondary" size="sm" onClick={() => actions.updateHabit(h.id, { archived: false })}>
                      Restore
                    </Button>
                    <IconButton label={`Delete ${h.name}`} size="sm" onClick={() => deleteHabit(h)}>
                      <IconTrash width={17} height={17} />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </details>
      )}

      <Modal open={editor !== null} onClose={() => setEditor(null)} title={editor?.habit ? "Edit habit" : "New habit"}>
        {editor && <HabitForm key={editor.habit?.id ?? "new"} habit={editor.habit} onClose={() => setEditor(null)} />}
      </Modal>
    </div>
  );
}
