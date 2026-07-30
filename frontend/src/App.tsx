import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {fetchCatalog} from "./api";
import {AudioMixer, type MixResult} from "./audioMixer";
import {
  integerOptions,
  loadPreferences,
  savePreferences,
  type UserPreferences,
} from "./preferences";
import {
  formatClock,
  nextAlignedCheck,
  parseClock,
  sameIds,
  selectAutoCicadas,
} from "./selection";
import type {
  Catalog,
  Cicada,
  Mode,
  SeasonId,
  TimeSelection,
} from "./types";

type StatusKind =
  | "stopped"
  | "preparing"
  | "playing"
  | "waiting"
  | "partial"
  | "error";

interface PlaybackStatus {
  kind: StatusKind;
  message: string;
}

const seasonLabels: Record<SeasonId, string> = {
  current: "当前月份",
  spring: "春季 · 3–5 月",
  summer: "夏季 · 6–8 月",
  autumn: "秋季 · 9–11 月",
  winter: "冬季 · 12–2 月",
};

function localTimeValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function evidenceLabel(level: Cicada["evidenceLevel"]): string {
  return {
    high: "高可信",
    medium: "中可信",
    low: "低可信",
    unknown: "资料未知",
  }[level];
}

function formatMonths(months: number[]): string {
  return months.length ? `${months.join("、")} 月` : "月份资料不足";
}

function formatWindows(windows: string[]): string {
  return windows.length ? windows.join("；") : "时段资料不足";
}

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("manual");
  const [season, setSeason] = useState<SeasonId>("current");
  const [periodId, setPeriodId] = useState("live");
  const [customTime, setCustomTime] = useState(() =>
    localTimeValue(new Date()),
  );
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [manualIds, setManualIds] = useState<Set<string>>(() => new Set());
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const activeIdsRef = useRef<string[]>([]);
  const [status, setStatus] = useState<PlaybackStatus>({
    kind: "stopped",
    message: "已停止",
  });
  const [now, setNow] = useState(() => new Date());
  const [liveSession, setLiveSession] = useState(false);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const mixerRef = useRef(new AudioMixer());

  const updateActiveIds = useCallback((ids: string[]) => {
    activeIdsRef.current = ids;
    setActiveIds(ids);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalog(controller.signal)
      .then((loadedCatalog) => {
        setPreferences(loadPreferences(loadedCatalog));
        setCatalog(loadedCatalog);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCatalogError(
          error instanceof Error ? error.message : "蝉鸣目录暂时不可用",
        );
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      mixerRef.current.stop();
    },
    [],
  );

  useEffect(() => {
    if (mode !== "auto" || periodId !== "live" || !autoRefresh) {
      setLiveSession(false);
      setNextUpdate(null);
    }
  }, [mode, periodId, autoRefresh]);

  const targetMonths = useCallback(
    (date: Date): number[] => {
      if (!catalog) return [];
      return season === "current"
        ? [date.getMonth() + 1]
        : catalog.seasons[season];
    },
    [catalog, season],
  );

  const timeSelection = useCallback(
    (date: Date): TimeSelection | null => {
      if (!catalog) return null;
      if (periodId === "live") {
        return {kind: "instant", minute: date.getHours() * 60 + date.getMinutes()};
      }
      if (periodId === "custom") {
        const minute = parseClock(customTime);
        return minute === null ? null : {kind: "instant", minute};
      }
      const period = catalog.dayPeriods.find(({id}) => id === periodId);
      return period ? {kind: "windows", windows: period.windows} : null;
    },
    [catalog, customTime, periodId],
  );

  const computeAutoSelection = useCallback(
    (date: Date): Cicada[] => {
      if (!catalog) return [];
      const time = timeSelection(date);
      if (!time) return [];
      return selectAutoCicadas(
        catalog.cicadas,
        targetMonths(date),
        time,
        preferences?.maxAutoTracks ?? catalog.autoMix.defaultTracks,
      );
    },
    [catalog, preferences?.maxAutoTracks, targetMonths, timeSelection],
  );

  const autoPreview = useMemo(
    () => computeAutoSelection(now),
    [computeAutoSelection, now],
  );
  const autoPreviewIds = useMemo(
    () => new Set(autoPreview.map(({id}) => id)),
    [autoPreview],
  );
  const timeSources = useMemo(() => {
    if (!catalog) return [];
    const sourceIds = new Set(
      catalog.cicadas
        .filter(({callingWindows}) => callingWindows.length > 0)
        .flatMap(({sourceIds: ids}) => ids),
    );
    return [...sourceIds]
      .flatMap((id) => {
        const source = catalog.sources[id];
        return source ? [{id, ...source}] : [];
      })
      .sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
  }, [catalog]);
  const customTimeValid =
    periodId !== "custom" || parseClock(customTime) !== null;

  const applyResult = useCallback(
    (result: MixResult, emptyStatus: StatusKind = "stopped") => {
      if (result.cancelled) return;
      if (!result.applied) {
        const names = result.failed.map(({commonNameZh}) => commonNameZh);
        setStatus({
          kind: "error",
          message: names.length
            ? `音轨无法播放：${names.join("、")}`
            : "音轨无法播放",
        });
        return;
      }
      updateActiveIds(result.playing.map(({id}) => id));
      if (!result.playing.length) {
        setStatus({
          kind: emptyStatus,
          message:
            emptyStatus === "waiting"
              ? "当前没有匹配的蝉种，等待下一次检查"
              : "已停止",
        });
      } else if (result.failed.length) {
        setStatus({
          kind: "partial",
          message: `正在播放 ${result.playing.length} 种；${result.failed
            .map(({commonNameZh}) => commonNameZh)
            .join("、")} 无法播放`,
        });
      } else {
        setStatus({
          kind: "playing",
          message: `正在播放 ${result.playing.length} 种蝉`,
        });
      }
    },
    [updateActiveIds],
  );

  const replaceTracks = useCallback(
    async (items: Cicada[], emptyStatus: StatusKind = "stopped") => {
      if (items.length) {
        setStatus({
          kind: "preparing",
          message: `正在准备 ${items.length} 条音轨……`,
        });
      }
      try {
        const result = await mixerRef.current.replace(items);
        applyResult(result, emptyStatus);
      } catch {
        setStatus({
          kind: "error",
          message: "浏览器无法准备音频，请再次点击播放",
        });
      }
    },
    [applyResult],
  );

  const applyAutoAt = useCallback(
    async (date: Date, scheduled: boolean) => {
      const selected = computeAutoSelection(date);
      const ids = selected.map(({id}) => id);
      if (scheduled && sameIds(ids, activeIdsRef.current)) return;
      if (!selected.length) {
        const result = await mixerRef.current.replace([]);
        if (result.cancelled) return;
        updateActiveIds([]);
        const waiting = periodId === "live" && autoRefresh;
        setStatus({
          kind: waiting ? "waiting" : "stopped",
          message: waiting
            ? "当前没有匹配的蝉种，等待下一次检查"
            : "当前没有匹配的蝉种",
        });
        return;
      }
      await replaceTracks(
        selected,
        periodId === "live" && autoRefresh ? "waiting" : "stopped",
      );
    },
    [
      autoRefresh,
      computeAutoSelection,
      periodId,
      replaceTracks,
      updateActiveIds,
    ],
  );

  useEffect(() => {
    if (!liveSession || !catalog || !preferences) return;
    let timer: number | undefined;
    let disposed = false;

    const schedule = () => {
      if (disposed) return;
      const next = nextAlignedCheck(
        new Date(),
        preferences.autoRefreshMinutes,
      );
      setNextUpdate(next);
      timer = window.setTimeout(async () => {
        await applyAutoAt(new Date(), true);
        schedule();
      }, Math.max(0, next.getTime() - Date.now()));
    };

    const onVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      if (timer !== undefined) window.clearTimeout(timer);
      setNow(new Date());
      await applyAutoAt(new Date(), true);
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [applyAutoAt, catalog, liveSession, preferences]);

  const handlePlay = async () => {
    if (!catalog) return;
    if (mode === "manual") {
      const selected = catalog.cicadas.filter(({id}) => manualIds.has(id));
      if (!selected.length) {
        setStatus({kind: "error", message: "请至少选择一种蝉"});
        return;
      }
      await replaceTracks(selected);
      return;
    }

    if (!customTimeValid) {
      setStatus({kind: "error", message: "请输入有效的 24 小时时间"});
      return;
    }
    const shouldRunLive = periodId === "live" && autoRefresh;
    setLiveSession(shouldRunLive);
    await applyAutoAt(new Date(), false);
  };

  const handleStop = () => {
    setLiveSession(false);
    setNextUpdate(null);
    mixerRef.current.stop();
    updateActiveIds([]);
    setStatus({kind: "stopped", message: "已停止"});
  };

  const toggleManual = (id: string) => {
    setManualIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updatePreference = (
    key: keyof UserPreferences,
    value: number,
  ) => {
    setPreferences((current) => {
      if (!current) return current;
      const next = {...current, [key]: value};
      savePreferences(next);
      return next;
    });
  };

  const manualPending =
    mode === "manual" &&
    activeIds.length > 0 &&
    !sameIds([...manualIds], activeIds);
  const selectedCount =
    mode === "manual" ? manualIds.size : autoPreview.length;

  if (catalogError) {
    return (
      <main className="fatal-shell">
        <section className="fatal-card">
          <span className="brand-mark" aria-hidden="true">CM</span>
          <p className="eyebrow">CicadaMixer</p>
          <h1>目录加载失败</h1>
          <p>{catalogError}</p>
          <button type="button" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </section>
      </main>
    );
  }

  if (!catalog || !preferences) {
    return (
      <main className="loading-shell" aria-live="polite">
        <span className="loader" aria-hidden="true" />
        <p>正在唤醒夏日声景……</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <nav className="topbar" aria-label="产品信息">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">CM</span>
            <span>CicadaMixer</span>
          </div>
          <div className="local-time">
            <span className="pulse-dot" aria-hidden="true" />
            本地时间 {formatClock(now)}
          </div>
        </nav>
        <div className="hero-copy">
          <p className="eyebrow">SUMMER SOUNDSCAPES</p>
          <h1>把夏天，<br /><em>调成你喜欢的声音。</em></h1>
          <p className="hero-description">
            自由叠加蝉鸣，或让季节与时间替你选择。
          </p>
        </div>
        <div className="hero-stats" aria-label="目录摘要">
          <div><strong>{catalog.cicadas.length}</strong><span>种蝉鸣</span></div>
          <div><strong>{preferences.maxAutoTracks}</strong><span>轨自动混音上限</span></div>
          <div><strong>{preferences.autoRefreshMinutes}</strong><span>分钟实时更新</span></div>
        </div>
      </header>

      <main className="workspace">
        <section className="control-panel" aria-labelledby="control-title">
          <div className="section-heading">
            <div>
              <p className="step-label">01 · 选择方式</p>
              <h2 id="control-title">构建你的声景</h2>
            </div>
            <div className="mode-switch" aria-label="播放模式">
              <button
                type="button"
                className={mode === "manual" ? "active" : ""}
                aria-pressed={mode === "manual"}
                onClick={() => setMode("manual")}
              >
                手动混音
              </button>
              <button
                type="button"
                className={mode === "auto" ? "active" : ""}
                aria-pressed={mode === "auto"}
                onClick={() => setMode("auto")}
              >
                时节自动
              </button>
            </div>
          </div>

          {mode === "manual" ? (
            <div className="mode-intro">
              <span className="intro-icon" aria-hidden="true">≋</span>
              <p>
                勾选一种或多种蝉。播放期间可以继续调整，
                再次点击“播放”才会应用新的组合。
              </p>
            </div>
          ) : (
            <div className="auto-controls">
              <label>
                <span>时节</span>
                <select
                  value={season}
                  onChange={(event) =>
                    setSeason(event.target.value as SeasonId)
                  }
                >
                  {Object.entries(seasonLabels).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>每日时段</span>
                <select
                  value={periodId}
                  onChange={(event) => setPeriodId(event.target.value)}
                >
                  <option value="live">实时 · 使用本地时间</option>
                  {catalog.dayPeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.labelZh} · {formatWindows(period.windows)}
                    </option>
                  ))}
                  <option value="custom">自定义时间</option>
                </select>
              </label>
              <label>
                <span>自动混音上限</span>
                <select
                  aria-label="自动混音上限"
                  value={preferences.maxAutoTracks}
                  onChange={(event) =>
                    updatePreference("maxAutoTracks", Number(event.target.value))
                  }
                >
                  {integerOptions(
                    catalog.autoMix.minTracks,
                    catalog.autoMix.maxTracks,
                  ).map((value) => (
                    <option key={value} value={value}>{value} 种</option>
                  ))}
                </select>
              </label>
              <label>
                <span>实时检查间隔</span>
                <select
                  aria-label="实时检查间隔"
                  value={preferences.autoRefreshMinutes}
                  onChange={(event) =>
                    updatePreference(
                      "autoRefreshMinutes",
                      Number(event.target.value),
                    )
                  }
                >
                  {integerOptions(
                    catalog.liveRefresh.minMinutes,
                    catalog.liveRefresh.maxMinutes,
                    catalog.liveRefresh.stepMinutes,
                  ).map((value) => (
                    <option key={value} value={value}>{value} 分钟</option>
                  ))}
                </select>
              </label>
              {periodId === "custom" && (
                <label>
                  <span>具体时间</span>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(event) => setCustomTime(event.target.value)}
                    aria-invalid={!customTimeValid}
                  />
                  {!customTimeValid && (
                    <small className="field-error">请输入有效的 HH:MM 时间</small>
                  )}
                </label>
              )}
              {periodId === "live" && (
                <label className="refresh-toggle">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(event) => setAutoRefresh(event.target.checked)}
                  />
                  <span className="toggle-track" aria-hidden="true" />
                  <span>
                    自动更新
                    <small>
                      每 {preferences.autoRefreshMinutes} 分钟，与本地时钟对齐
                    </small>
                  </span>
                </label>
              )}
            </div>
          )}
        </section>

        <section className="catalog-panel" aria-labelledby="catalog-title">
          <div className="section-heading catalog-heading">
            <div>
              <p className="step-label">02 · 声音目录</p>
              <h2 id="catalog-title">
                {mode === "manual" ? "选择蝉鸣" : "自动组合预览"}
              </h2>
            </div>
            <div className="catalog-actions">
              <span className="selection-count">{selectedCount} 已选择</span>
              {mode === "manual" && (
                <button
                  type="button"
                  className="clear-selection"
                  onClick={() => setManualIds(new Set())}
                  disabled={!manualIds.size}
                >
                  清空已选
                </button>
              )}
            </div>
          </div>

          <div className="cicada-grid">
            {catalog.cicadas.map((cicada) => {
              const checked =
                mode === "manual"
                  ? manualIds.has(cicada.id)
                  : autoPreviewIds.has(cicada.id);
              return (
                <article
                  key={cicada.id}
                  className={`cicada-card ${checked ? "selected" : ""}`}
                >
                  <label className="cicada-select">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={mode === "auto"}
                      onChange={() => toggleManual(cicada.id)}
                    />
                    <span className="checkmark" aria-hidden="true">✓</span>
                    <span className="cicada-name">
                      <strong>{cicada.commonNameZh}</strong>
                      <em>{cicada.scientificName}</em>
                    </span>
                  </label>
                  <div className="cicada-meta">
                    <span>{formatMonths(cicada.activeMonths)}</span>
                    <span>{formatWindows(cicada.callingWindows)}</span>
                  </div>
                  <details className="cicada-details">
                    <summary title={`查看 ${cicada.commonNameZh} 资料`}>
                      资料说明
                      <span className={`evidence ${cicada.evidenceLevel}`}>
                        {evidenceLabel(cicada.evidenceLevel)}
                      </span>
                    </summary>
                    <p>{cicada.evidenceNote}</p>
                    <p className="file-name">媒体：{cicada.media.fileName}</p>
                    {!!cicada.sourceIds.length && (
                      <div className="source-links">
                        {cicada.sourceIds.map((sourceId) => {
                          const source = catalog.sources[sourceId];
                          return source ? (
                            <a
                              key={sourceId}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {source.title}
                            </a>
                          ) : null;
                        })}
                      </div>
                    )}
                  </details>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer
        className="research-footer"
        aria-labelledby="research-sources-title"
      >
        <div className="research-footer-inner">
          <div className="research-footer-copy">
            <p className="step-label">资料与依据</p>
            <h2 id="research-sources-title">蝉鸣时段信息来源</h2>
            <p>
              活动月份与鸣叫时段来自以下资料。实际活动仍会受到地点、
              天气、温度与个体差异影响。
            </p>
          </div>
          <nav className="research-source-links" aria-label="蝉鸣时段资料来源">
            {timeSources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{source.title}</span>
                <small>查阅来源 ↗</small>
              </a>
            ))}
          </nav>
        </div>
      </footer>

      <div className="player-bar">
        <div className="player-inner">
          <div
            className={`playback-status ${status.kind}`}
            role="status"
            aria-live="polite"
          >
            <span className="status-orb" aria-hidden="true" />
            <div>
              <strong>{status.message}</strong>
              {manualPending && (
                <span>选择已更改，点击播放以应用</span>
              )}
              {liveSession && nextUpdate && (
                <span>下一次检查：{formatClock(nextUpdate)}</span>
              )}
            </div>
          </div>
          <div className="transport">
            <button
              type="button"
              className="stop-button"
              onClick={handleStop}
              disabled={!activeIds.length && !liveSession && status.kind !== "preparing"}
            >
              <span aria-hidden="true">■</span>
              停止
            </button>
            <button
              type="button"
              className="play-button"
              onClick={handlePlay}
              disabled={status.kind === "preparing"}
            >
              <span aria-hidden="true">▶</span>
              {activeIds.length ? "应用并播放" : "播放"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
