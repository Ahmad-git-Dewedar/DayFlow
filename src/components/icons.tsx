import type { SVGProps } from "react";

/** Lightweight stroke icon set (currentColor), so no icon library is needed. */
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

type P = SVGProps<SVGSVGElement>;

export const IconCheck = (p: P) => (
  <svg {...base} {...p}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconChevronLeft = (p: P) => (
  <svg {...base} {...p}><path d="m15 18-6-6 6-6" /></svg>
);
export const IconChevronRight = (p: P) => (
  <svg {...base} {...p}><path d="m9 18 6-6-6-6" /></svg>
);
export const IconCalendar = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
);
export const IconListChecks = (p: P) => (
  <svg {...base} {...p}><path d="m3 7 2 2 4-4M3 17l2 2 4-4M13 6h8M13 12h8M13 18h8" /></svg>
);
export const IconRepeat = (p: P) => (
  <svg {...base} {...p}><path d="M17 2l3 3-3 3" /><path d="M20 5H9a4 4 0 0 0-4 4v1" /><path d="M7 22l-3-3 3-3" /><path d="M4 19h11a4 4 0 0 0 4-4v-1" /></svg>
);
export const IconFocus = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /></svg>
);
export const IconChart = (p: P) => (
  <svg {...base} {...p}><path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" /></svg>
);
export const IconSettings = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
);
export const IconPlus = (p: P) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconClose = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconTrash = (p: P) => (
  <svg {...base} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const IconEdit = (p: P) => (
  <svg {...base} {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>
);
export const IconInbox = (p: P) => (
  <svg {...base} {...p}><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2.5-8Z" /></svg>
);
export const IconPlay = (p: P) => (
  <svg {...base} {...p} fill="currentColor" strokeWidth={0}><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" /></svg>
);
export const IconPause = (p: P) => (
  <svg {...base} {...p} fill="currentColor" strokeWidth={0}><rect x="6" y="5" width="4.2" height="14" rx="1.2" /><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" /></svg>
);
export const IconStop = (p: P) => (
  <svg {...base} {...p} fill="currentColor" strokeWidth={0}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
);
export const IconClock = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconFolder = (p: P) => (
  <svg {...base} {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
);
export const IconFlame = (p: P) => (
  <svg {...base} {...p}><path d="M12 21c4 0 7-2.7 7-6.8 0-3.4-2.3-5.6-3.6-7.2-.5 1.8-1.4 3-2.9 3.6C13 7 11.5 4.6 9 3c.3 3-1.6 5-3 6.8C4.9 11.3 5 12.6 5 14.2 5 18.3 8 21 12 21Z" /></svg>
);
export const IconDownload = (p: P) => (
  <svg {...base} {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
);
export const IconUpload = (p: P) => (
  <svg {...base} {...p}><path d="M12 15V4M7 9l5-5 5 5M5 20h14" /></svg>
);
export const IconSun = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
);
export const IconMoon = (p: P) => (
  <svg {...base} {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" /></svg>
);
export const IconMonitor = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
);
export const IconArchive = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" /></svg>
);
export const IconSparkle = (p: P) => (
  <svg {...base} {...p}><path d="M12 3c.5 4.5 2.5 6.5 7 7-4.5.5-6.5 2.5-7 7-.5-4.5-2.5-6.5-7-7 4.5-.5 6.5-2.5 7-7Z" /></svg>
);
export const IconFlag = (p: P) => (
  <svg {...base} {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
);
export const IconNote = (p: P) => (
  <svg {...base} {...p}><path d="M5 5h14M5 10h14M5 15h9" /></svg>
);
export const IconLayers = (p: P) => (
  <svg {...base} {...p}><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
);
export const IconWave = (p: P) => (
  <svg {...base} {...p}><path d="M3 12c2.5 0 2.5-4 5-4s2.5 8 5 8 2.5-8 5-8 2.5 4 3 4" /></svg>
);
export const IconArrowLeft = (p: P) => (
  <svg {...base} {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);
export const IconArrowRight = (p: P) => (
  <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconUser = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const IconShield = (p: P) => (
  <svg {...base} {...p}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
