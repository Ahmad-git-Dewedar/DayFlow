import { useMemo, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { IconButton } from "./Button";
import { ProjectEditor } from "./ProjectEditor";
import { FocusWatcher } from "./FocusWatcher";
import { ProjectDot } from "./ui";
import {
  IconCalendar,
  IconChart,
  IconFocus,
  IconListChecks,
  IconMonitor,
  IconMoon,
  IconPause,
  IconPlus,
  IconRepeat,
  IconSettings,
  IconSun,
  IconUser,
} from "./icons";
import { useAppState } from "../lib/store/context";
import { useFocusClock } from "../lib/useFocusClock";
import { formatClock, todayKey } from "../lib/dates";
import { useTheme, type ThemePref } from "../lib/theme";
import { useI18n } from "../i18n/context";
import type { Messages } from "../i18n/en";
import { cx } from "../lib/utils";

type NavKey = "today" | "tasks" | "habits" | "focus" | "insights";
type NavItem = { to: string; key: NavKey; icon: ComponentType<SVGProps<SVGSVGElement>> };

const NAV: NavItem[] = [
  { to: "/", key: "today", icon: IconCalendar },
  { to: "/tasks", key: "tasks", icon: IconListChecks },
  { to: "/habits", key: "habits", icon: IconRepeat },
  { to: "/focus", key: "focus", icon: IconFocus },
  { to: "/insights", key: "insights", icon: IconChart },
];

const THEME_ORDER: ThemePref[] = ["system", "light", "dark"];
const THEME_ICON: Record<ThemePref, ReactNode> = {
  system: <IconMonitor width={18} height={18} />,
  light: <IconSun width={18} height={18} />,
  dark: <IconMoon width={18} height={18} />,
};
const themeLabel = (m: Messages, p: ThemePref) =>
  p === "system" ? m.shell.themeSystem : p === "light" ? m.shell.themeLight : m.shell.themeDark;

function ThemeButton() {
  const { pref, setPref } = useTheme();
  const { m, f } = useI18n();
  const next = THEME_ORDER[(THEME_ORDER.indexOf(pref) + 1) % THEME_ORDER.length];
  return (
    <IconButton label={f(m.shell.themeSwitch, { current: themeLabel(m, pref), next: themeLabel(m, next) })} onClick={() => setPref(next)}>
      {THEME_ICON[pref]}
    </IconButton>
  );
}

/** One-tap switch between English and Arabic, shown next to the theme button. */
function LanguageButton() {
  const { lang, m, setLang } = useI18n();
  return (
    <IconButton label={m.shell.switchLanguage} onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
      {/* The label is written in the language you'd switch to. */}
      <span className="text-[0.8rem] font-semibold leading-none" lang={lang === "ar" ? "en" : "ar"}>
        {m.shell.languageShort}
      </span>
    </IconButton>
  );
}

/** Small live timer pill shown wherever you are while a focus session runs. */
function FocusPill({ className }: { className?: string }) {
  const { activeFocus } = useAppState();
  const { m, f } = useI18n();
  const clock = useFocusClock(activeFocus);
  const { pathname } = useLocation();
  if (!activeFocus || !clock || pathname === "/focus") return null;
  const time = formatClock(clock.remainingMs / 1000);
  return (
    <Link
      to="/focus"
      className={cx(
        "inline-flex items-center gap-2 rounded-full bg-brand-500 py-1.5 ps-2.5 pe-3.5 text-sm font-semibold text-white tabular-nums shadow-[var(--shadow-soft)] hover:bg-brand-600",
        className,
      )}
      aria-label={f(clock.running ? m.shell.focusTimer : m.shell.focusTimerPaused, { time })}
    >
      {clock.running ? <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> : <IconPause width={12} height={12} />}
      <span dir="ltr">{time}</span>
    </Link>
  );
}

/** The local account: name + "saved on this device". No sign-in. */
function AccountChip() {
  const { settings } = useAppState();
  const { m } = useI18n();
  const name = settings.name.trim();
  const initial = name ? Array.from(name)[0].toUpperCase() : null;
  return (
    <Link
      to="/settings"
      className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-3"
    >
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white dark:bg-brand-400 dark:text-brand-950"
      >
        {initial ?? <IconUser width={17} height={17} />}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-ink">{name || m.shell.yourSpace}</span>
        <span className="truncate text-xs text-muted">{m.shell.savedOnDevice}</span>
      </span>
    </Link>
  );
}

function useCounts() {
  const { tasks } = useAppState();
  return useMemo(() => {
    const today = todayKey();
    let todayOpen = 0;
    let inbox = 0;
    let overdue = 0;
    for (const t of tasks) {
      if (t.done) continue;
      if (t.date === today) todayOpen++;
      else if (t.date === null) inbox++;
      else if (t.date < today) overdue++;
    }
    return { todayOpen, inbox, overdue };
  }, [tasks]);
}

function Sidebar() {
  const { projects, tasks } = useAppState();
  const { m } = useI18n();
  const { todayOpen, inbox, overdue } = useCounts();
  const navigate = useNavigate();
  const location = useLocation();
  const [projectOpen, setProjectOpen] = useState(false);
  const activeProject = new URLSearchParams(location.search).get("project");

  const openByProject = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks) if (!t.done && t.projectId) counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1);
    return counts;
  }, [tasks]);

  const badge = (to: string) => {
    if (to === "/") return todayOpen || null;
    if (to === "/tasks") return inbox + overdue || null;
    return null;
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-surface-2 md:flex">
      <div className="flex h-16 items-center px-5">
        <Link to="/" aria-label={m.nav.homeLink} className="rounded-md">
          <Logo size={28} />
        </Link>
      </div>

      <nav aria-label={m.nav.main} className="flex flex-col gap-0.5 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[0.94rem] font-medium transition-colors",
                isActive && !(item.to === "/tasks" && activeProject)
                  ? "bg-surface text-ink shadow-[var(--shadow-soft)]"
                  : "text-ink-soft hover:bg-surface-3 hover:text-ink",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  width={19}
                  height={19}
                  className={isActive && !(item.to === "/tasks" && activeProject) ? "text-brand-500 dark:text-brand-400" : undefined}
                />
                <span className="flex-1">{m.nav[item.key]}</span>
                {badge(item.to) !== null && <span className="text-xs tabular-nums text-muted">{badge(item.to)}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col px-3">
        <div className="flex items-center justify-between px-3 pb-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{m.shell.projects}</h2>
          <IconButton label={m.shell.newProject} size="sm" onClick={() => setProjectOpen(true)} className="-me-2">
            <IconPlus width={16} height={16} />
          </IconButton>
        </div>
        <ul className="flex min-h-0 flex-col gap-0.5 overflow-y-auto pb-2">
          {projects.length === 0 && (
            <li>
              <button
                type="button"
                onClick={() => setProjectOpen(true)}
                className="w-full rounded-lg px-3 py-2 text-start text-sm text-muted hover:bg-surface-3 hover:text-ink"
              >
                {m.shell.groupHint}
              </button>
            </li>
          )}
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                to={`/tasks?project=${p.id}`}
                aria-current={activeProject === p.id ? "page" : undefined}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[0.92rem] transition-colors",
                  activeProject === p.id
                    ? "bg-surface font-medium text-ink shadow-[var(--shadow-soft)]"
                    : "text-ink-soft hover:bg-surface-3 hover:text-ink",
                )}
              >
                <ProjectDot color={p.color} />
                <span className="flex-1 truncate">{p.name}</span>
                {openByProject.get(p.id) ? <span className="text-xs tabular-nums text-muted">{openByProject.get(p.id)}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t border-line p-3">
        <FocusPill className="self-start" />
        <AccountChip />
        <div className="flex items-center justify-between">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[0.94rem] font-medium transition-colors",
                isActive ? "bg-surface text-ink shadow-[var(--shadow-soft)]" : "text-ink-soft hover:bg-surface-3 hover:text-ink",
              )
            }
          >
            <IconSettings width={19} height={19} />
            {m.nav.settings}
          </NavLink>
          <div className="flex items-center">
            <LanguageButton />
            <ThemeButton />
          </div>
        </div>
      </div>

      <ProjectEditor
        open={projectOpen}
        onClose={() => setProjectOpen(false)}
        onCreated={(p) => navigate(`/tasks?project=${p.id}`)}
      />
    </aside>
  );
}

function MobileTopBar() {
  const { m } = useI18n();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-surface/95 px-4 backdrop-blur-sm md:hidden">
      <Link to="/" aria-label={m.nav.homeLink} className="rounded-md">
        <Logo size={26} />
      </Link>
      <div className="flex items-center gap-1">
        <FocusPill className="me-1" />
        <LanguageButton />
        <ThemeButton />
        <NavLink
          to="/settings"
          aria-label={m.nav.settings}
          className={({ isActive }) =>
            cx(
              "inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-3",
              isActive ? "bg-surface-3 text-ink" : "text-ink-soft",
            )
          }
        >
          <IconSettings width={19} height={19} />
        </NavLink>
      </div>
    </header>
  );
}

function MobileTabBar() {
  const { todayOpen } = useCounts();
  const { m } = useI18n();
  return (
    <nav
      aria-label={m.nav.main}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cx(
                  "relative flex flex-col items-center gap-1 py-2 text-[0.7rem] font-medium transition-colors",
                  isActive ? "text-brand-600 dark:text-brand-400" : "text-muted hover:text-ink",
                )
              }
            >
              <item.icon width={22} height={22} />
              {m.nav[item.key]}
              {item.to === "/" && todayOpen > 0 && (
                <span className="absolute end-[calc(50%-1.25rem)] top-1 min-w-4 rounded-full bg-brand-500 px-1 text-center text-[0.6rem] leading-4 text-white">
                  {todayOpen}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { m } = useI18n();
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white"
      >
        {m.common.skipToContent}
      </a>
      <FocusWatcher />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-12 md:pt-8">
          {children}
        </main>
        <MobileTabBar />
      </div>
    </div>
  );
}
