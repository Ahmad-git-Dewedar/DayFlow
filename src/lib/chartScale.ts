/**
 * Clean axis ticks: at most ~4 intervals at round values.
 * Durations (minutes) step in 15m / 30m / 1h / 2h…; counts step in 1 / 2 / 5 / 10…
 */
const DURATION_STEPS = [15, 30, 60, 120, 180, 240, 360, 480];
const COUNT_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];

export function niceScale(max: number, kind: "duration" | "count"): { ticks: number[]; top: number } {
  const steps = kind === "duration" ? DURATION_STEPS : COUNT_STEPS;
  const fallbackMax = kind === "duration" ? 60 : 4;
  const target = max > 0 ? max : fallbackMax;
  const step = steps.find((s) => target / s <= 4) ?? Math.ceil(target / 4);
  const top = Math.ceil(target / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { ticks, top };
}
