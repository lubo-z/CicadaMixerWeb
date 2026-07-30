import {describe, expect, it} from "vitest";
import {
  nextAlignedCheck,
  parseClock,
  sameIds,
  selectAutoCicadas,
} from "./selection";
import type {Cicada} from "./types";

function cicada(overrides: Partial<Cicada>): Cicada {
  return {
    id: "sample",
    displayOrder: 10,
    enabled: true,
    autoEligible: true,
    autoPriority: 50,
    commonNameZh: "测试蝉",
    scientificName: "Cicada test",
    defaultGain: 0.5,
    activeMonths: [6],
    peakMonths: [],
    callingWindows: ["05:00-07:30"],
    evidenceLevel: "high",
    evidenceNote: "测试",
    sourceIds: [],
    media: {
      id: "sample",
      url: "/sample.mp4",
      contentType: "video/mp4",
      fileName: "sample.mp4",
    },
    ...overrides,
  };
}

describe("time parsing and selection", () => {
  it("parses strict HH:MM values", () => {
    expect(parseClock("00:00")).toBe(0);
    expect(parseClock("23:59")).toBe(1439);
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("7:30")).toBeNull();
  });

  it("uses left-closed right-open boundaries", () => {
    const item = cicada({});
    expect(selectAutoCicadas([item], [6], {kind: "instant", minute: 300}, 6))
      .toHaveLength(1);
    expect(selectAutoCicadas([item], [6], {kind: "instant", minute: 450}, 6))
      .toHaveLength(0);
  });

  it("supports cross-midnight windows", () => {
    const item = cicada({callingWindows: ["19:00-05:00"]});
    expect(selectAutoCicadas([item], [6], {kind: "instant", minute: 0}, 6))
      .toHaveLength(1);
    expect(selectAutoCicadas([item], [6], {kind: "instant", minute: 300}, 6))
      .toHaveLength(0);
  });

  it("matches fixed periods by overlap and sorts deterministically", () => {
    const items = [
      cicada({id: "low", autoPriority: 10}),
      cicada({id: "second", autoPriority: 80, displayOrder: 20}),
      cicada({id: "first", autoPriority: 80, displayOrder: 10}),
    ];
    const selected = selectAutoCicadas(
      items,
      [6, 7, 8],
      {kind: "windows", windows: ["06:00-12:00"]},
      2,
    );
    expect(selected.map(({id}) => id)).toEqual(["first", "second"]);
  });
});

describe("scheduler helpers", () => {
  it("aligns to the next half-hour and crosses midnight", () => {
    expect(nextAlignedCheck(new Date(2026, 6, 29, 10, 0), 30).getMinutes())
      .toBe(30);
    const next = nextAlignedCheck(new Date(2026, 6, 29, 23, 50), 30);
    expect(next.getDate()).toBe(30);
    expect(next.getHours()).toBe(0);
    expect(next.getMinutes()).toBe(0);
  });

  it("aligns configurable intervals to the local wall clock", () => {
    const next = nextAlignedCheck(new Date(2026, 6, 29, 10, 43), 45);
    expect(next.getHours()).toBe(11);
    expect(next.getMinutes()).toBe(15);
  });

  it("compares ID sets without depending on order", () => {
    expect(sameIds(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameIds(["a"], ["a", "b"])).toBe(false);
  });
});
