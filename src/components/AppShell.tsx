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
} from "./icons";
import { useAppState } from "../lib/store/context";
import { useFocusClock } from "../lib/useFocusClock";
import { formatClock, todayKey } from "../lib/dates";
import { useTheme, type ThemePref } from "../lib/theme";
import { cx } from "../lib/utils";

type NavItem = { to: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

const NAV: NavItem[] = [
  { to: "/", label: "Today", icon: IconCalendar },
  { to: "/tasks", label: "Tasks", icon: IconListChecks },
  { to: "/habits", label: "Habits", icon: IconRepeat },
  { to: "/focus", label: "Focus", icon: IconFocus },
  { to: "/insights", label: "Insights", icon: IconChart },
];

const THEME_ORDER: ThemePref[] = ["system", "light", "dark"];
const THEME_META: Record<ThemePref, { label: string; icon: ReactNode }> = {
  system: { label: "System theme", icon: <IconMonitor width={18} height={18} /> },
  light: { label: "Light theme", icon: <IconSun width={18} height={18} /> },
  dark: { label: "Dark theme", icon: <IconMoon width={18} height={18} /> },
};

function ThemeButton() {
  const { pref, setPref } = useTheme();
  const next = THEME_ORDER[(THEME_ORDER.indexOf(pref) + 1) % THEME_ORDER.length];
  return (
    <IconButton label={`${THEME_META[pref].label} — switch to ${THEME_META[next].label.toLowerCase()}`} onClick={() => setPref(next)}>
      {THEME_META[pref].icon}
    </IconButton>
  );
}

/** Small live timer pill shown wherever you are while a focus session runs. */
function FocusPill({ className }: { className?: string }) {
  const { activeFocus } = useAppState();
  const clock = useFocusClock(activeFocus);
  const { pathname } = useLocation();
  if (!activeFocus || !clock || pathname === "/focus") return null;
  return (
    <Link
      to="/focus"
      className={cx(
        "inline-flex items-center gap-2 rounded-full bg-brand-500 py-1.5 pl-2.5 pr-3.5 text-sm font-semibold text-white tabular-nums shadow-[var(--shadow-soft)] hover:bg-brand-600",
        className,
      )}
      aria-label={`Focus timer: ${formatClock(clock.remainingMs / 1000)} left${clock.running ? "" : ", paused"}`}
    >
      {clock.running ? <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> : <IconPause width={12} height={12} />}
      {formatClock(clock.remainingMs / 1000)}
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
  const { todayOpen, inbox, overdue } = useCounts();
  const navigate = useNavigate();
  const location = useLocation();
  const [projectOpen, setProjectOpen] = useState(false);
  const activeProject = new URLSearchParams(location.search).get("project");

  const openByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) if (!t.done && t.projectId) m.set(t.projectId, (m.get(t.projectId) ?? 0) + 1);
    return m;
  }, [tasks]);

  const badge = (to: string) => {
    if (to === "/") return todayOpen || null;
    if (to === "/tasks") return inbox + overdue || null;
    return null;
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface-2 md:flex">
      <div className="flex h-16 items-center px-5">
        <Link to="/" aria-label="DayFlow — Today" className="rounded-md">
          <Logo size={28} />
        </Link>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-0.5 px-3">
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
                <span className="flex-1">{item.label}</span>
                {badge(item.to) !== null && <span className="text-xs tabular-nums text-muted">{badge(item.to)}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col px-3">
        <div className="flex items-center justify-between px-3 pb-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Projects</h2>
          <IconButton label="New project" size="sm" onClick={() => setProjectOpen(true)} className="-mr-2">
            <IconPlus width={16} height={16} />
          </IconButton>
        </div>
        <ul className="flex min-h-0 flex-col gap-0.5 overflow-y-auto pb-2">
          {projects.length === 0 && (
            <li>
              <button
                type="button"
                onClick={() => setProjectOpen(true)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-3 hover:text-ink"
              >
                Group tasks into projects…
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

      <div className="flex flex-col gap-3 border-t border-line p-3">
        <FocusPill className="self-start" />
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
            Settings
          </NavLink>
          <ThemeButton />
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
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-surface/95 px-4 backdrop-blur-sm md:hidden">
      <Link to="/" aria-label="DayFlow — Today" className="rounded-md">
        <Logo size={26} />
      </Link>
      <div className="flex items-center gap-1">
        <FocusPill className="mr-1" />
        <ThemeButton />
        <NavLink
          to="/settings"
          aria-label="Settings"
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
  return (
    <nav
      aria-label="Main"
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
              {item.label}
              {item.to === "/" && todayOpen > 0 && (
                <span className="absolute right-[calc(50%-1.25rem)] top-1 min-w-4 rounded-full bg-brand-500 px-1 text-center text-[0.6rem] leading-4 text-white">
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
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
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
