import { useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useActions, useAppState } from "../lib/store/context";
import { looksLikeExport, normalizeState } from "../lib/store/normalize";
import { sampleState } from "../lib/store/sample";
import type { State } from "../lib/store/types";
import { formatDuration, todayKey } from "../lib/dates";
import { useTheme, type ThemePref } from "../lib/theme";
import { useToast } from "../lib/toast";
import { usePageTitle } from "../lib/usePageTitle";
import { PROFILES } from "../lib/onboarding";
import { Button, ButtonLink } from "../components/Button";
import { Card, PageHeader, Segmented } from "../components/ui";
import { Modal } from "../components/Modal";
import { IconDownload, IconMonitor, IconMoon, IconSparkle, IconSun, IconTrash, IconUpload } from "../components/icons";

const GOALS = [30, 60, 90, 120, 180, 240, 300, 360];
const LENGTHS = [15, 25, 30, 45, 50, 60, 90];

function Row({ title, description, control, htmlFor }: { title: string; description?: ReactNode; control: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-0.5">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="font-medium text-ink">
            {title}
          </label>
        ) : (
          <span className="font-medium text-ink">{title}</span>
        )}
        {description && <span className="text-sm text-ink-soft">{description}</span>}
      </div>
      <div className="shrink-0">{control}</div>
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

type Pending = { kind: "import"; state: State; summary: string } | { kind: "sample" } | { kind: "reset" } | null;

export function Settings() {
  usePageTitle("Settings");
  const state = useAppState();
  const { settings, tasks, habits, sessions, projects } = state;
  const actions = useActions();
  const toast = useToast();
  const { pref, setPref } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [pending, setPending] = useState<Pending>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const hasData = tasks.length + habits.length + sessions.length + projects.length > 0;

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
    toast.show({ message: "Backup downloaded", tone: "success" });
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.show({ message: "That file is too large to be a DayFlow backup." });
      return;
    }
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (!looksLikeExport(raw)) throw new Error("not an export");
      const next = normalizeState(raw);
      const summary = `${next.tasks.length} tasks, ${next.habits.length} habits, ${next.projects.length} projects and ${next.sessions.length} focus sessions`;
      setPending({ kind: "import", state: next, summary });
    } catch {
      toast.show({ message: "Couldn't read that file. Choose a DayFlow backup (.json)." });
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
    else toast.show({ message: "Notifications are blocked in your browser settings." });
  }

  function confirm() {
    if (!pending) return;
    if (pending.kind === "import") {
      actions.replaceData({ ...pending.state, activeFocus: null });
      toast.show({ message: "Backup restored", tone: "success" });
    } else if (pending.kind === "sample") {
      actions.replaceData(sampleState(todayKey(), settings));
      toast.show({ message: "Sample data loaded", tone: "success" });
    } else {
      actions.resetData();
      toast.show({ message: "All data deleted" });
    }
    setPending(null);
  }

  const confirmCopy = {
    import: { title: "Restore this backup?", cta: "Replace my data", danger: false },
    sample: { title: "Load sample data?", cta: "Load sample data", danger: false },
    reset: { title: "Delete all data?", cta: "Delete everything", danger: true },
  } as const;
  const copy = pending ? confirmCopy[pending.kind] : null;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader title="Settings" subtitle="DayFlow stores everything locally in this browser — no account needed." />

      <Section title="Your style">
        <Row
          title={settings.profile ? PROFILES[settings.profile].name : "Not set yet"}
          description={
            settings.profile
              ? PROFILES[settings.profile].tagline
              : "Answer four quick questions and DayFlow will set itself up the way you work."
          }
          control={
            <ButtonLink to="/welcome" variant="secondary" size="sm">
              {settings.profile ? "Retake quiz" : "Take the quiz"}
            </ButtonLink>
          }
        />
      </Section>

      <Section title="Appearance">
        <Row
          title="Theme"
          control={
            <Segmented<ThemePref>
              label="Theme"
              value={pref}
              onChange={setPref}
              options={[
                { value: "system", label: <><IconMonitor width={15} height={15} /> System</> },
                { value: "light", label: <><IconSun width={15} height={15} /> Light</> },
                { value: "dark", label: <><IconMoon width={15} height={15} /> Dark</> },
              ]}
            />
          }
        />
      </Section>

      <Section title="Planning">
        <Row
          title="Daily focus goal"
          description="Shown on Today, Focus and Insights."
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
          title="Default focus length"
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
          title="Week starts on"
          control={
            <Segmented<0 | 1>
              label="Week starts on"
              value={settings.weekStartsOn}
              onChange={(v) => actions.updateSettings({ weekStartsOn: v })}
              options={[
                { value: 1, label: "Monday" },
                { value: 0, label: "Sunday" },
              ]}
            />
          }
        />
        <Row
          title="Focus notifications"
          description={
            permission === "unsupported"
              ? "Your browser doesn't support notifications."
              : permission === "denied"
                ? "Blocked in your browser settings."
                : "Get a desktop notification when a session ends in a background tab."
          }
          control={
            <button
              type="button"
              role="switch"
              aria-checked={settings.notifications}
              aria-label="Focus notifications"
              disabled={permission === "unsupported" || (permission === "denied" && !settings.notifications)}
              onClick={toggleNotifications}
              className={`relative h-7 w-12 rounded-full border border-line transition-colors disabled:opacity-40 ${settings.notifications ? "bg-brand-500" : "bg-surface-3"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] ${settings.notifications ? "left-[1.4rem]" : "left-0.5"}`} />
            </button>
          }
        />
      </Section>

      <Section title="Your data">
        <Row
          title="Export backup"
          description="Download everything as a JSON file."
          control={
            <Button variant="secondary" size="sm" onClick={exportData}>
              <IconDownload width={16} height={16} /> Export
            </Button>
          }
        />
        <Row
          title="Restore from backup"
          description="Replaces your current data with a DayFlow export."
          control={
            <>
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <IconUpload width={16} height={16} /> Import
              </Button>
            </>
          }
        />
        <Row
          title="Sample data"
          description="Fill DayFlow with an example week to explore every feature."
          control={
            <Button variant="secondary" size="sm" onClick={() => (hasData ? setPending({ kind: "sample" }) : confirmSample())}>
              <IconSparkle width={16} height={16} /> Load sample
            </Button>
          }
        />
        <Row
          title="Delete all data"
          description="Permanently removes tasks, habits, projects and focus history from this browser."
          control={
            <Button variant="danger" size="sm" disabled={!hasData} onClick={() => setPending({ kind: "reset" })}>
              <IconTrash width={16} height={16} /> Delete all
            </Button>
          }
        />
      </Section>

      <Section title="Keyboard">
        <dl className="grid gap-x-6 gap-y-2 px-5 py-4 text-sm sm:grid-cols-[auto_1fr]">
          <dt><kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-xs">Alt</kbd> + <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-xs">↑ / ↓</kbd></dt>
          <dd className="text-ink-soft">Move a focused timeline block by 15 minutes</dd>
          <dt><kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-xs">Alt</kbd> + <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-xs">Shift</kbd> + <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-xs">↑ / ↓</kbd></dt>
          <dd className="text-ink-soft">Shorten or lengthen a focused timeline block</dd>
          <dt><kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-xs">Esc</kbd></dt>
          <dd className="text-ink-soft">Close any dialog</dd>
        </dl>
      </Section>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={copy?.title ?? ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant={copy?.danger ? "danger" : "primary"} onClick={confirm} data-autofocus>
              {copy?.cta}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          {pending?.kind === "import" && <>This backup contains {pending.summary}. It will replace everything currently in DayFlow. Consider exporting a backup first.</>}
          {pending?.kind === "sample" && "Sample data replaces your current tasks, habits, projects and focus history. Export a backup first if you want to keep them."}
          {pending?.kind === "reset" && "This permanently removes all tasks, habits, projects and focus history from this browser. It can't be undone — export a backup first if you might want it back."}
        </p>
      </Modal>
    </div>
  );

  function confirmSample() {
    actions.replaceData(sampleState(todayKey(), settings));
    toast.show({ message: "Sample data loaded", tone: "success" });
  }
}
