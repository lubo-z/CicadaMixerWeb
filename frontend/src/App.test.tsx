import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import App from "./App";
import type {Catalog} from "./types";

const catalog: Catalog = {
  schemaVersion: 2,
  catalogVersion: "sha256:test",
  autoMix: {
    defaultTracks: 6,
    minTracks: 1,
    maxTracks: 10,
  },
  liveRefresh: {
    defaultMinutes: 30,
    minMinutes: 5,
    maxMinutes: 120,
    stepMinutes: 5,
  },
  seasons: {
    spring: [3, 4, 5],
    summer: [6, 7, 8],
    autumn: [9, 10, 11],
    winter: [12, 1, 2],
  },
  dayPeriods: [
    {id: "dawn", labelZh: "黎明", windows: ["05:00-07:30"]},
  ],
  sources: {},
  cicadas: [
    {
      id: "sample",
      displayOrder: 10,
      enabled: true,
      autoEligible: true,
      autoPriority: 50,
      commonNameZh: "测试蝉",
      scientificName: "Cicada test",
      defaultGain: 0.5,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      peakMonths: [],
      callingWindows: ["00:01-23:59"],
      evidenceLevel: "high",
      evidenceNote: "测试资料",
      sourceIds: [],
      media: {
        id: "sample",
        url: "/api/v1/media/sample",
        contentType: "video/mp4",
        fileName: "sample.mp4",
      },
    },
  ],
};

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(catalog), {
          status: 200,
          headers: {"Content-Type": "application/json"},
        }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads the catalog and rejects an empty manual selection", async () => {
    render(<App />);
    expect(await screen.findByText("选择蝉鸣")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "播放"}));
    expect(screen.getByText("请至少选择一种蝉")).toBeInTheDocument();
  });

  it("shows a read-only automatic preview", async () => {
    render(<App />);
    await screen.findByText("选择蝉鸣");
    fireEvent.click(screen.getByRole("button", {name: "时节自动"}));
    expect(screen.getByText("自动组合预览")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: /测试蝉/})).toBeDisabled();
  });

  it("clears only the manual candidate selection", async () => {
    render(<App />);
    await screen.findByText("选择蝉鸣");
    const checkbox = screen.getByRole("checkbox", {name: /测试蝉/});
    const clear = screen.getByRole("button", {name: "清空已选"});

    expect(clear).toBeDisabled();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(clear).toBeEnabled();
    fireEvent.click(clear);
    expect(checkbox).not.toBeChecked();
    expect(clear).toBeDisabled();
  });

  it("updates and persists browser-level preferences", async () => {
    render(<App />);
    await screen.findByText("选择蝉鸣");
    fireEvent.click(screen.getByRole("button", {name: "时节自动"}));

    fireEvent.change(screen.getByLabelText("自动混音上限"), {
      target: {value: "3"},
    });
    fireEvent.change(screen.getByLabelText("实时检查间隔"), {
      target: {value: "45"},
    });

    expect(window.localStorage.getItem("cicadaMixer.preferences.v1"))
      .toContain('"maxAutoTracks":3');
    expect(window.localStorage.getItem("cicadaMixer.preferences.v1"))
      .toContain('"autoRefreshMinutes":45');
  });
});
