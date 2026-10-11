import type { ReactNode } from "react";
import { cx } from "../lib/utils";
import type { ProjectColor } from "../lib/store/types";
import { projectDot } from "../lib/projectColors";

/** Page heading row used by every screen, so titles and actions line up. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  /** Small line above the title, e.g. a greeting. */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("rounded-[var(--radius-lg)] border border-line bg-surface", className)}>{children}</section>;
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
      <h2 className="text-[0.95rem] font-semibold">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  compact,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx("flex flex-col items-center gap-3 text-center", compact ? "px-4 py-8" : "px-6 py-14")}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
        {icon}
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-semibold text-ink">{title}</p>
        {children && <p className="text-sm text-ink-soft">{children}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Label + control + optional hint/error, wired up for screen readers. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-[#e5484d]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ProjectDot({ color, className }: { color: ProjectColor; className?: string }) {
  return <span aria-hidden className={cx("inline-block h-2.5 w-2.5 shrink-0 rounded-full", projectDot[color], className)} />;
}

/** Circular progress. `value` is 0–1. */
export function ProgressRing({
  value,
  size = 44,
  stroke = 5,
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="stroke-brand-500 transition-[stroke-dashoffset] duration-500 ease-[var(--ease-out-soft)] dark:stroke-brand-400"
        />
      </svg>
      {children && <span className="absolute inset-0 flex items-center justify-center">{children}</span>}
    </div>
  );
}

/** Segmented control (radio-group semantics) for small exclusive choices. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-surface-2 p-1">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              selected ? "bg-surface text-ink shadow-[var(--shadow-soft)]" : "text-ink-soft hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
