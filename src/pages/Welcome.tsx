import { useEffect, useId, useMemo, useRef, useState, type ComponentType, type FormEvent, type SVGProps } from "react";
import { useNavigate } from "react-router-dom";
import { useActions, useAppState } from "../lib/store/context";
import {
  EMPTY_ANSWERS,
  PROFILES,
  QUESTIONS,
  buildSetup,
  planSetup,
  rankProfiles,
  type Answers,
  type HabitKey,
  type IconKey,
  type ProfileId,
  type Question,
} from "../lib/onboarding";
import { sampleState } from "../lib/store/sample";
import { formatDuration, todayKey } from "../lib/dates";
import { newId } from "../lib/id";
import { requestPersistence } from "../lib/persist";
import { useToast } from "../lib/toast";
import { usePageTitle } from "../lib/usePageTitle";
import { useI18n } from "../i18n/context";
import type { Messages } from "../i18n/en";
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
/** The name step plus the four questions. */
const TOTAL_STEPS = QUESTIONS.length + 1;

type Step = "intro" | "name" | number | "result";

/** Arrows point the way the reading direction flows. */
const Back = () => <IconArrowLeft width={18} height={18} className="rtl:-scale-x-100" />;
const Forward = () => <IconArrowRight width={18} height={18} className="rtl:-scale-x-100" />;

/** Text for one answer option, from the current language's messages. */
function optionText(m: Messages, q: Question, value: string | number): { label: string; hint?: string } {
  const qs = m.welcome.questions;
  switch (q.id) {
    case "goal":
      return qs.goal.options[value as keyof typeof qs.goal.options];
    case "style":
      return qs.style.options[value as keyof typeof qs.style.options];
    case "span":
      return qs.span.options[String(value) as keyof typeof qs.span.options];
    case "areas":
      return { label: m.welcome.areas[value as keyof typeof m.welcome.areas] };
  }
}

/* ------------------------------------------------------------------ */
/* Name step — the local account                                       */
/* ------------------------------------------------------------------ */

function NameStep({ initial, onBack, onNext }: { initial: string; onBack: () => void; onNext: (name: string) => void }) {
  const { m, f } = useI18n();
  const [name, setName] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    onNext(name.trim().slice(0, 60));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted">{f(m.welcome.step, { n: 1, total: TOTAL_STEPS })}</p>
        <h1 className="text-2xl font-semibold sm:text-[2rem]">{m.welcome.nameTitle}</h1>
        <p className="text-ink-soft">{m.welcome.nameSubtitle}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="sr-only">
          {m.welcome.nameLabel}
        </label>
        <input
          ref={inputRef}
          id={id}
          className="field h-14 text-lg"
          value={name}
          maxLength={60}
          autoComplete="given-name"
          placeholder={m.welcome.namePlaceholder}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <Back /> {m.common.back}
        </Button>
        <Button type="submit">
          {name.trim() ? m.common.continue : m.welcome.skipQuestion}
          <Forward />
        </Button>
      </div>
    </form>
  );
}

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
  const { m, f } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<number | null>(null);
  // True between a pointer press on an option and the change it causes.
  const pointerPress = useRef(false);
  const text = m.welcome.questions[question.id];

  useEffect(() => {
    // Move focus to the new question so screen readers announce it.
    headingRef.current?.focus();
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  const multi = question.kind === "multi";
  const selectedValues: (string | number)[] = multi
    ? answers.areas
    : answers[question.id] !== null
      ? [answers[question.id] as string | number]
      : [];
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
  const isLast = index === QUESTIONS.length - 1;

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted">{f(m.welcome.step, { n: index + 2, total: TOTAL_STEPS })}</p>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none sm:text-[2rem]">
          {text.title}
        </h1>
        <p className="text-ink-soft">{text.subtitle}</p>
      </div>

      <fieldset onKeyDown={() => (pointerPress.current = false)}>
        <legend className="sr-only">{text.title}</legend>
        <div className={cx("grid gap-3", multi && "grid-cols-2 sm:grid-cols-3")}>
          {question.options.map((o) => {
            const selected = selectedValues.includes(o.value);
            const Icon = "icon" in o ? ICONS[o.icon] : null;
            const { label, hint } = optionText(m, question, o.value);
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
                    {Icon ? <Icon width={21} height={21} /> : `${o.value}${o.value === 90 ? "+" : ""}`}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-ink">{label}</span>
                  {hint && <span className="text-sm text-ink-soft">{hint}</span>}
                </span>
                <span
                  aria-hidden
                  className={cx(
                    "flex h-5 w-5 shrink-0 items-center justify-center border-[1.5px] transition-colors",
                    multi ? "rounded-md" : "rounded-full",
                    selected
                      ? "border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-brand-950"
                      : "border-ink-soft/35",
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
          <Back /> {m.common.back}
        </Button>
        <Button type="submit" disabled={!answered}>
          {multi && answers.areas.length === 0 ? m.welcome.skipQuestion : isLast ? m.welcome.seeResult : m.common.continue}
          <Forward />
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
  onApply: (profile: ProfileId, habits: HabitKey[]) => void;
}) {
  const { m, f, locale } = useI18n();
  const ranked = useMemo(() => rankProfiles(answers), [answers]);
  const [profileId, setProfileId] = useState<ProfileId>(ranked[0]);
  const setup = useMemo(() => buildSetup(profileId, answers), [profileId, answers]);
  const [habits, setHabits] = useState<HabitKey[]>(setup.defaultHabits);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const profile = m.welcome.profiles[profileId];
  const Icon = ICONS[PROFILES[profileId].icon];
  const isBest = profileId === ranked[0];

  const why =
    answers.goal && answers.style && answers.span
      ? f(m.welcome.why, {
          goal: m.welcome.goalPhrase[answers.goal],
          style: m.welcome.stylePhrase[answers.style],
          span: answers.span === 90 ? m.welcome.spanPhraseLong : f(m.welcome.spanPhrase, { n: answers.span }),
        })
      : "";

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function switchTo(id: ProfileId) {
    setProfileId(id);
    setHabits(buildSetup(id, answers).defaultHabits);
  }

  const toggleHabit = (key: HabitKey) => setHabits((hs) => (hs.includes(key) ? hs.filter((h) => h !== key) : [...hs, key]));

  return (
    <div className="flex flex-col gap-8">
      <div key={profileId} className="flex animate-rise-in flex-col items-start gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white dark:bg-brand-400 dark:text-brand-950">
          <Icon width={28} height={28} />
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{isBest ? m.welcome.bestFit : m.welcome.yourPick}</p>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold outline-none sm:text-4xl">
            {profile.name}
          </h1>
          <p className="max-w-lg text-lg text-ink-soft">
            <span className="font-medium text-ink">{profile.tagline}</span> {profile.description}
          </p>
          {isBest && why && <p className="text-sm text-muted">{why}</p>}
        </div>
      </div>

      <section aria-label={m.welcome.whatWeSetUp} className="rounded-[var(--radius-lg)] border border-line">
        <dl className="divide-y divide-line">
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <dt className="text-sm text-ink-soft">{m.welcome.opensOn}</dt>
            <dd className="text-end font-medium text-ink">{profile.home}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <dt className="text-sm text-ink-soft">{m.welcome.focusSessions}</dt>
            <dd className="font-medium text-ink">{formatDuration(setup.focusLength)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <dt className="text-sm text-ink-soft">{m.welcome.dailyGoal}</dt>
            <dd className="font-medium text-ink">{formatDuration(setup.dailyFocusGoal)}</dd>
          </div>
          <div className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <dt className="text-sm text-ink-soft">{m.welcome.projects}</dt>
            <dd className="font-medium text-ink sm:text-end">
              {setup.areas.length ? (
                new Intl.ListFormat(locale, { type: "conjunction" }).format(setup.areas.map((a) => m.welcome.areas[a]))
              ) : (
                <span className="font-normal text-muted">{m.welcome.projectsNone}</span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-2.5 px-5 py-3.5">
            <dt className="text-sm text-ink-soft">{m.welcome.starterHabits}</dt>
            <dd>
              {setup.habitSuggestions.length === 0 ? (
                <span className="text-muted">{m.welcome.habitsNone}</span>
              ) : (
                <div className="flex flex-wrap gap-2" role="group" aria-label={m.welcome.starterHabits}>
                  {setup.habitSuggestions.map((h) => {
                    const on = habits.includes(h.key);
                    return (
                      <button
                        key={h.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleHabit(h.key)}
                        className={cx(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                          on
                            ? "border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-900/40 dark:text-brand-100"
                            : "border-line text-ink-soft hover:border-brand-300",
                        )}
                      >
                        {on && <IconCheck width={13} height={13} strokeWidth={3} />}
                        {m.welcome.habitNames[h.key]}
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
          <Back /> {m.common.back}
        </Button>
        <Button size="lg" onClick={() => onApply(profileId, habits)}>
          {m.welcome.apply} <Forward />
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <p className="text-sm text-ink-soft">{m.welcome.otherStyles}</p>
        <div className="flex flex-wrap gap-2">
          {ranked
            .filter((id) => id !== profileId)
            .map((id) => {
              const PIcon = ICONS[PROFILES[id].icon];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchTo(id)}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-brand-300 hover:text-ink"
                >
                  <PIcon width={16} height={16} />
                  {m.welcome.profiles[id].short}
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
  const { m, f, lang, setLang } = useI18n();
  usePageTitle(m.welcome.title);
  const state = useAppState();
  const actions = useActions();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const introHeading = useRef<HTMLHeadingElement>(null);

  const retake = state.settings.onboarded;
  const emptyWorkspace = state.tasks.length + state.habits.length + state.projects.length + state.sessions.length === 0;

  useEffect(() => {
    if (step === "intro") introHeading.current?.focus();
  }, [step]);

  const next = () =>
    setStep((s) =>
      s === "intro" ? "name" : s === "name" ? 0 : typeof s === "number" ? (s + 1 < QUESTIONS.length ? s + 1 : "result") : s,
    );
  const back = () =>
    setStep((s) =>
      s === "result" ? QUESTIONS.length - 1 : typeof s === "number" ? (s === 0 ? "name" : s - 1) : s === "name" ? "intro" : s,
    );

  function leave() {
    if (!retake) {
      actions.updateSettings({ onboarded: true });
      void requestPersistence();
    }
    navigate("/", { replace: true });
  }

  function apply(profileId: ProfileId, habits: HabitKey[]) {
    const plan = planSetup(
      state,
      buildSetup(profileId, answers),
      habits,
      { areas: m.welcome.areas, habits: m.welcome.habitNames },
      newId,
      Date.now(),
    );
    actions.applySetup(plan);
    void requestPersistence();
    const name = state.settings.name;
    toast.show({
      message: retake
        ? f(m.welcome.switchedToast, { style: m.welcome.profiles[profileId].name })
        : name
          ? f(m.welcome.welcomeToastName, { name })
          : m.welcome.welcomeToast,
      tone: "success",
    });
    navigate(PROFILES[profileId].home, { replace: true });
  }

  function loadSample() {
    actions.replaceData(sampleState(todayKey(), { ...state.settings, onboarded: true }, m.sample));
    void requestPersistence();
    navigate("/", { replace: true });
  }

  const progressIndex = step === "intro" ? 0 : step === "name" ? 1 : step === "result" ? TOTAL_STEPS + 1 : step + 2;
  const progress = progressIndex / (TOTAL_STEPS + 1);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-5 pt-5 sm:pt-7">
        <Logo size={28} />
        <div className="flex items-center gap-1">
          {/* Written in the language you'd switch to, so it's always readable. */}
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")} aria-label={m.shell.switchLanguage}>
            <span lang={lang === "ar" ? "en" : "ar"}>{lang === "ar" ? "English" : "العربية"}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={leave}>
            {retake ? m.common.cancel : step === "result" ? m.welcome.skipSetup : m.welcome.skip}
          </Button>
        </div>
      </header>

      <div className="mx-auto mt-4 w-full max-w-xl px-5" aria-hidden={step === "intro"}>
        <div
          className={cx("h-1 overflow-hidden rounded-full bg-surface-3 transition-opacity", step === "intro" && "opacity-0")}
          role="progressbar"
          aria-label={m.welcome.progress}
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
                  {retake ? m.welcome.retakeTitle : m.welcome.introTitle}
                </h1>
                <p className="max-w-md text-lg text-ink-soft">{retake ? m.welcome.retakeBody : m.welcome.introBody}</p>
              </div>
              <div className="flex flex-col items-start gap-4">
                <Button size="lg" onClick={next}>
                  {m.welcome.start} <Forward />
                </Button>
                {!retake && emptyWorkspace && (
                  <button type="button" onClick={loadSample} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                    {m.welcome.sample}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "name" && (
            <NameStep
              initial={state.settings.name}
              onBack={back}
              onNext={(name) => {
                // The account is saved as soon as it has a name — no sign-in.
                if (name !== state.settings.name) actions.updateSettings({ name });
                next();
              }}
            />
          )}

          {typeof step === "number" && (
            <QuestionStep question={QUESTIONS[step]} index={step} answers={answers} onAnswer={setAnswers} onBack={back} onNext={next} />
          )}

          {step === "result" && <ResultStep answers={answers} onBack={back} onApply={apply} />}
        </div>
      </main>
    </div>
  );
}
