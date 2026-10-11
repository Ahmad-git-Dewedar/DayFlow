import { useEffect, useMemo, type ReactNode } from "react";
import { DIRS, LANG_KEY, LOCALES, interpolate, plural, type Lang } from "./core";
import { I18nContext, type I18n } from "./context";
import { en } from "./en";
import { ar } from "./ar";
import { useActions, useAppState } from "../lib/store/context";
import { setDateFormat } from "../lib/dates";

const MESSAGES = { en, ar };

/**
 * Language comes from the saved account (settings.language), so it travels
 * with backups and survives reloads. Switching re-renders every consumer.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppState();
  const actions = useActions();
  const lang: Lang = settings.language;

  const value = useMemo<I18n>(() => {
    const m = MESSAGES[lang];
    const locale = LOCALES[lang];
    // Set before children render so every date/duration below is localized.
    setDateFormat(locale, {
      today: m.common.today,
      tomorrow: m.common.tomorrow,
      yesterday: m.common.yesterday,
      hours: m.time.hours,
      minutes: m.time.minutes,
      hoursMinutes: m.time.hoursMinutes,
    });
    return {
      lang,
      dir: DIRS[lang],
      locale,
      m,
      f: interpolate,
      p: (forms, n, vars) => plural(forms, n, lang, vars),
      setLang: (next) => actions.updateSettings({ language: next }),
    };
  }, [lang, actions]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = DIRS[lang];
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* storage unavailable */
    }
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
