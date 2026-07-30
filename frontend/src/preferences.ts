import type {Catalog} from "./types";

export const PREFERENCES_KEY = "cicadaMixer.preferences.v1";

export interface UserPreferences {
  maxAutoTracks: number;
  autoRefreshMinutes: number;
}

interface StoredPreferences extends UserPreferences {
  version: 1;
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    (value as number) >= minimum &&
    (value as number) <= maximum
  );
}

function defaults(catalog: Catalog): UserPreferences {
  return {
    maxAutoTracks: catalog.autoMix.defaultTracks,
    autoRefreshMinutes: catalog.liveRefresh.defaultMinutes,
  };
}

export function savePreferences(
  preferences: UserPreferences,
  storage: Storage = window.localStorage,
): void {
  const value: StoredPreferences = {version: 1, ...preferences};
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(value));
  } catch {
    // localStorage may be unavailable; in-memory state still works.
  }
}

export function loadPreferences(
  catalog: Catalog,
  storage: Storage = window.localStorage,
): UserPreferences {
  const fallback = defaults(catalog);
  let candidate: Partial<StoredPreferences> = {};
  let raw: string | null;

  try {
    raw = storage.getItem(PREFERENCES_KEY);
  } catch {
    return fallback;
  }

  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        (parsed as {version?: unknown}).version === 1
      ) {
        candidate = parsed as Partial<StoredPreferences>;
      }
    } catch {
      // A damaged value is normalized to current Catalog defaults below.
    }
  }

  const maxAutoTracks = isIntegerInRange(
    candidate.maxAutoTracks,
    catalog.autoMix.minTracks,
    catalog.autoMix.maxTracks,
  )
    ? candidate.maxAutoTracks as number
    : fallback.maxAutoTracks;

  const refreshCandidate = candidate.autoRefreshMinutes;
  const refreshValid =
    isIntegerInRange(
      refreshCandidate,
      catalog.liveRefresh.minMinutes,
      catalog.liveRefresh.maxMinutes,
    ) &&
    ((refreshCandidate as number) - catalog.liveRefresh.minMinutes) %
      catalog.liveRefresh.stepMinutes ===
      0;
  const preferences = {
    maxAutoTracks,
    autoRefreshMinutes: refreshValid
      ? refreshCandidate as number
      : fallback.autoRefreshMinutes,
  };
  savePreferences(preferences, storage);
  return preferences;
}

export function integerOptions(
  minimum: number,
  maximum: number,
  step = 1,
): number[] {
  const values: number[] = [];
  for (let value = minimum; value <= maximum; value += step) {
    values.push(value);
  }
  return values;
}
