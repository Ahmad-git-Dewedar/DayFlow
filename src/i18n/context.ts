import { createContext, useContext } from "react";
import type { Messages } from "./en";
import type { Lang, Plural, Vars } from "./core";

export type I18n = {
  lang: Lang;
  dir: "ltr" | "rtl";
  /** Intl locale string for the current language. */
  locale: string;
  /** All messages for the current language. */
  m: Messages;
  /** Fill `{placeholders}` in a message. */
  f: (template: string, vars?: Vars) => string;
  /** Pick the right plural form for `n` (and fill placeholders; `{n}` is provided). */
  p: (forms: Plural, n: number, vars?: Vars) => string;
  setLang: (lang: Lang) => void;
};

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const v = useContext(I18nContext);
  if (!v) throw new Error("useI18n must be used inside <I18nProvider>");
  return v;
}
