import { useId, useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Field } from "./ui";
import { IconCheck } from "./icons";
import { useActions, useAppState } from "../lib/store/context";
import { PROJECT_COLORS, type Project, type ProjectColor } from "../lib/store/types";
import { PROJECT_COLOR_LABELS, projectDot } from "../lib/projectColors";
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
    if (!trimmed) return setError("Give the project a name.");
    const clash = projects.some((p) => p.id !== project?.id && p.name.toLowerCase() === trimmed.toLowerCase());
    if (clash) return setError("You already have a project with that name.");
    if (project) actions.updateProject(project.id, { name: trimmed, color });
    else onCreated?.(actions.addProject(trimmed, color));
    onClose();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Name" htmlFor={`${formId}-name`} error={error ?? undefined}>
        <input
          id={`${formId}-name`}
          className="field"
          data-autofocus
          maxLength={60}
          value={name}
          placeholder="e.g. Work, Health, Side project"
          aria-invalid={!!error}
          aria-describedby={error ? `${formId}-name-error` : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">Color</legend>
        <div className="flex flex-wrap gap-2.5">
          {PROJECT_COLORS.map((c) => (
            <label key={c} className="relative cursor-pointer" title={PROJECT_COLOR_LABELS[c]}>
              <input
                type="radio"
                name={`${formId}-color`}
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
                className="peer sr-only"
                aria-label={PROJECT_COLOR_LABELS[c]}
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
                  toast.show({ message: `Deleted project “${project.name}”` });
                  onDeleted?.();
                  onClose();
                }}
              >
                Delete project
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button
              variant="danger-ghost"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{project ? "Save" : "Create project"}</Button>
        </div>
      </div>
      {confirmDelete && (
        <p className="-mt-2 pb-2 text-xs text-ink-soft">
          {taskCount > 0
            ? `Its ${taskCount} task${taskCount === 1 ? "" : "s"} will be kept without a project.`
            : "This project has no tasks."}
        </p>
      )}
    </form>
  );
}

export function ProjectEditor({ open, onClose, project, onCreated, onDeleted }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={project ? "Edit project" : "New project"}>
      {open && (
        <ProjectForm key={project?.id ?? "new"} project={project} onClose={onClose} onCreated={onCreated} onDeleted={onDeleted} />
      )}
    </Modal>
  );
}
