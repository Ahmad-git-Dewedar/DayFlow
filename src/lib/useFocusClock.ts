import { useEffect, useState } from "react";
import { focusElapsedMs } from "./store/reducer";
import type { ActiveFocus } from "./store/types";

export type FocusClock = {
  running: boolean;
  elapsedMs: number;
  remainingMs: number;
  progress: number; // 0–1
};

export function readClock(f: ActiveFocus, now: number): FocusClock {
  const total = f.durationMin * 60_000;
  const elapsedMs = Math.min(total, focusElapsedMs(f, now));
  return {
    running: f.runningSince !== null,
    elapsedMs,
    remainingMs: total - elapsedMs,
    progress: total > 0 ? elapsedMs / total : 0,
  };
}

/** Live view of the focus timer; ticks once a second only while running. */
export function useFocusClock(f: ActiveFocus | null): FocusClock | null {
  const [now, setNow] = useState(() => Date.now());
  const running = f?.runningSince != null;

  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running, f]);

  return f ? readClock(f, now) : null;
}
