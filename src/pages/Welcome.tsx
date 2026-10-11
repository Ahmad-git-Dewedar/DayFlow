import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent, type SVGProps } from "react";
import { useNavigate } from "react-router-dom";
import { useActions, useAppState } from "../lib/store/context";
import {
  EMPTY_ANSWERS,
  PROFILES,
  QUESTIONS,
  buildSetup,
  explain,
  planSetup,
  rankProfiles,
  type Answers,
  type IconKey,
  type ProfileId,
  type Question,
} from "../lib/onboarding";
import { sampleState } from "../lib/store/sample";
import { formatDuration, todayKey } from "../lib/dates";
import { newId } from "../lib/id";
import { useToast } from "../lib/toast";
import { usePageTitle } from "../lib/usePageTitle";
import { cx } from "../lib/utils";
import { Logo } from "../components/Logo";
import { Button } from "../components/Button";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFocus,
  IconLayers,
  IconListChecks,
  IconRepeat,
  IconWave,
} from "../components/icons";

const ICONS: Record<IconKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  calendar: IconCalendar,
  repeat: IconRepeat,
  focus: IconFocus,
  list: IconListChecks,
  clock: IconClock,
  layers: IconLayers,
  wave: IconWave,
};

/** Delay before a clicked answer advances, so the selection is visible first. */
const ADVANCE_MS = 280;

type Step = "intro" | number | "result";

/* ------------------------------------------------------------------ */
/* Question step                                                       */
/* ------------------------------------------------------------------ */

function QuestionStep({
  question,
  index,
  answers,
  onAnswer,
  onBack,
  onNext,
}: {
  question: Question;
  index: number;
  answers: Answers;
  onAnswer: (a: Answers) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<number | null>(null);
  // True between a pointer press on an option and the change it causes.
  const pointerPress = useRef(false);

  useEffect(() => {
    // Move focus to the new question so screen readers announce it.
    headingRef.current?.focus();
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  const multi = question.kind === "multi";
  const selectedValues: (string | number)[] = multi ? answers.areas : answers[question.id] !== null ? [answers[question.id] as string | number] : [];
  const answered = multi || selectedValues.length > 0;

  function choose(value: string | number, viaPointer: boolean) {
    if (question.kind === "multi") {
      const area = value as Answers["areas"][number];
      const areas = answers.areas.includes(area) ? answers.areas.filter((a) => a !== area) : [...answers.areas, area];
      onAnswer({ ...answers, areas });
      return;
    }
    onAnswer({ ...answers, [question.id]: value });
    // Clicking an answer moves on by itself; keyboard users confirm with Enter,
    // so arrowing through options never skips ahead unexpectedly.
    if (viaPointer) {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(onNext, ADVANCE_MS);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (answered) onNext();
  }

  const name = `q-${question.id}`;

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted">
          Question {index + 1} of {QUESTIONS.length}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none sm:text-[2rem]">
          {question.title}
        </h1>
        <p className="text-ink-soft">{question.subtitle}</p>
      </div>

      <fieldset onKeyDown={() => (pointerPress.current = false)}>
        <legend className="sr-only">{question.title}</legend>
        <div className={cx("grid gap-3", multi && "grid-cols-2 sm:grid-cols-3")}>
          {question.options.map((o) => {
            const selected = selectedValues.includes(o.value);
            const Icon = o.icon ? ICONS[o.icon] : null;
            return (
              <label
                key={String(o.value)}
                onPointerDown={() => (pointerPress.current = true)}
                className={cx(
                  "flex cursor-pointer select-none items-center gap-4 rounded-2xl border bg-surface transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400",
                  multi ? "px-4 py-3.5" : "p-4",
                  selected
                    ? "border-brand-500 bg-brand-50/70 dark:border-brand-400 dark:bg-brand-900/30"
                    : "border-line hover:border-brand-300 hover:bg-surface-2 dark:hover:border-brand-700",
                )}
              >
                <input
                  type={multi ? "checkbox" : "radio"}
                  name={name}
                  value={String(o.value)}
                  checked={selected}
                  onChange={() => {
                    choose(o.value, pointerPress.current);
                    pointerPress.current = false;
                  }}
                  className="sr-only"
                />
                {!multi && (
                  <span
                    aria-hidden
                    className={cx(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                      selected ? "bg-brand-500 text-white dark:bg-brand-400 dark:text-brand-950" : "bg-surface-2 text-ink-soft",
                    )}
                  >
                    {Icon ? <Icon width={21} height={21} /> : question.id === "span" ? `${o.value}${o.value === 90 ? "+" : ""}` : null}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-ink">{o.label}</span>
                  {o.hint && <span className="text-sm text-ink-soft">{o.hint}</span>}
                </span>
                <span
                  aria-hidden
                  className={cx(
                    "flex h-5 w-5 shrink-0 items-center justify-center border-[1.5px] transition-colors",
                    multi ? "rounded-md" : "rounded-full",
                    selected ? "border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-brand-950" : "border-ink-soft/35",
                  )}
                >
                  {selected && <IconCheck width={12} height={12} strokeWidth={3.2} />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <IconArrowLeft width={18} height={18} /> Back
        </Button>
        <Button type="submit" disabled={!answered}>
          {multi && answers.areas.length === 0 ? "Skip" : index === QUESTIONS.length - 1 ? "See my result" : "Continue"}
          <IconArrowRight width={18} height={18} />
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Result step                                                         */
/* ------------------------------------------------------------------ */

function ResultStep({
  answers,
  onBack,
  onApply,
}: {
  answers: Answers;
  onBack: () => void;
  onApply: (profile: ProfileId, habits: string[]) => void;
}) {
  const ranked = useMemo(() => rankProfiles(answers), [answers]);
  const [profileId, setProfileId] = useState<ProfileId>(ranked[0]);
  const setup = useMemo(() => buildSetup(profileId, answers), [profileId, answers]);
  const [habits, setHabits] = useState<string[]>(setup.defaultHabits);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const profile = PROFILES[profileId];
  const Icon = ICONS[profile.icon];
  const isBest = profileId === ranked[0];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function switchTo(id: ProfileId) {
    setProfileId(id);
    setHabits(buildSetup(id, answers).defaultHabits);
  }

  const toggleHabit = (name: string) =>
    setHabits((hs) => (hs.includes(name) ? hs.filter((h) => h !== name) : [...hs, name]));

  return (
    <div className="flex flex-col gap-8">
      <div key={profileId} className="flex animate-rise-in flex-col items-start gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white dark:bg-brand-400 dark:text-brand-950">
          <Icon width={28} height={28} />
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{isBest ? "Your best fit" : "Your pick"}</p>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold outline-none sm:text-4xl">
            {profile.name}
          </h1>
          <p className="max-w-lg text-lg text-ink-soft">
            <span className="font-medium text-ink">{profile.tagline}</span> {profile.description}
          </p>
          {isBest && explain(answers) && <p className="text-sm text-muted">{explain(answers)}</p>}
        </div>
      </div>

      <section aria-label="What we'll set up" className="rounded-[var(--radius-lg)] border border-line">
        <dl className="divide-y divide-line">
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <dt className="text-sm text-ink-soft">Opens on</dt>
            <dd className="text-right font-medium text-ink">{profile.homeLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <dt className="text-sm text-ink-soft">Focus sessions</dt>
            <dd className="font-medium text-ink">{formatDuration(setup.focusLength)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <dt className="text-sm text-ink-soft">Daily focus goal</dt>
            <dd className="font-medium text-ink">{formatDuration(setup.dailyFocusGoal)}</dd>
          </div>
          <div className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <dt className="text-sm text-ink-soft">Projects</dt>
            <dd className="font-medium text-ink sm:text-right">
              {setup.projects.length ? setup.projects.join(", ") : <span className="font-normal text-muted">None — add them anytime</span>}
            </dd>
          </div>
          <div className="flex flex-col gap-2.5 px-5 py-3.5">
            <dt className="text-sm text-ink-soft">Starter habits</dt>
            <dd>
              {setup.habitSuggestions.length === 0 ? (
                <span className="text-muted">None — keeping it minimal</span>
              ) : (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Starter habits">
                  {setup.habitSuggestions.map((h) => {
                    const on = habits.includes(h.name);
                    return (
                      <button
                        key={h.name}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleHabit(h.name)}
                        className={cx(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                          on
                            ? "border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-900/40 dark:text-brand-100"
                            : "border-line text-ink-soft hover:border-brand-300",
                        )}
                      >
                        {on && <IconCheck width={13} height={13} strokeWidth={3} />}
                        {h.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>
          <IconArrowLeft width={18} height={18} /> Back
        </Button>
        <Button size="lg" onClick={() => onApply(profileId, habits)}>
          Set up my DayFlow <IconArrowRight width={18} height={18} />
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <p className="text-sm text-ink-soft">Not quite you? Try another style:</p>
        <div className="flex flex-wrap gap-2">
          {ranked
            .filter((id) => id !== profileId)
            .map((id) => {
              const P = PROFILES[id];
              const PIcon = ICONS[P.icon];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchTo(id)}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-brand-300 hover:text-ink"
                >
                  <PIcon width={16} height={16} />
                  {P.name.replace(/^The /, "")}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function Welcome() {
  usePageTitle("Welcome");
  const state = useAppState();
  const actions = useActions();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const introHeading = useRef<HTMLHeadingElement>(null);

  const retake = state.settings.onboarded;
  const emptyWorkspace = state.tasks.length + state.habits.length + state.projects.length + state.sessions.length === 0;
  const questionIndex = typeof step === "number" ? step : -1;

  useEffect(() => {
    if (step === "intro") introHeading.current?.focus();
  }, [step]);

  const next = () =>
    setStep((s) => (s === "intro" ? 0 : typeof s === "number" ? (s + 1 < QUESTIONS.length ? s + 1 : "result") : s));
  const back = () =>
    setStep((s) => (s === "result" ? QUESTIONS.length - 1 : typeof s === "number" ? (s === 0 ? "intro" : s - 1) : s));

  function leave() {
    if (!retake) actions.updateSettings({ onboarded: true });
    navigate("/", { replace: true });
  }

  function apply(profileId: ProfileId, habits: string[]) {
    const plan = planSetup(state, buildSetup(profileId, answers), habits, newId, Date.now());
    actions.applySetup(plan);
    toast.show({ message: retake ? `Switched to ${PROFILES[profileId].name}` : "You're all set. Welcome to DayFlow.", tone: "success" });
    navigate(PROFILES[profileId].home, { replace: true });
  }

  function loadSample() {
    actions.replaceData(sampleState(todayKey(), { ...state.settings, onboarded: true }));
    navigate("/", { replace: true });
  }

  const progress = step === "intro" ? 0 : step === "result" ? 1 : (questionIndex + 1) / (QUESTIONS.length + 1);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-5 pt-5 sm:pt-7">
        <Logo size={28} />
        <Button variant="ghost" size="sm" onClick={leave}>
          {retake ? "Cancel" : step === "result" ? "Skip setup" : "Skip"}
        </Button>
      </header>

      <div className="mx-auto mt-4 w-full max-w-xl px-5" aria-hidden={step === "intro"}>
        <div
          className={cx("h-1 overflow-hidden rounded-full bg-surface-3 transition-opacity", step === "intro" && "opacity-0")}
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-[var(--ease-out-soft)] dark:bg-brand-400"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-10 sm:py-14">
        <div key={String(step)} className="animate-rise-in">
          {step === "intro" && (
            <div className="flex flex-col items-start gap-8">
              <Logo showWordmark={false} size={56} />
              <div className="flex flex-col gap-3">
                <h1 ref={introHeading} tabIndex={-1} className="text-3xl font-semibold outline-none sm:text-[2.6rem]">
                  {retake ? "Find your DayFlow style" : "Let's shape DayFlow around you"}
                </h1>
                <p className="max-w-md text-lg text-ink-soft">
                  {retake
                    ? "Answer a few questions and we'll fine-tune your setup. We only add what you don't already have."
                    : "Four quick questions, then we'll set things up the way you work. It takes about a minute."}
                </p>
              </div>
              <div className="flex flex-col items-start gap-4">
                <Button size="lg" onClick={next}>
                  Get started <IconArrowRight width={18} height={18} />
                </Button>
                {!retake && emptyWorkspace && (
                  <button type="button" onClick={loadSample} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                    Just looking? Explore with sample data
                  </button>
                )}
              </div>
            </div>
          )}

          {typeof step === "number" && (
            <QuestionStep
              question={QUESTIONS[step]}
              index={step}
              answers={answers}
              onAnswer={setAnswers}
              onBack={back}
              onNext={next}
            />
          )}

          {step === "result" && <ResultStep answers={answers} onBack={back} onApply={apply} />}
        </div>
      </main>
    </div>
  );
}
