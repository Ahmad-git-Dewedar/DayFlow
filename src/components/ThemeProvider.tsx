import { useEffect, useState, type ReactNode } from "react";
import { THEME_KEY, ThemeContext, type ThemePref } from "../lib/theme";

function readPref(): ThemePref {
  try {
    const s = localStorage.getItem(THEME_KEY);
    if (s === "light" || s === "dark") return s;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Theme follows the OS until the user picks one explicitly. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPref] = useState<ThemePref>(readPref);
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved = pref === "system" ? (sysDark ? "dark" : "light") : pref;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0a1510" : "#ffffff");
  }, [resolved]);

  useEffect(() => {
    try {
      if (pref === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, pref);
    } catch {
      /* ignore */
    }
  }, [pref]);

  return <ThemeContext.Provider value={{ pref, resolved, setPref }}>{children}</ThemeContext.Provider>;
}
