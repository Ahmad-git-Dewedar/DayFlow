import type { ProjectColor } from "./store/types";

/**
 * Static class maps so Tailwind can see every color class at build time.
 * `projectDot` is the identity color for marks (dots, chart bars):
 * #2f855e, #0084d1, #e17100, #8e51ff, #ec003f — validated as a categorical set.
 */
export const projectDot: Record<ProjectColor, string> = {
  emerald: "bg-brand-500",
  sky: "bg-sky-600",
  amber: "bg-amber-600",
  violet: "bg-violet-500",
  rose: "bg-rose-600",
};

/** Tinted fills for timeline blocks; text inside uses ink, never the series color. */
export const projectBlock: Record<ProjectColor, string> = {
  emerald: "bg-brand-100 text-brand-950 border-brand-500 dark:bg-brand-900/80 dark:text-brand-50 dark:border-brand-400",
  sky: "bg-sky-100 text-sky-950 border-sky-600 dark:bg-sky-950/80 dark:text-sky-50 dark:border-sky-500",
  amber: "bg-amber-100 text-amber-950 border-amber-600 dark:bg-amber-950/80 dark:text-amber-50 dark:border-amber-500",
  violet: "bg-violet-100 text-violet-950 border-violet-500 dark:bg-violet-950/80 dark:text-violet-50 dark:border-violet-400",
  rose: "bg-rose-100 text-rose-950 border-rose-600 dark:bg-rose-950/80 dark:text-rose-50 dark:border-rose-500",
};

export const PROJECT_COLOR_LABELS: Record<ProjectColor, string> = {
  emerald: "Green",
  sky: "Blue",
  amber: "Amber",
  violet: "Violet",
  rose: "Rose",
};
