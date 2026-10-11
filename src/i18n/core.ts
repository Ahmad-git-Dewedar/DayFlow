/*
 * Tiny, dependency-free i18n. Messages are plain typed objects (so a missing
 * Arabic string is a compile error), `{name}` placeholders are interpolated,
 * and plurals follow each language's real rules via Intl.PluralRules —
 * Arabic has six plural forms.
 */

export type Lang = "en" | "ar";
export const LANGS: Lang[] = ["en", "ar"];

/** Forms are picked with Intl.PluralRules; `other` is the required fallback. */
export type Plural = { other: string; zero?: string; one?: string; two?: string; few?: string; many?: string };

/** Turns the English literal types into the shape every translation must match. */
export type Widen<T> = T extends string
  ? string
  : T extends readonly string[]
    ? string[]
    : T extends { other: string }
      ? Plural
      : { [K in keyof T]: Widen<T[K]> };

/** Intl locale per language. Arabic uses Western digits, which most Arabic product UIs use for times and counts. */
export const LOCALES: Record<Lang, string> = { en: "en", ar: "ar-u-nu-latn" };

export const DIRS: Record<Lang, "ltr" | "rtl"> = { en: "ltr", ar: "rtl" };

export type Vars = Record<string, string | number>;

export function interpolate(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

const ruleCache = new Map<Lang, Intl.PluralRules>();

export function plural(forms: Plural, n: number, lang: Lang, vars: Vars = {}): string {
  let rules = ruleCache.get(lang);
  if (!rules) {
    rules = new Intl.PluralRules(LOCALES[lang]);
    ruleCache.set(lang, rules);
  }
  // Exact 0 gets the "zero" form when a language provides one.
  const category = n === 0 && forms.zero !== undefined ? "zero" : rules.select(n);
  const template = forms[category as keyof Plural] ?? forms.other;
  return interpolate(template, { n, ...vars });
}

/** Follows the browser's first-choice language (Arabic if it's Arabic, otherwise English). */
export function detectLanguage(): Lang {
  if (typeof navigator === "undefined") return "en";
  const first = navigator.languages?.[0] ?? navigator.language ?? "";
  return first.toLowerCase().startsWith("ar") ? "ar" : "en";
}

/** Key the pre-paint script in index.html reads to set lang/dir before React loads. */
export const LANG_KEY = "dayflow-lang";
