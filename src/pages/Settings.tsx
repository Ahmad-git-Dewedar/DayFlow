import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useActions, useAppState } from "../lib/store/context";
import { looksLikeExport, normalizeState } from "../lib/store/normalize";
import { sampleState } from "../lib/store/sample";
import type { State } from "../lib/store/types";
import { formatDuration, todayKey } from "../lib/dates";
import { useTheme, type ThemePref } from "../lib/theme";
import { useToast } from "../lib/toast";
import { usePageTitle } from "../lib/usePageTitle";
import { isPersisted, requestPersistence } from "../lib/persist";
import { useI18n } from "../i18n/context";
import type { Lang } from "../i18n/core";
import { Button, ButtonLink } from "../components/Button";
import { Card, PageHeader, Segmented } from "../components/ui";
import { Modal } from "../components/Modal";
import { IconDownload, IconMonitor, IconMoon, IconShield, IconSparkle, IconSun, IconTrash, IconUpload } from "../components/icons";

const GOALS = [30, 60, 90, 120, 180, 240, 300, 360];
const LENGTHS = [15, 25, 30, 45, 50, 60, 90];

function Row({ title, description, control, htmlFor }: { title: ReactNode; description?: ReactNode; control?: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="font-medium text-ink">
            {title}
          </label>
        ) : (
          <span className="font-medium text-ink">{title}</span>
        )}
        {description && <span className="text-sm text-ink-soft">{description}</span>}
      </div>
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
      <Card>{children}</Card>
    </section>
  );
}

/** Edits the account name locally and saves on blur or Enter (not on every keystroke). */
function NameField({ id }: { id: string }) {
  const { settings } = useAppState();
  const actions = useActions();
  const { m } = useI18n();
  const [draft, setDraft] = useState(settings.name);
  useEffect(() => setDraft(settings.name), [settings.name]);
  const save = () => {
    const next = draft.trim().slice(0, 60);
    if (next !== settings.name) actions.updateSettings({ name: next });
  };
  return (
    <input
      id={id}
      className="field w-full sm:w-56"
      value={draft}
      maxLength={60}
      autoComplete="given-name"
      placeholder={m.settings.namePlaceholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

type Pending = { kind: "import"; state: State } | { kind: "sample" } | { kind: "reset" } | null;

export function Settings() {
  const { m, f, lang, setLang } = useI18n();
  usePageTitle(m.settings.title);
  const state = useAppState();
  const { settings, tasks, habits, sessions, projects } = state;
  const actions = useActions();
  const toast = useToast();
  const { pref, setPref } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [pending, setPending] = useState<Pending>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const hasData = tasks.length + habits.length + sessions.length + projects.length > 0;
  const profile = settings.profile ? m.welcome.profiles[settings.profile] : null;

  useEffect(() => {
    let alive = true;
    // Ask once more here (harmless if already granted), then show the real status.
    requestPersistence().then(() => isPersisted()).then((p) => alive && setPersisted(p));
    return () => {
      alive = false;
    };
  }, []);

  function exportData() {
    const blob = new Blob([JSON.stringify({ app: "DayFlow", exportedAt: new Date().toISOString(), ...state }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dayflow-backup-${todayKey()}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.show({ message: m.settings.exported, tone: "success" });
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.show({ message: m.settings.importTooLarge });
      return;
    }
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (!looksLikeExport(raw)) throw new Error("not an export");
      setPending({ kind: "import", state: normalizeState(raw) });
    } catch {
      toast.show({ message: m.settings.importInvalid });
    }
  }

  async function toggleNotifications() {
    if (settings.notifications) {
      actions.updateSettings({ notifications: false });
      return;
    }
    if (permission === "unsupported") return;
    const result = permission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") actions.updateSettings({ notifications: true });
    else toast.show({ message: m.settings.notificationsBlockedToast });
  }

  function loadSample() {
    actions.replaceData(sampleState(todayKey(), settings, m.sample));
    toast.show({ message: m.settings.sampleLoaded, tone: "success" });
  }

  function confirm() {
    if (!pending) return;
    if (pending.kind === "import") {
      // A restored account is never sent back through the welcome quiz.
      actions.replaceData({ ...pending.state, activeFocus: null, settings: { ...pending.state.settings, onboarded: true } });
      toast.show({ message: m.settings.restored, tone: "success" });
    } else if (pending.kind === "sample") {
      loadSample();
    } else {
      actions.resetData();
      toast.show({ message: m.settings.resetDone });
    }
    setPending(null);
  }

  const copy =
    pending?.kind === "import"
      ? {
          title: m.settings.confirmImportTitle,
          cta: m.settings.confirmImportCta,
          body: f(m.settings.confirmImportBody, {
            summary: f(m.settings.importSummary, {
              tasks: pending.state.tasks.length,
              habits: pending.state.habits.length,
              projects: pending.state.projects.length,
              sessions: pending.state.sessions.length,
            }),
          }),
          danger: false,
        }
      : pending?.kind === "sample"
        ? { title: m.settings.confirmSampleTitle, cta: m.settings.confirmSampleCta, body: m.settings.confirmSampleBody, danger: false }
        : pending?.kind === "reset"
          ? { title: m.settings.confirmResetTitle, cta: m.settings.confirmResetCta, body: m.settings.confirmResetBody, danger: true }
          : null;

  const kbd = "rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-xs";

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader title={m.settings.title} subtitle={m.settings.subtitle} />

      <Section title={m.settings.account}>
        <Row title={m.settings.name} description={m.settings.nameHint} htmlFor={`${id}-name`} control={<NameField id={`${id}-name`} />} />
        <Row
          title={m.settings.language}
          control={
            <Segmented<Lang>
              label={m.settings.language}
              value={lang}
              onChange={setLang}
              options={[
                { value: "en", label: <span lang="en">English</span> },
                { value: "ar", label: <span lang="ar">العربية</span> },
              ]}
            />
          }
        />
        <Row
          title={
            <span className="inline-flex items-center gap-2">
              <IconShield width={17} height={17} className="text-brand-600 dark:text-brand-400" />
              {m.settings.storage}
            </span>
          }
          description={persisted === null ? "…" : persisted ? m.settings.storageProtected : m.settings.storageBestEffort}
        />
        <Row
          title={
            <>
              <span className="block text-sm font-normal text-ink-soft">{m.settings.style}</span>
              {profile ? profile.name : m.settings.styleNotSet}
            </>
          }
          description={profile ? profile.tagline : m.settings.styleNotSetBody}
          control={
            <ButtonLink to="/welcome?retake=1" variant="secondary" size="sm">
              {profile ? m.settings.retake : m.settings.takeQuiz}
            </ButtonLink>
          }
        />
      </Section>

      <Section title={m.settings.appearance}>
        <Row
          title={m.settings.theme}
          control={
            <Segmented<ThemePref>
              label={m.settings.theme}
              value={pref}
              onChange={setPref}
              options={[
                { value: "system", label: <><IconMonitor width={15} height={15} /> {m.settings.system}</> },
                { value: "light", label: <><IconSun width={15} height={15} /> {m.settings.light}</> },
                { value: "dark", label: <><IconMoon width={15} height={15} /> {m.settings.dark}</> },
              ]}
            />
          }
        />
      </Section>

      <Section title={m.settings.planning}>
        <Row
          title={m.settings.goal}
          description={m.settings.goalHint}
          htmlFor={`${id}-goal`}
          control={
            <select id={`${id}-goal`} className="field w-36" value={settings.dailyFocusGoal} onChange={(e) => actions.updateSettings({ dailyFocusGoal: Number(e.target.value) })}>
              {[...new Set([...GOALS, settings.dailyFocusGoal])].sort((a, b) => a - b).map((g) => (
                <option key={g} value={g}>
                  {formatDuration(g)}
                </option>
              ))}
            </select>
          }
        />
        <Row
          title={m.settings.defaultLength}
          htmlFor={`${id}-len`}
          control={
            <select id={`${id}-len`} className="field w-36" value={settings.focusLength} onChange={(e) => actions.updateSettings({ focusLength: Number(e.target.value) })}>
              {[...new Set([...LENGTHS, settings.focusLength])].sort((a, b) => a - b).map((l) => (
                <option key={l} value={l}>
                  {formatDuration(l)}
                </option>
              ))}
            </select>
          }
        />
        <Row
          title={m.settings.weekStart}
          control={
            <Segmented<0 | 1>
              label={m.settings.weekStart}
              value={settings.weekStartsOn}
              onChange={(v) => actions.updateSettings({ weekStartsOn: v })}
              options={[
                { value: 1, label: m.settings.monday },
                { value: 0, label: m.settings.sunday },
              ]}
            />
          }
        />
        <Row
          title={m.settings.notifications}
          description={
            permission === "unsupported"
              ? m.settings.notificationsUnsupported
              : permission === "denied"
                ? m.settings.notificationsDenied
                : m.settings.notificationsHint
          }
          control={
            <button
              type="button"
              role="switch"
              aria-checked={settings.notifications}
              aria-label={m.settings.notifications}
              disabled={permission === "unsupported" || (permission === "denied" && !settings.notifications)}
              onClick={toggleNotifications}
              className={`relative h-7 w-12 rounded-full border border-line transition-colors disabled:opacity-40 ${settings.notifications ? "bg-brand-500" : "bg-surface-3"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[inset-inline-start] ${settings.notifications ? "start-[1.4rem]" : "start-0.5"}`}
              />
            </button>
          }
        />
      </Section>

      <Section title={m.settings.data}>
        <Row
          title={m.settings.export}
          description={m.settings.exportHint}
          control={
            <Button variant="secondary" size="sm" onClick={exportData}>
              <IconDownload width={16} height={16} /> {m.settings.exportButton}
            </Button>
          }
        />
        <Row
          title={m.settings.import}
          description={m.settings.importHint}
          control={
            <>
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <IconUpload width={16} height={16} /> {m.settings.importButton}
              </Button>
            </>
          }
        />
        <Row
          title={m.settings.sample}
          description={m.settings.sampleHint}
          control={
            <Button variant="secondary" size="sm" onClick={() => (hasData ? setPending({ kind: "sample" }) : loadSample())}>
              <IconSparkle width={16} height={16} /> {m.settings.sampleButton}
            </Button>
          }
        />
        <Row
          title={m.settings.reset}
          description={m.settings.resetHint}
          control={
            <Button variant="danger" size="sm" disabled={!hasData} onClick={() => setPending({ kind: "reset" })}>
              <IconTrash width={16} height={16} /> {m.settings.resetButton}
            </Button>
          }
        />
      </Section>

      <Section title={m.settings.keyboard}>
        <dl className="grid gap-x-6 gap-y-2 px-5 py-4 text-sm sm:grid-cols-[auto_1fr]">
          <dt dir="ltr" className="justify-self-start">
            <kbd className={kbd}>Alt</kbd> + <kbd className={kbd}>↑ / ↓</kbd>
          </dt>
          <dd className="text-ink-soft">{m.settings.kbMove}</dd>
          <dt dir="ltr" className="justify-self-start">
            <kbd className={kbd}>Alt</kbd> + <kbd className={kbd}>Shift</kbd> + <kbd className={kbd}>↑ / ↓</kbd>
          </dt>
          <dd className="text-ink-soft">{m.settings.kbResize}</dd>
          <dt dir="ltr" className="justify-self-start">
            <kbd className={kbd}>Esc</kbd>
          </dt>
          <dd className="text-ink-soft">{m.settings.kbClose}</dd>
        </dl>
      </Section>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={copy?.title ?? ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              {m.common.cancel}
            </Button>
            <Button variant={copy?.danger ? "danger" : "primary"} onClick={confirm} data-autofocus>
              {copy?.cta}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">{copy?.body}</p>
      </Modal>
    </div>
  );
}
