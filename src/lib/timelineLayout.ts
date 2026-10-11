import type { Task } from "./store/types";

export type Block = { task: Task; start: number; duration: number };
export type Placed = Block & { lane: number; lanes: number };

/** Assigns side-by-side lanes to overlapping blocks (per overlap cluster). */
export function layoutBlocks(blocks: Block[]): Placed[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.duration - a.duration);
  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];

  const flush = () => {
    const lanes = laneEnds.length;
    for (const p of cluster) p.lanes = lanes;
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const b of sorted) {
    if (cluster.length && b.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= b.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = b.start + b.duration;
    cluster.push({ ...b, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, b.start + b.duration);
  }
  if (cluster.length) flush();
  return out;
}
