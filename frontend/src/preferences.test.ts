import {beforeEach, describe, expect, it} from "vitest";
import {
  integerOptions,
  loadPreferences,
  PREFERENCES_KEY,
} from "./preferences";
import type {Catalog} from "./types";

const catalog = {
  autoMix: {defaultTracks: 6, minTracks: 1, maxTracks: 10},
  liveRefresh: {
    defaultMinutes: 30,
    minMinutes: 5,
    maxMinutes: 120,
    stepMinutes: 5,
  },
} as Catalog;

describe("browser preferences", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses defaults when storage is absent", () => {
    expect(loadPreferences(catalog)).toEqual({
      maxAutoTracks: 6,
      autoRefreshMinutes: 30,
    });
  });

  it("restores valid values", () => {
    window.localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        version: 1,
        maxAutoTracks: 9,
        autoRefreshMinutes: 45,
      }),
    );
    expect(loadPreferences(catalog)).toEqual({
      maxAutoTracks: 9,
      autoRefreshMinutes: 45,
    });
  });

  it("repairs damaged, out-of-range and misaligned values independently", () => {
    window.localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        version: 1,
        maxAutoTracks: 11,
        autoRefreshMinutes: 42,
      }),
    );
    expect(loadPreferences(catalog)).toEqual({
      maxAutoTracks: 6,
      autoRefreshMinutes: 30,
    });
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "{}"))
      .toEqual({
        version: 1,
        maxAutoTracks: 6,
        autoRefreshMinutes: 30,
      });
  });

  it("replaces malformed JSON with canonical defaults", () => {
    window.localStorage.setItem(PREFERENCES_KEY, "{not json");
    expect(loadPreferences(catalog)).toEqual({
      maxAutoTracks: 6,
      autoRefreshMinutes: 30,
    });
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "{}"))
      .toEqual({
        version: 1,
        maxAutoTracks: 6,
        autoRefreshMinutes: 30,
      });
  });

  it("generates only values allowed by range and step", () => {
    expect(integerOptions(1, 3)).toEqual([1, 2, 3]);
    expect(integerOptions(5, 20, 5)).toEqual([5, 10, 15, 20]);
  });
});
