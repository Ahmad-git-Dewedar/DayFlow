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
import { useI18n } from "../i18n/context";


function HabitForm({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const actions = useActions();
  const toast = useToast();
  const { m, f, p } = useI18n();
  const id = useId();
  const [name, setName] = useState(habit?.name ?? "");
  const [target, setTarget] = useState(habit?.targetPerWeek ?? 7);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError(m.habits.error);
    if (habit) actions.updateHabit(habit.id, { name: trimmed, targetPerWeek: target });
    else {
      actions.addHabit(trimmed, target);
      toast.show({ message: f(m.habits.started, { name: trimmed }), tone: "success" });
    }
    onClose();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label={m.habits.habit} htmlFor={`${id}-name`} error={error ?? undefined}>
        <input
          id={`${id}-name`}
          className="field"
          data-autofocus
          maxLength={80}
          value={name}
          placeholder={m.habits.placeholder}
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
          {m.habits.suggestions.map((s) => (
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
      <Field label={m.habits.target} htmlFor={`${id}-target`} hint={target === 7 ? m.habits.everyDay : p(m.habits.perWeek, target)}>
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
          <span className="w-10 text-end font-semibold tabular-nums text-ink">{target}/7</span>
        </div>
      </Field>
      <div className="flex justify-end gap-2 pb-2 pt-1">
        <Button variant="secondary" onClick={onClose}>
          {m.common.cancel}
        </Button>
        <Button type="submit">{habit ? m.common.save : m.habits.addHabit}</Button>
      </div>
    </form>
  );
}

function HabitMenu({ habit, onEdit }: { habit: Habit; onEdit: (h: Habit) => void }) {
  const actions = useActions();
  const toast = useToast();
  const { m, f } = useI18n();
  const deleteHabit = useDeleteHabit();
  return (
    <>
      <IconButton label={f(m.habits.edit, { name: habit.name })} size="sm" onClick={() => onEdit(habit)}>
        <IconEdit width={17} height={17} />
      </IconButton>
      <IconButton
        label={f(m.habits.archive, { name: habit.name })}
        size="sm"
        onClick={() => {
          actions.updateHabit(habit.id, { archived: true });
          toast.show({
            message: f(m.habits.archived, { name: habit.name }),
            action: { label: m.common.undo, onClick: () => actions.updateHabit(habit.id, { archived: false }) },
          });
        }}
      >
        <IconArchive width={17} height={17} />
      </IconButton>
      <IconButton label={f(m.habits.delete, { name: habit.name })} size="sm" onClick={() => deleteHabit(habit)}>
        <IconTrash width={17} height={17} />
      </IconButton>
    </>
  );
}

function HabitRow({ habit, days, onEdit }: { habit: Habit; days: string[]; onEdit: (h: Habit) => void }) {
  const { m, f, p } = useI18n();
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
              {p(m.habits.streak, streak)}
            </span>
            <span>{f(m.habits.best, { n: best })}</span>
            <span className={cx(hit && "font-medium text-brand-600 dark:text-brand-400")}>
              {f(m.habits.week, { count: thisWeek, target: habit.targetPerWeek })}
              {hit ? " ✓" : ""}
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
              aria-label={f(m.habits.day, { name: habit.name, day: relativeDayLabel(d, today), date: formatDayShort(d), state: done ? m.habits.done : m.habits.notDone })}
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
  const { m, f, p } = useI18n();
  usePageTitle(m.habits.title);
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
        title={m.habits.title}
        subtitle={active.length ? f(m.habits.doneToday, { done: doneToday, total: active.length }) : m.habits.tagline}
        actions={
          <Button size="sm" onClick={() => setEditor({ habit: null })}>
            <IconPlus width={17} height={17} /> {m.habits.new}
          </Button>
        }
      />

      <Card>
        {active.length === 0 ? (
          <EmptyState
            icon={<IconRepeat width={22} height={22} />}
            title={m.habits.emptyTitle}
            action={<Button onClick={() => setEditor({ habit: null })}>{m.habits.add}</Button>}
          >
            {m.habits.emptyBody}
          </EmptyState>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <p className="text-sm font-medium text-ink">
                {weekOffset === 0 ? m.habits.thisWeek : weekOffset === -1 ? m.habits.lastWeek : `${formatDayShort(days[0])} – ${formatDayShort(days[6])}`}
              </p>
              <div className="flex items-center gap-1">
                {weekOffset !== 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                    {m.habits.thisWeek}
                  </Button>
                )}
                <IconButton label={m.habits.prevWeek} size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
                  <IconChevronLeft width={18} height={18} className="rtl:-scale-x-100" />
                </IconButton>
                <IconButton label={m.habits.nextWeek} size="sm" disabled={weekOffset >= 0} onClick={() => setWeekOffset((w) => w + 1)}>
                  <IconChevronRight width={18} height={18} className="rtl:-scale-x-100" />
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
            <IconChevronRight width={15} height={15} className="transition-transform rtl:-scale-x-100 ltr:group-open/arch:rotate-90 rtl:group-open/arch:-rotate-90" />
            {f(m.habits.archivedList, { n: archived.length })}
          </summary>
          <Card className="mt-3">
            <ul>
              {archived.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0">
                  <div>
                    <p className="text-ink">{h.name}</p>
                    <p className="text-xs text-muted">{p(m.habits.archivedStats, Object.keys(h.log).length, { best: longestStreak(h) })}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="secondary" size="sm" onClick={() => actions.updateHabit(h.id, { archived: false })}>
                      {m.habits.restore}
                    </Button>
                    <IconButton label={f(m.habits.delete, { name: h.name })} size="sm" onClick={() => deleteHabit(h)}>
                      <IconTrash width={17} height={17} />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </details>
      )}

      <Modal open={editor !== null} onClose={() => setEditor(null)} title={editor?.habit ? m.habits.formEdit : m.habits.formNew}>
        {editor && <HabitForm key={editor.habit?.id ?? "new"} habit={editor.habit} onClose={() => setEditor(null)} />}
      </Modal>
    </div>
  );
}
