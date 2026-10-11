import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  formatClock,
  formatDuration,
  isDateKey,
  isTime,
  minutesToTime,
  startOfWeek,
  timeToMinutes,
  toKey,
  weekDays,
} from "./dates";

describe("date keys", () => {
  it("round-trips local dates", () => {
    expect(toKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("adds days across a DST change without skipping or repeating a day", () => {
    // Day arithmetic goes through the Date constructor, so it is DST-safe in any zone.
    const keys = Array.from({ length: 10 }, (_, i) => addDays("2026-03-25", i));
    expect(new Set(keys).size).toBe(10);
    expect(keys[keys.length - 1]).toBe("2026-04-03");
  });

  it("validates keys strictly", () => {
    expect(isDateKey("2026-02-28")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-2-3")).toBe(false);
    expect(isDateKey(20260203)).toBe(false);
  });

  it("computes week starts for Monday and Sunday weeks", () => {
    // 2026-10-11 is a Sunday.
    expect(startOfWeek("2026-10-11", 1)).toBe("2026-10-05");
    expect(startOfWeek("2026-10-11", 0)).toBe("2026-10-11");
    expect(weekDays("2026-10-07", 1)).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11",
    ]);
  });

  it("diffs days", () => {
    expect(diffDays("2026-10-11", "2026-10-01")).toBe(10);
    expect(diffDays("2026-10-01", "2026-10-11")).toBe(-10);
  });
});

describe("times and formatting", () => {
  it("validates HH:MM", () => {
    expect(isTime("09:30")).toBe(true);
    expect(isTime("24:00")).toBe(false);
    expect(isTime("9:30")).toBe(false);
  });

  it("converts minutes both ways and clamps to the day", () => {
    expect(timeToMinutes("13:45")).toBe(825);
    expect(minutesToTime(825)).toBe("13:45");
    expect(minutesToTime(-10)).toBe("00:00");
    expect(minutesToTime(2000)).toBe("23:59");
  });

  it("formats durations and clocks", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(95)).toBe("1h 35m");
    expect(formatClock(1499.2)).toBe("25:00");
    expect(formatClock(3725)).toBe("1:02:05");
  });
});
