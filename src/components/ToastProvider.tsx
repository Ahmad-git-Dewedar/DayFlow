import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastContext, type ToastInput } from "../lib/toast";
import { IconCheck, IconClose } from "./icons";
import { cx } from "../lib/utils";
import { useI18n } from "../i18n/context";

type Toast = ToastInput & { id: number };

const DURATION = 5000;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { m } = useI18n();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => onDismiss(toast.id), DURATION);
    return () => window.clearTimeout(t);
  }, [paused, toast.id, onDismiss]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="animate-toast-in pointer-events-auto flex w-full items-center gap-3 rounded-xl bg-brand-950 py-2.5 ps-4 pe-2 text-sm text-white shadow-[var(--shadow-lift)] dark:bg-surface-3 dark:text-ink"
    >
      {toast.tone === "success" && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-400 text-white">
          <IconCheck width={12} height={12} strokeWidth={3} />
        </span>
      )}
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick();
            onDismiss(toast.id);
          }}
          className="rounded-lg px-2.5 py-1.5 font-semibold text-brand-300 hover:bg-white/10 dark:text-brand-400 dark:hover:bg-surface-2"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label={m.common.dismiss}
        onClick={() => onDismiss(toast.id)}
        className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white dark:text-muted dark:hover:bg-surface-2 dark:hover:text-ink"
      >
        <IconClose width={16} height={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const api = useMemo(
    () => ({
      show(t: ToastInput) {
        const id = nextId.current++;
        // Keep the stack short; newest wins.
        setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className={cx(
          "pointer-events-none fixed inset-x-0 z-[60] mx-auto flex w-full max-w-sm flex-col gap-2 px-4",
          "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6",
        )}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
