import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { Project, Task } from "../lib/store/types";
import { formatTime, minutesToTime, nowMinutes, timeToMinutes } from "../lib/dates";
import { projectBlock } from "../lib/projectColors";
import { cx } from "../lib/utils";
import { useI18n } from "../i18n/context";
import { layoutBlocks, type Block, type Placed } from "../lib/timelineLayout";

const HOUR_PX = 56;
const PX_PER_MIN = HOUR_PX / 60;
const SNAP = 15;
const MIN_BLOCK_PX = 24;
const DRAG_THRESHOLD = 4;
const TOUCH_HOLD_MS = 350;

type Drag = {
  id: string;
  mode: "move" | "resize";
  pointerId: number;
  originY: number;
  origStart: number;
  origDuration: number;
  start: number;
  duration: number;
  active: boolean;
  touch: boolean;
};

type Props = {
  tasks: Task[];
  projects: Map<string, Project>;
  isToday: boolean;
  onEdit: (task: Task) => void;
  onChange: (id: string, start: string, duration: number) => void;
  onCreateAt: (start: string) => void;
};

export function Timeline({ tasks, projects, isToday, onEdit, onChange, onCreateAt }: Props) {
  const { m, f } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [now, setNow] = useState(() => nowMinutes());

  const setDragBoth = (d: Drag | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  // Visible range: 7:00–22:00, widened to fit any block outside it.
  const [rangeStart, rangeEnd] = useMemo(() => {
    let lo = 7 * 60;
    let hi = 22 * 60;
    for (const t of tasks) {
      if (!t.start) continue;
      const s = timeToMinutes(t.start);
      lo = Math.min(lo, Math.floor(s / 60) * 60);
      hi = Math.max(hi, Math.min(24 * 60, Math.ceil((s + t.duration) / 60) * 60));
    }
    return [lo, hi];
  }, [tasks]);

  const placed = useMemo(() => {
    const blocks: Block[] = tasks
      .filter((t) => t.start)
      .map((t) =>
        drag && drag.id === t.id
          ? { task: t, start: drag.start, duration: drag.duration }
          : { task: t, start: timeToMinutes(t.start!), duration: t.duration },
      );
    return layoutBlocks(blocks);
  }, [tasks, drag]);

  // Tick the "now" line once a minute, only when viewing today.
  useEffect(() => {
    if (!isToday) return;
    const id = window.setInterval(() => setNow(nowMinutes()), 30_000);
    return () => window.clearInterval(id);
  }, [isToday]);

  // Initial scroll: an hour before now (today) or to the first block.
  const firstStart = placed.length ? Math.min(...placed.map((p) => p.start)) : null;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = isToday ? nowMinutes() - 60 : (firstStart ?? 9 * 60) - 30;
    el.scrollTop = Math.max(0, (target - rangeStart) * PX_PER_MIN);
    // Only on mount / when switching days — not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday]);

  // While a touch drag is active, stop the page from scrolling under the finger.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current?.active) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const clearHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  function beginDrag(e: PointerEvent<HTMLElement>, block: Placed, mode: Drag["mode"]) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const touch = e.pointerType === "touch";
    const d: Drag = {
      id: block.task.id,
      mode,
      pointerId: e.pointerId,
      originY: e.clientY,
      origStart: block.start,
      origDuration: block.duration,
      start: block.start,
      duration: block.duration,
      active: false,
      touch,
    };
    dragRef.current = d;
    if (touch) {
      // Press-and-hold to pick a block up, so a normal swipe still scrolls.
      const target = e.currentTarget;
      holdTimer.current = window.setTimeout(() => {
        if (!dragRef.current) return;
        try {
          target.setPointerCapture(d.pointerId);
        } catch {
          /* pointer already gone */
        }
        setDragBoth({ ...dragRef.current, active: true });
        navigator.vibrate?.(10);
      }, TOUCH_HOLD_MS);
    } else {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }

  function moveDrag(e: PointerEvent<HTMLElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dy = e.clientY - d.originY;
    if (!d.active) {
      if (d.touch) {
        // Finger moved before the hold finished: it's a scroll, not a drag.
        if (Math.abs(dy) > 8) {
          clearHold();
          dragRef.current = null;
        }
        return;
      }
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
    }
    const steps = Math.round(dy / PX_PER_MIN / SNAP) * SNAP;
    const next = { ...d, active: true };
    if (d.mode === "move") {
      next.start = Math.max(rangeStart, Math.min(rangeEnd - d.origDuration, d.origStart + steps));
    } else {
      next.duration = Math.max(SNAP, Math.min(rangeEnd - d.origStart, d.origDuration + steps));
    }
    setDragBoth(next);
  }

  function endDrag(e: PointerEvent<HTMLElement>, cancelled = false) {
    clearHold();
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (d.active) {
      suppressClick.current = true;
      if (!cancelled && (d.start !== d.origStart || d.duration !== d.origDuration)) {
        onChange(d.id, minutesToTime(d.start), d.duration);
      }
    }
    setDragBoth(null);
  }

  function onBlockKey(e: KeyboardEvent<HTMLButtonElement>, block: Placed) {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const delta = e.key === "ArrowUp" ? -SNAP : SNAP;
    if (e.shiftKey) {
      const duration = Math.max(SNAP, Math.min(24 * 60 - block.start, block.duration + delta));
      onChange(block.task.id, minutesToTime(block.start), duration);
    } else {
      const start = Math.max(0, Math.min(24 * 60 - block.duration, block.start + delta));
      onChange(block.task.id, minutesToTime(start), block.duration);
    }
  }

  function onGridClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = rangeStart + (e.clientY - rect.top) / PX_PER_MIN;
    const snapped = Math.floor(minutes / 30) * 30;
    onCreateAt(minutesToTime(Math.max(rangeStart, Math.min(rangeEnd - SNAP, snapped))));
  }

  const hours = [];
  for (let m = rangeStart; m <= rangeEnd; m += 60) hours.push(m);
  const height = (rangeEnd - rangeStart) * PX_PER_MIN;
  const showNow = isToday && now >= rangeStart && now <= rangeEnd;

  return (
    <div ref={scrollRef} className="relative max-h-[34rem] overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-14rem)]">
      <div className="relative ms-14 me-2 select-none" style={{ height: height + 16 }}>
        {/* hour grid */}
        {hours.map((m) => (
          <div key={m} className="pointer-events-none absolute inset-x-0" style={{ top: (m - rangeStart) * PX_PER_MIN + 8 }}>
            <span className="absolute -start-14 -top-2 w-11 text-end text-[0.7rem] tabular-nums text-muted">
              {formatTime(minutesToTime(m === 24 * 60 ? 24 * 60 - 1 : m)).replace(":00", "")}
            </span>
            <div className="h-px bg-line" />
          </div>
        ))}

        {/* click-to-create surface + blocks */}
        <div
          className="absolute inset-x-0 cursor-copy"
          style={{ top: 8, height }}
          onClick={onGridClick}
          role="presentation"
          title={m.timeline.slotHint}
        >
          {placed.map((b) => {
            const project = b.task.projectId ? projects.get(b.task.projectId) : undefined;
            const dragging = drag?.id === b.task.id && drag.active;
            const blockHeight = Math.max(b.duration * PX_PER_MIN, MIN_BLOCK_PX);
            const compact = blockHeight < 44;
            const end = minutesToTime(b.start + b.duration);
            return (
              <div
                key={b.task.id}
                className={cx("absolute px-0.5", dragging ? "z-20" : "transition-[top,height] duration-100")}
                style={{
                  top: (b.start - rangeStart) * PX_PER_MIN,
                  height: blockHeight,
                  // Logical inset: lanes run from the right in Arabic.
                  insetInlineStart: `${(b.lane / b.lanes) * 100}%`,
                  width: `${100 / b.lanes}%`,
                }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => beginDrag(e, b, "move")}
                  onPointerMove={moveDrag}
                  onPointerUp={(e) => endDrag(e)}
                  onPointerCancel={(e) => endDrag(e, true)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    onEdit(b.task);
                  }}
                  onKeyDown={(e) => onBlockKey(e, b)}
                  aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+Shift+ArrowUp Alt+Shift+ArrowDown"
                  aria-label={f(m.timeline.block, {
                    title: b.task.title,
                    start: formatTime(minutesToTime(b.start)),
                    end: formatTime(end),
                    done: b.task.done ? m.timeline.doneSuffix : "",
                  })}
                  className={cx(
                    "group/block relative flex h-full w-full cursor-grab touch-pan-y flex-col overflow-hidden rounded-lg border-s-[3px] px-2.5 text-start active:cursor-grabbing",
                    compact ? "justify-center py-0.5" : "py-1.5",
                    project ? projectBlock[project.color] : projectBlock.emerald,
                    b.task.done && "opacity-55",
                    dragging ? "shadow-[var(--shadow-lift)] ring-2 ring-brand-400" : "shadow-[var(--shadow-soft)]",
                  )}
                >
                  <span className={cx("truncate text-[0.8rem] font-semibold leading-tight", b.task.done && "line-through")}>
                    {b.task.title}
                  </span>
                  {!compact && (
                    <span className="truncate text-[0.7rem] tabular-nums opacity-75">
                      {formatTime(minutesToTime(b.start))} – {formatTime(end)}
                    </span>
                  )}
                  {/* resize handle */}
                  <span
                    aria-hidden
                    onPointerDown={(e) => beginDrag(e, b, "resize")}
                    onPointerMove={moveDrag}
                    onPointerUp={(e) => endDrag(e)}
                    onPointerCancel={(e) => endDrag(e, true)}
                    className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize touch-none items-end justify-center opacity-0 transition-opacity group-hover/block:opacity-100"
                  >
                    <span className="mb-0.5 h-1 w-6 rounded-full bg-current opacity-40" />
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {showNow && (
          <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (now - rangeStart) * PX_PER_MIN + 8 }} aria-hidden>
            <div className="relative h-0.5 bg-[#e5484d]">
              <span className="absolute -start-1.5 -top-[5px] h-3 w-3 rounded-full bg-[#e5484d]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
