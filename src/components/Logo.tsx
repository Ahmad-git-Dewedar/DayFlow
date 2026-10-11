import { useId } from "react";

type LogoProps = {
  showWordmark?: boolean;
  className?: string;
  /** mark height in px */
  size?: number;
};

/**
 * DayFlow brand lockup. The mark is a "D" built from a flowing ribbon with a
 * checkmark sweeping through it — the two ideas in the name: the *day* (the D /
 * the plan) and the *flow* (the sweep of progress), confirmed by the check.
 */
export function Logo({ showWordmark = true, className = "", size = 32 }: LogoProps) {
  // Unique per instance: two logos can be mounted at once (sidebar + mobile bar),
  // and a shared id would point one of them at a gradient inside a hidden element.
  const gradId = `df-grad-${useId().replace(/:/g, "")}`;
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="DayFlow"
      role="img"
      // A brand lockup never mirrors: mark first, then wordmark, in every language.
      dir="ltr"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradId} x1="12" y1="8" x2="46" y2="58" gradientUnits="userSpaceOnUse">
            <stop style={{ stopColor: "var(--logo-a)" }} />
            <stop offset="1" style={{ stopColor: "var(--logo-b)" }} />
          </linearGradient>
        </defs>
        <path
          d="M14 10h17c13.2 0 23 9.6 23 22s-9.8 22-23 22H14V40h16c6 0 10-4.6 10-8s-4-8-10-8H14z"
          fill={`url(#${gradId})`}
        />
        <path
          d="M20 33.5l8.5 8.5L47 20"
          style={{ stroke: "var(--logo-check)" }}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showWordmark && (
        <span
          className="font-display text-[1.35rem] font-bold tracking-tight leading-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="text-ink">Day</span>
          <span className="text-brand-500 dark:text-brand-400">flow</span>
        </span>
      )}
    </span>
  );
}
