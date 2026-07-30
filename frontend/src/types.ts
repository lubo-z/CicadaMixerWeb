export type EvidenceLevel = "high" | "medium" | "low" | "unknown";
export type SeasonId = "current" | "spring" | "summer" | "autumn" | "winter";
export type Mode = "manual" | "auto";

export interface Source {
  title: string;
  url: string;
  accessed: string;
}

export interface DayPeriod {
  id: string;
  labelZh: string;
  windows: string[];
}

export interface Media {
  id: string;
  url: string;
  contentType: string;
  fileName: string;
}

export interface Cicada {
  id: string;
  displayOrder: number;
  enabled: boolean;
  autoEligible: boolean;
  autoPriority: number;
  commonNameZh: string;
  scientificName: string;
  defaultGain: number;
  activeMonths: number[];
  peakMonths: number[];
  callingWindows: string[];
  evidenceLevel: EvidenceLevel;
  evidenceNote: string;
  sourceIds: string[];
  media: Media;
}

export interface Catalog {
  schemaVersion: number;
  catalogVersion: string;
  autoMix: {
    defaultTracks: number;
    minTracks: number;
    maxTracks: number;
  };
  liveRefresh: {
    defaultMinutes: number;
    minMinutes: number;
    maxMinutes: number;
    stepMinutes: number;
  };
  seasons: Record<Exclude<SeasonId, "current">, number[]>;
  dayPeriods: DayPeriod[];
  sources: Record<string, Source>;
  cicadas: Cicada[];
}

export type TimeSelection =
  | {kind: "instant"; minute: number}
  | {kind: "windows"; windows: string[]};
