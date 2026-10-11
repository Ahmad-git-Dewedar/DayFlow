import { describe, expect, it } from "vitest";
import { interpolate, plural } from "./core";
import { en } from "./en";
import { ar } from "./ar";

/** Every leaf path in a message tree, e.g. "today.title". */
function paths(obj: unknown, prefix = ""): string[] {
  if (typeof obj === "string" || Array.isArray(obj)) return [prefix];
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
function leaf(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
}

describe("message catalogs", () => {
  it("Arabic covers every English message (plural forms aside)", () => {
    const strip = (p: string) => p.replace(/\.(zero|one|two|few|many|other)$/, "");
    const enKeys = new Set(paths(en).map(strip));
    const arKeys = new Set(paths(ar).map(strip));
    expect([...enKeys].filter((k) => !arKeys.has(k))).toEqual([]);
  });

  it("keeps the same placeholders in both languages", () => {
    // Plural "one"/"two" forms may spell the number out, so only `other` forms are compared.
    const mismatched = paths(en).filter((p) => {
      if (/\.(zero|one|two|few|many)$/.test(p)) return false;
      const e = leaf(en, p);
      const a = leaf(ar, p);
      return typeof e === "string" && typeof a === "string" && placeholders(e).join() !== placeholders(a).join();
    });
    expect(mismatched).toEqual([]);
  });
});

describe("interpolate & plural", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(interpolate("Hi {name}, {x}", { name: "Sara" })).toBe("Hi Sara, {x}");
  });

  it("uses English one/other", () => {
    expect(plural(en.today.moved, 1, "en")).toBe("Moved 1 task to today");
    expect(plural(en.today.moved, 4, "en")).toBe("Moved 4 tasks to today");
  });

  it("uses all six Arabic plural categories", () => {
    const f = ar.habits.streak;
    expect(plural(f, 0, "ar")).toBe("لا سلسلة بعد");
    expect(plural(f, 1, "ar")).toBe("سلسلة يوم واحد");
    expect(plural(f, 2, "ar")).toBe("سلسلة يومين");
    expect(plural(f, 5, "ar")).toBe("سلسلة 5 أيام");
    expect(plural(f, 11, "ar")).toBe("سلسلة 11 يومًا");
    expect(plural(f, 100, "ar")).toBe("سلسلة 100 يوم");
  });
});
