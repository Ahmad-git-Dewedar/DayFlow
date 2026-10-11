import { describe, expect, it } from "vitest";
import { layoutBlocks } from "./timelineLayout";
import { niceScale } from "./chartScale";
import type { Task } from "./store/types";

const block = (id: string, start: number, duration: number) => ({ task: { id } as Task, start, duration });
const lanes = (blocks: ReturnType<typeof block>[]) =>
  Object.fromEntries(layoutBlocks(blocks).map((p) => [p.task.id, [p.lane, p.lanes]]));

describe("timeline lanes", () => {
  it("gives non-overlapping blocks the full width", () => {
    expect(lanes([block("a", 540, 60), block("b", 600, 30)])).toEqual({ a: [0, 1], b: [0, 1] });
  });

  it("puts overlapping blocks side by side", () => {
    expect(lanes([block("a", 540, 60), block("b", 570, 60)])).toEqual({ a: [0, 2], b: [1, 2] });
  });

  it("reuses a freed lane inside the same cluster", () => {
    // a overlaps b; c starts after a ends but while b is still running.
    expect(lanes([block("a", 540, 30), block("b", 540, 90), block("c", 570, 30)])).toEqual({
      b: [0, 2],
      a: [1, 2],
      c: [1, 2],
    });
  });

  it("starts a fresh cluster after a gap", () => {
    expect(lanes([block("a", 540, 60), block("b", 550, 20), block("c", 700, 30)])).toMatchObject({ c: [0, 1] });
  });
});

describe("niceScale", () => {
  it("uses round duration steps", () => {
    expect(niceScale(100, "duration")).toEqual({ ticks: [0, 30, 60, 90, 120], top: 120 });
    expect(niceScale(300, "duration").ticks).toEqual([0, 120, 240, 360]);
  });

  it("uses round count steps and a sensible empty scale", () => {
    expect(niceScale(7, "count")).toEqual({ ticks: [0, 2, 4, 6, 8], top: 8 });
    expect(niceScale(0, "count").top).toBe(4);
    expect(niceScale(0, "duration").top).toBe(60);
  });
});
