import type {Cicada, EvidenceLevel, TimeSelection} from "./types";

type Segment = readonly [number, number];

const confidenceRank: Record<EvidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

export function parseClock(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function windowSegments(value: string): Segment[] {
  const [startText, endText] = value.split("-", 2);
  const start = parseClock(startText);
  const end = parseClock(endText);
  if (start === null || end === null || start === end) return [];
  return start < end
    ? [[start, end]]
    : [[start, 1440], [0, end]];
}

function containsMinute(window: string, minute: number): boolean {
  return windowSegments(window).some(
    ([start, end]) => start <= minute && minute < end,
  );
}

function windowsOverlap(left: string, right: string): boolean {
  return windowSegments(left).some(([leftStart, leftEnd]) =>
    windowSegments(right).some(
      ([rightStart, rightEnd]) =>
        leftStart < rightEnd && rightStart < leftEnd,
    ),
  );
}

function matchesTime(cicada: Cicada, selection: TimeSelection): boolean {
  if (selection.kind === "instant") {
    return cicada.callingWindows.some((window) =>
      containsMinute(window, selection.minute),
    );
  }
  return cicada.callingWindows.some((callingWindow) =>
    selection.windows.some((selectedWindow) =>
      windowsOverlap(callingWindow, selectedWindow),
    ),
  );
}

export function selectAutoCicadas(
  cicadas: Cicada[],
  targetMonths: number[],
  time: TimeSelection,
  maxTracks: number,
): Cicada[] {
  const months = new Set(targetMonths);
  return cicadas
    .filter(
      (cicada) =>
        cicada.enabled &&
        cicada.autoEligible &&
        cicada.activeMonths.some((month) => months.has(month)) &&
        matchesTime(cicada, time),
    )
    .sort(
      (left, right) =>
        right.autoPriority - left.autoPriority ||
        confidenceRank[right.evidenceLevel] -
          confidenceRank[left.evidenceLevel] ||
        left.displayOrder - right.displayOrder ||
        left.id.localeCompare(right.id),
    )
    .slice(0, maxTracks);
}

export function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

export function nextAlignedCheck(now: Date, intervalMinutes: number): Date {
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  const nextMinute =
    (Math.floor(minutesSinceMidnight / intervalMinutes) + 1) *
    intervalMinutes;
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    nextMinute,
    0,
    0,
  );
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
