import { useId, useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Field } from "./ui";
import { IconCheck } from "./icons";
import { useActions, useAppState } from "../lib/store/context";
import { PROJECT_COLORS, type Project, type ProjectColor } from "../lib/store/types";
import { projectDot } from "../lib/projectColors";
import { useI18n } from "../i18n/context";
import { useToast } from "../lib/toast";
import { cx } from "../lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  onCreated?: (p: Project) => void;
  onDeleted?: () => void;
};

function ProjectForm({ project, onClose, onCreated, onDeleted }: Omit<Props, "open">) {
  const { projects, tasks } = useAppState();
  const actions = useActions();
  const toast = useToast();
  const { m, f, p } = useI18n();
  const formId = useId();
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState<ProjectColor>(
    project?.color ?? PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const taskCount = project ? tasks.filter((t) => t.projectId === project.id).length : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError(m.project.nameError);
    const clash = projects.some((p) => p.id !== project?.id && p.name.toLowerCase() === trimmed.toLowerCase());
    if (clash) return setError(m.project.clash);
    if (project) actions.updateProject(project.id, { name: trimmed, color });
    else onCreated?.(actions.addProject(trimmed, color));
    onClose();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label={m.project.name} htmlFor={`${formId}-name`} error={error ?? undefined}>
        <input
          id={`${formId}-name`}
          className="field"
          data-autofocus
          maxLength={60}
          value={name}
          placeholder={m.project.placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${formId}-name-error` : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">{m.project.color}</legend>
        <div className="flex flex-wrap gap-2.5">
          {PROJECT_COLORS.map((c) => (
            <label key={c} className="relative cursor-pointer" title={m.project.colors[c]}>
              <input
                type="radio"
                name={`${formId}-color`}
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
                className="peer sr-only"
                aria-label={m.project.colors[c]}
              />
              <span
                className={cx(
                  "flex h-9 w-9 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-surface transition-shadow peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400",
                  projectDot[c],
                  color === c && "ring-2 ring-ink/70",
                )}
              >
                {color === c && <IconCheck width={16} height={16} strokeWidth={3} />}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 pt-1">
        {project ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  actions.deleteProject(project.id);
                  toast.show({ message: f(m.project.deleted, { name: project.name }) });
                  onDeleted?.();
                  onClose();
                }}
              >
                {m.project.deleteConfirm}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                {m.common.keep}
              </Button>
            </div>
          ) : (
            <Button
              variant="danger-ghost"
              onClick={() => setConfirmDelete(true)}
            >
              {m.common.delete}
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            {m.common.cancel}
          </Button>
          <Button type="submit">{project ? m.common.save : m.project.create}</Button>
        </div>
      </div>
      {confirmDelete && (
        <p className="-mt-2 pb-2 text-xs text-ink-soft">
          {taskCount > 0
            ? p(m.project.keepsTasks, taskCount)
            : m.project.noTasks}
        </p>
      )}
    </form>
  );
}

export function ProjectEditor({ open, onClose, project, onCreated, onDeleted }: Props) {
  const { m } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={project ? m.project.editTitle : m.project.newTitle}>
      {open && (
        <ProjectForm key={project?.id ?? "new"} project={project} onClose={onClose} onCreated={onCreated} onDeleted={onDeleted} />
      )}
    </Modal>
  );
}
