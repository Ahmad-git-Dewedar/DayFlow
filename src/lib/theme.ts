import { createContext, useContext } from "react";

export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "dayflow-theme";

export type ThemeValue = {
  pref: ThemePref;
  resolved: "light" | "dark";
  setPref: (p: ThemePref) => void;
};

export const ThemeContext = createContext<ThemeValue | null>(null);

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme must be used inside <ThemeProvider>");
  return v;
}
