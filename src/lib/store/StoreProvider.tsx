import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { reducer } from "./reducer";
import { normalizeState } from "./normalize";
import { emptyState, type State } from "./types";
import { DispatchContext, StateContext } from "./context";
import { detectLanguage } from "../../i18n/core";

export const STORAGE_KEY = "dayflow-data";

type LoadResult = { state: State; error: boolean };

/** A brand-new account starts in the browser's language (Arabic or English). */
function freshState(): State {
  const s = emptyState();
  return { ...s, settings: { ...s.settings, language: detectLanguage() } };
}

function load(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { state: freshState(), error: false };
    return { state: normalizeState(JSON.parse(raw)), error: false };
  } catch {
    // Unreadable storage (blocked, or corrupted JSON): start clean but don't
    // overwrite whatever is there until the user changes something.
    return { state: freshState(), error: true };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(load);
  const [state, dispatch] = useReducer(reducer, initial.state);
  const lastSaved = useRef<string | null>(null);
  const skipFirstSave = useRef(initial.error);

  // Persist on every change. Skips no-op writes so the cross-tab listener
  // below can't ping-pong identical data between tabs.
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const serialized = JSON.stringify(state);
    if (serialized === lastSaved.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      lastSaved.current = serialized;
    } catch {
      /* quota exceeded or storage blocked — the app keeps working in memory */
    }
  }, [state]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null || e.newValue === lastSaved.current) return;
      try {
        lastSaved.current = e.newValue;
        dispatch({ type: "data/replace", state: normalizeState(JSON.parse(e.newValue)) });
      } catch {
        /* ignore malformed writes from elsewhere */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </DispatchContext.Provider>
  );
}
