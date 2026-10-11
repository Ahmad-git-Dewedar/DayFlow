import { useEffect, useRef } from "react";
import { useActions, useAppState } from "../lib/store/context";
import { useToast } from "../lib/toast";
import { useFocusClock } from "../lib/useFocusClock";
import { formatClock } from "../lib/dates";

const BASE_TITLE = "DayFlow";

function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    window.setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio not available */
  }
}

/**
 * App-wide focus timer side effects: finishes the session when time is up
 * (on whatever page you're on, even after a reload), shows the countdown in
 * the tab title, and notifies you. Renders nothing.
 */
export function FocusWatcher() {
  const { activeFocus, settings } = useAppState();
  const actions = useActions();
  const toast = useToast();
  const clock = useFocusClock(activeFocus);

  const done = clock !== null && clock.remainingMs <= 0;
  // Guards against finishing the same session twice (e.g. StrictMode re-runs).
  const finished = useRef<number | null>(null);

  useEffect(() => {
    if (!done || !activeFocus || finished.current === activeFocus.firstStartedAt) return;
    finished.current = activeFocus.firstStartedAt;
    actions.finishFocus(true);
    chime();
    const message = `Focus session complete — ${activeFocus.durationMin} min on “${activeFocus.label}”.`;
    toast.show({ message, tone: "success" });
    if (settings.notifications && "Notification" in window && Notification.permission === "granted" && document.hidden) {
      try {
        new Notification("Focus session complete", { body: message, icon: "/favicon.svg" });
      } catch {
        /* some browsers only allow notifications from a service worker */
      }
    }
  }, [done, activeFocus, actions, toast, settings.notifications]);

  useEffect(() => {
    if (!clock || done) {
      document.title = document.title.replace(/^\S+ (⏸ )?· /, "");
      return;
    }
    const prefix = `${formatClock(clock.remainingMs / 1000)} ${clock.running ? "" : "⏸ "}· `;
    const base = document.title.replace(/^\S+ (⏸ )?· /, "") || BASE_TITLE;
    document.title = prefix + base;
  });

  return null;
}
