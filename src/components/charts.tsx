import { useId, type ReactNode } from "react";
import { cx } from "../lib/utils";
import { niceScale } from "../lib/chartScale";

/*
 * Small, dependency-free charts following the dataviz spec:
 * thin columns (<= 24px) with 4px rounded data-ends and a square baseline,
 * solid hairline grid, one hue for a single series (no legend box), values
 * in text tokens, hover/focus tooltips that never gate data (every chart has
 * a table view), and direct labels only on the extreme.
 */

export type Datum = { key: string; label: string; sublabel?: string; value: number };

type ColumnChartProps = {
  data: Datum[];
  /** Formats a value for ticks, labels and tooltips. */
  format: (v: number) => string;
  kind: "duration" | "count";
  /** Optional reference line, e.g. a daily goal. */
  reference?: { value: number; label: string };
  highlightKey?: string;
  height?: number;
  title: string;
  /** Compact formatter for axis ticks (defaults to `format`). */
  tickFormat?: (v: number) => string;
};

export function ColumnChart({ data, format, kind, reference, highlightKey, height = 176, title, tickFormat = format }: ColumnChartProps) {
  const max = Math.max(0, ...data.map((d) => d.value), reference?.value ?? 0);
  const { ticks, top } = niceScale(max, kind);
  const y = (v: number) => (top === 0 ? 0 : (v / top) * 100);
  const highest = data.reduce<Datum | null>((best, d) => (d.value > 0 && (!best || d.value > best.value) ? d : best), null);
  // Skip the direct label when it would sit on the reference line; the tooltip and table still carry it.
  const peak = highest && reference && Math.abs(y(highest.value) - y(reference.value)) < 10 ? null : highest;

  return (
    <figure className="flex flex-col gap-3" aria-label={title}>
      <div className="flex gap-2">
        {/* y-axis ticks */}
        <div className="relative w-10 shrink-0 text-right text-[0.7rem] tabular-nums text-muted" style={{ height }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2 whitespace-nowrap" style={{ bottom: `${y(t)}%` }}>
              {tickFormat(t)}
            </span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height }}>
          {/* hairline grid */}
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ bottom: `${y(t)}%` }} aria-hidden />
          ))}

          {reference && reference.value > 0 && (
            <div className="pointer-events-none absolute inset-x-0 z-10" style={{ bottom: `${y(reference.value)}%` }} aria-hidden>
              <div className="h-px bg-ink-soft/60" />
              <span className="absolute -top-4.5 right-0 rounded bg-surface px-1 text-[0.68rem] font-medium text-ink-soft">
                {reference.label}
              </span>
            </div>
          )}

          <ul className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
            {data.map((d) => {
              const h = y(d.value);
              const isPeak = peak?.key === d.key;
              return (
                <li key={d.key} className="group relative flex h-full justify-center">
                  {/* hit target is the whole column slot, not just the bar */}
                  <div
                    tabIndex={0}
                    role="img"
                    aria-label={`${d.label}${d.sublabel ? ` ${d.sublabel}` : ""}: ${format(d.value)}`}
                    className="relative flex h-full w-full items-end justify-center rounded-md outline-offset-0 hover:bg-surface-2 focus-visible:bg-surface-2"
                  >
                    {d.value > 0 && (
                      <div
                        className={cx(
                          "w-[min(24px,60%)] rounded-t-[4px] transition-[height] duration-500 ease-[var(--ease-out-soft)]",
                          d.key === highlightKey ? "bg-brand-500 dark:bg-brand-400" : "bg-brand-500/80 dark:bg-brand-400/80",
                        )}
                        style={{ height: `${h}%` }}
                      />
                    )}
                    {isPeak && (
                      <span
                        className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.7rem] font-semibold text-ink group-hover:opacity-0 group-focus-within:opacity-0"
                        style={{ bottom: `calc(${h}% + 4px)` }}
                        aria-hidden
                      >
                        {format(d.value)}
                      </span>
                    )}
                    {/* tooltip */}
                    <span
                      className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand-950 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-[var(--shadow-lift)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-surface-3 dark:text-ink"
                      style={{ bottom: `calc(${Math.min(h, 78)}% + 8px)` }}
                      aria-hidden
                    >
                      <span className="block text-[0.68rem] opacity-70">
                        {d.label} {d.sublabel}
                      </span>
                      <span className="font-semibold">{format(d.value)}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* x-axis labels */}
      <div className="ml-12 grid" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }} aria-hidden>
        {data.map((d) => (
          <div key={d.key} className="flex flex-col items-center leading-tight">
            <span className={cx("text-xs", d.key === highlightKey ? "font-semibold text-ink" : "text-ink-soft")}>{d.label}</span>
            {d.sublabel && <span className="text-[0.68rem] text-muted">{d.sublabel}</span>}
          </div>
        ))}
      </div>

      <ChartTable caption={title} rows={data.map((d) => [`${d.label}${d.sublabel ? ` ${d.sublabel}` : ""}`, format(d.value)])} headers={["Day", "Value"]} />
    </figure>
  );
}

export type BarRow = { key: string; label: string; value: number; swatch: ReactNode; colorClass: string };

/** Horizontal bars, sorted by the caller. Each bar is direct-labeled (name + value). */
export function BarList({ rows, format, title }: { rows: BarRow[]; format: (v: number) => string; title: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="flex flex-col gap-3" aria-label={title}>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex min-w-0 items-center gap-2 text-ink">
                {r.swatch}
                <span className="truncate">{r.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-ink-soft">{format(r.value)}</span>
            </div>
            <div className="h-2.5 w-full rounded-[4px] bg-surface-3">
              <div
                className={cx("h-full rounded-[4px] transition-[width] duration-500 ease-[var(--ease-out-soft)]", r.colorClass)}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <ChartTable caption={title} headers={["Project", "Focus time"]} rows={rows.map((r) => [r.label, format(r.value)])} />
    </figure>
  );
}

/** Accessible table twin of a chart, collapsed by default. */
export function ChartTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: string[][] }) {
  const id = useId();
  return (
    <details className="group/tbl text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-xs font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <span className="group-open/tbl:hidden">View as table</span>
        <span className="hidden group-open/tbl:inline">Hide table</span>
      </summary>
      <table className="mt-2 w-full border-collapse text-left" aria-describedby={id}>
        <caption id={id} className="sr-only">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {headers.map((h) => (
              <th key={h} scope="col" className="py-1.5 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-line last:border-0">
              {r.map((c, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="py-1.5 pr-4 font-normal text-ink-soft">
                    {c}
                  </th>
                ) : (
                  <td key={i} className="py-1.5 pr-4 tabular-nums text-ink">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
