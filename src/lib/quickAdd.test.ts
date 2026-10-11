import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quickAdd";
import type { Project } from "./store/types";

const projects: Project[] = [
  { id: "w", name: "Work", color: "emerald", createdAt: 0 },
  { id: "s", name: "Side Project", color: "sky", createdAt: 0 },
];

describe("parseQuickAdd", () => {
  it("leaves plain titles alone", () => {
    expect(parseQuickAdd("Call the bank", projects)).toEqual({ title: "Call the bank", start: null, duration: null, projectId: null });
  });

  it("extracts 24h time, duration and project", () => {
    expect(parseQuickAdd("Write proposal 14:00 45m #work", projects)).toEqual({
      title: "Write proposal",
      start: "14:00",
      duration: 45,
      projectId: "w",
    });
  });

  it("understands 12h times and hour durations", () => {
    expect(parseQuickAdd("Gym 6pm 1h", projects)).toMatchObject({ start: "18:00", duration: 60, title: "Gym" });
    expect(parseQuickAdd("Standup 9:15am", projects)).toMatchObject({ start: "09:15" });
    expect(parseQuickAdd("Midnight thing 12am", projects)).toMatchObject({ start: "00:00" });
    expect(parseQuickAdd("Lunch 12pm", projects)).toMatchObject({ start: "12:00" });
    expect(parseQuickAdd("Deep work 1h30m", projects)).toMatchObject({ duration: 90 });
    expect(parseQuickAdd("Review 1.5h", projects)).toMatchObject({ duration: 90 });
  });

  it("matches multi-word project names written with dashes", () => {
    expect(parseQuickAdd("Ship it #side-project", projects).projectId).toBe("s");
  });

  it("keeps unknown tags and invalid times in the title", () => {
    expect(parseQuickAdd("Plan #trip 25:00", projects)).toEqual({ title: "Plan #trip 25:00", start: null, duration: null, projectId: null });
  });

  it("only consumes the first time token", () => {
    expect(parseQuickAdd("Move 9am to 10am", projects)).toMatchObject({ start: "09:00", title: "Move to 10am" });
  });

  it("can skip time parsing (Inbox tasks have no day to block)", () => {
    expect(parseQuickAdd("Call at 3pm 15m", projects, { parseTime: false })).toEqual({
      title: "Call at 3pm",
      start: null,
      duration: 15,
      projectId: null,
    });
  });
});
