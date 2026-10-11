import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useActions, useAppState } from "../lib/store/context";
import type { Project, Task } from "../lib/store/types";
import { formatWeekday, relativeDayLabel, todayKey } from "../lib/dates";
import { compareTasks } from "../lib/stats";
import { usePageTitle } from "../lib/usePageTitle";
import { useDeleteTask } from "../lib/useDeleteTask";
import { Button, IconButton } from "../components/Button";
import { Card, EmptyState, PageHeader, ProjectDot } from "../components/ui";
import { QuickAdd } from "../components/QuickAdd";
import { TaskItem } from "../components/TaskItem";
import { TaskEditor } from "../components/TaskEditor";
import { ProjectEditor } from "../components/ProjectEditor";
import { IconChevronRight, IconEdit, IconInbox, IconListChecks, IconPlus } from "../components/icons";
import { cx } from "../lib/utils";
import { useI18n } from "../i18n/context";

function Section({
  title,
  count,
  tone,
  children,
  collapsible,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  tone?: "danger";
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const heading = (
    <span className={cx("text-xs font-semibold uppercase tracking-wider", tone === "danger" ? "text-[#e5484d]" : "text-muted")}>
      {title} <span className="font-normal tabular-nums">· {count}</span>
    </span>
  );
  if (collapsible) {
    return (
      <details open={defaultOpen} className="group/sec">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 pb-1 pt-3 hover:text-ink [&::-webkit-details-marker]:hidden">
          <IconChevronRight width={14} height={14} className="text-muted transition-transform rtl:-scale-x-100 ltr:group-open/sec:rotate-90 rtl:group-open/sec:-rotate-90" />
          {heading}
        </summary>
        <ul className="flex flex-col px-2">{children}</ul>
      </details>
    );
  }
  return (
    <section>
      <h2 className="px-5 pb-1 pt-3">{heading}</h2>
      <ul className="flex flex-col px-2">{children}</ul>
    </section>
  );
}

function ProjectChips({ activeId, onNew }: { activeId: string | null; onNew: () => void }) {
  const { projects } = useAppState();
  const [, setParams] = useSearchParams();
  const { m } = useI18n();
  const chip = (selected: boolean) =>
    cx(
      "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
      selected ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200" : "border-line text-ink-soft hover:border-brand-300",
    );
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:hidden" role="group" aria-label={m.tasks.filter}>
      <button type="button" className={chip(activeId === null)} aria-pressed={activeId === null} onClick={() => setParams({})}>
        {m.tasks.all}
      </button>
      {projects.map((p) => (
        <button key={p.id} type="button" className={chip(activeId === p.id)} aria-pressed={activeId === p.id} onClick={() => setParams({ project: p.id })}>
          <ProjectDot color={p.color} className="h-2 w-2" /> {p.name}
        </button>
      ))}
      <button type="button" className={chip(false)} onClick={onNew}>
        <IconPlus width={15} height={15} /> {m.tasks.projectChip}
      </button>
    </div>
  );
}

export function Tasks() {
  const { tasks, projects } = useAppState();
  const actions = useActions();
  const deleteTask = useDeleteTask();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [projectEditor, setProjectEditor] = useState<{ project: Project | null } | null>(null);
  const { m, f } = useI18n();

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const projectId = params.get("project");
  const project = projectId ? projectMap.get(projectId) ?? null : null;
  usePageTitle(project ? project.name : m.tasks.title);

  const today = todayKey();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = tasks.filter(
      (t) =>
        (!project || t.projectId === project.id) &&
        (!q || t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q)),
    );
    const overdue: Task[] = [];
    const inbox: Task[] = [];
    const todays: Task[] = [];
    const upcoming = new Map<string, Task[]>();
    const completed: Task[] = [];
    for (const t of filtered) {
      if (t.done) completed.push(t);
      else if (t.date === null) inbox.push(t);
      else if (t.date < today) overdue.push(t);
      else if (t.date === today) todays.push(t);
      else upcoming.set(t.date, [...(upcoming.get(t.date) ?? []), t]);
    }
    const byDateThen = (a: Task, b: Task) => (a.date ?? "").localeCompare(b.date ?? "") || compareTasks(a, b);
    return {
      overdue: overdue.sort(byDateThen),
      inbox: inbox.sort((a, b) => b.createdAt - a.createdAt),
      today: todays.sort(compareTasks),
      upcoming: [...upcoming.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, ts]) => [d, ts.sort(compareTasks)] as const),
      completed: completed.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).slice(0, 50),
      completedTotal: completed.length,
      total: filtered.length,
    };
  }, [tasks, project, query, today]);

  const listProps = { onToggle: actions.toggleTask, onEdit: setEditing, onDelete: deleteTask };
  const item = (t: Task, showDate = false) => (
    <TaskItem key={t.id} task={t} project={!project && t.projectId ? projectMap.get(t.projectId) : undefined} showDate={showDate} {...listProps} />
  );
  const openCount = groups.total - groups.completedTotal;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          project ? (
            <span className="inline-flex items-center gap-3">
              <ProjectDot color={project.color} className="h-3.5 w-3.5" />
              {project.name}
            </span>
          ) : (
            m.tasks.title
          )
        }
        subtitle={f(m.tasks.open, { n: openCount }) + (groups.completedTotal ? f(m.tasks.completedSuffix, { n: groups.completedTotal }) : "")}
        actions={
          project ? (
            <IconButton label={f(m.tasks.editProject, { name: project.name })} onClick={() => setProjectEditor({ project })}>
              <IconEdit />
            </IconButton>
          ) : undefined
        }
      />

      <ProjectChips activeId={project?.id ?? null} onNew={() => setProjectEditor({ project: null })} />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <QuickAdd date={null} projectId={project?.id ?? null} placeholder={project ? f(m.tasks.addProject, { name: project.name }) : m.tasks.addInbox} />
        <input
          type="search"
          className="field h-11"
          placeholder={m.tasks.search}
          aria-label={m.tasks.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Card>
        {groups.total === 0 ? (
          query ? (
            <EmptyState icon={<IconListChecks width={22} height={22} />} title={f(m.tasks.noMatch, { q: query })} action={<Button variant="secondary" size="sm" onClick={() => setQuery("")}>{m.tasks.clearSearch}</Button>} />
          ) : (
            <EmptyState icon={<IconInbox width={22} height={22} />} title={project ? f(m.tasks.emptyProject, { name: project.name }) : m.tasks.empty}>
              {m.tasks.emptyBody}
            </EmptyState>
          )
        ) : (
          <div className="flex flex-col pb-3">
            {groups.overdue.length > 0 && (
              <Section title={m.tasks.overdue} count={groups.overdue.length} tone="danger">
                {groups.overdue.map((t) => item(t, true))}
              </Section>
            )}
            {groups.inbox.length > 0 && (
              <Section title={m.tasks.inbox} count={groups.inbox.length}>
                {groups.inbox.map((t) => item(t))}
              </Section>
            )}
            {groups.today.length > 0 && (
              <Section title={m.tasks.today} count={groups.today.length}>
                {groups.today.map((t) => item(t))}
              </Section>
            )}
            {groups.upcoming.map(([day, ts]) => (
              <Section key={day} title={`${relativeDayLabel(day, today)} · ${formatWeekday(day)}`} count={ts.length}>
                {ts.map((t) => item(t))}
              </Section>
            ))}
            {groups.completed.length > 0 && (
              <Section title={m.tasks.completed} count={groups.completedTotal} collapsible defaultOpen={openCount === 0}>
                {groups.completed.map((t) => item(t, true))}
                {groups.completedTotal > groups.completed.length && (
                  <li className="px-3 py-2 text-xs text-muted">{m.tasks.recentOnly}</li>
                )}
              </Section>
            )}
          </div>
        )}
      </Card>

      <TaskEditor open={editing !== null} onClose={() => setEditing(null)} task={editing} />
      <ProjectEditor
        open={projectEditor !== null}
        onClose={() => setProjectEditor(null)}
        project={projectEditor?.project}
        onCreated={(p) => navigate(`/tasks?project=${p.id}`)}
        onDeleted={() => navigate("/tasks")}
      />
    </div>
  );
}
