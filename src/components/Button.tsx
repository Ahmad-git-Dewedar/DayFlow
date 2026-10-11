import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-full transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2 hover:border-brand-300 dark:hover:border-brand-700",
  ghost: "text-ink-soft hover:text-ink hover:bg-surface-2",
  danger: "bg-[#e5484d] text-white hover:bg-[#d13d42]",
  "danger-ghost": "text-[#e5484d] hover:bg-[#e5484d]/10",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-3.5 h-9",
  md: "text-[0.9375rem] px-4.5 h-10",
  lg: "text-base px-6 h-12",
};

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

export const Button = forwardRef<HTMLButtonElement, Common & ComponentPropsWithoutRef<"button">>(
  function Button({ variant = "primary", size = "md", className, type = "button", ...rest }, ref) {
    return <button ref={ref} type={type} className={cx(base, variants[variant], sizes[size], className)} {...rest} />;
  },
);

export function ButtonLink({ to, variant = "primary", size = "md", className, children }: Common & { to: string }) {
  return (
    <Link to={to} className={cx(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}

/** Square icon-only button. `label` is required for screen readers. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  { label: string; size?: "sm" | "md"; active?: boolean } & Omit<ComponentPropsWithoutRef<"button">, "aria-label">
>(function IconButton({ label, size = "md", active, className, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        active && "bg-surface-3 text-ink",
        className,
      )}
      {...rest}
    />
  );
});
