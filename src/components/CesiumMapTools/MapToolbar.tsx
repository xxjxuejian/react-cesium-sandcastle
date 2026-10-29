import { useEffect, useId, useRef, useState } from "react";
import { theme } from "antd";
import { useTranslation } from "react-i18next";
import { formatMeasurement } from "./measurement";
import type {
  BasemapControls,
  MapTool,
  MeasurementControls,
  MeasurementType,
} from "./types";
import "./MapToolbar.css";

/** 简单文字工具栏，通过回调调用地图逻辑，不在 UI 中创建 Cesium 资源。 */
interface MapToolbarProps {
  /** 当前地图的底图状态及切换方法。 */
  basemap: BasemapControls;
  /** 当前地图的测量状态及操作方法；省略时不显示测量入口、面板和结果。 */
  measurement?: MeasurementControls;
  /** 启用的工具；省略时显示所有已接入的能力，结果入口随测量工具显示。 */
  tools?: MapTool[];
  /** 自定义定位类名；省略时桌面靠右，窄屏在地图底部排列。 */
  className?: string;
}

/** 浏览面板：basemap 为底图，results 为结果，null 时显示正在进行的测量。 */
type MapPanel = "basemap" | "results" | null;
const DEFAULT_TOOLS: MapTool[] = ["basemap", "distance", "area"];

/** 一组文字按钮加一个小面板，跟随应用的浅色／深色主题。 */
export function MapToolbar({
  basemap,
  measurement,
  tools = DEFAULT_TOOLS,
  className,
}: MapToolbarProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [panel, setPanel] = useState<MapPanel>(null);
  const measuring = measurement != null && measurement.activeType !== null;
  const hasMeasurement =
    measurement != null &&
    (tools.includes("distance") || tools.includes("area"));
  // 浏览底图或结果时保留测量草稿，关闭后重新显示测量提示。
  const visiblePanel = panel ?? (measuring ? "measurement" : null);
  const surfaceStyle = {
    background: token.colorBgElevated,
    color: token.colorText,
    borderColor: token.colorBorder,
  };
  let panelTitle = t("mapTools.basemap");
  if (visiblePanel === "results") panelTitle = t("mapTools.results");
  else if (visiblePanel === "measurement") panelTitle = t("mapTools.measuring");

  useEffect(() => {
    if (!panel) return;
    function handleOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      )
        setPanel(null);
    }
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [panel]);

  function togglePanel(
    nextPanel: "basemap" | "results",
    trigger: HTMLButtonElement,
  ) {
    triggerRef.current = trigger;
    setPanel((previous) => (previous === nextPanel ? null : nextPanel));
  }

  function closePanel() {
    setPanel(null);
    triggerRef.current?.focus();
  }

  function startMeasurement(type: MeasurementType) {
    if (!measurement) return;
    setPanel(null);
    // 再点一次当前工具取消草稿，已经完成的结果继续保留。
    if (measurement.activeType === type) measurement.cancel();
    else measurement.start(type);
  }

  return (
    <div
      ref={rootRef}
      className={`map-tools ${className ?? "map-tools--positioned"}`}
      onKeyDown={(event) => {
        // 浏览面板关闭后归还焦点；测量中的 Esc 仍由测量 Hook 处理。
        if (event.key === "Escape" && panel) {
          event.stopPropagation();
          closePanel();
        }
      }}
    >
      <div
        className="map-tools-dock"
        style={surfaceStyle}
        role="toolbar"
        aria-label={t("mapTools.title")}
      >
        {tools.includes("basemap") ? (
          <button
            type="button"
            className="map-tools-tool"
            aria-expanded={panel === "basemap"}
            aria-controls={panelId}
            onClick={(event) => togglePanel("basemap", event.currentTarget)}
          >
            {t("mapTools.basemap")}
          </button>
        ) : null}
        {tools.includes("distance") && measurement ? (
          <button
            type="button"
            className="map-tools-tool"
            aria-pressed={measurement.activeType === "distance"}
            disabled={measurement.disabled}
            onClick={() => startMeasurement("distance")}
          >
            {t("mapTools.distance")}
          </button>
        ) : null}
        {tools.includes("area") && measurement ? (
          <button
            type="button"
            className="map-tools-tool"
            aria-pressed={measurement.activeType === "area"}
            disabled={measurement.disabled}
            onClick={() => startMeasurement("area")}
          >
            {t("mapTools.area")}
          </button>
        ) : null}
        {hasMeasurement && measurement ? (
          <button
            type="button"
            className="map-tools-tool"
            aria-label={`${t("mapTools.results")} (${measurement.results.length})`}
            aria-expanded={panel === "results"}
            aria-controls={panelId}
            onClick={(event) => togglePanel("results", event.currentTarget)}
          >
            {t("mapTools.resultsShort")} ({measurement.results.length})
          </button>
        ) : null}
      </div>

      {visiblePanel ? (
        <section
          id={panelId}
          className={`map-tools-panel map-tools-panel--${visiblePanel}`}
          style={surfaceStyle}
          aria-label={panelTitle}
        >
          <header className="map-tools-panel-header">
            <strong>{panelTitle}</strong>
            {panel ? (
              <button
                type="button"
                className="map-tools-link"
                onClick={closePanel}
              >
                {t("mapTools.closePanel")}
              </button>
            ) : null}
          </header>

          {visiblePanel === "basemap" ? (
            <div className="map-tools-panel-body">
              <fieldset>
                <legend>{t("mapTools.source")}</legend>
                <label>
                  <input
                    type="radio"
                    name={`${panelId}-source`}
                    checked={basemap.source === "osm"}
                    onChange={() => basemap.setSource("osm")}
                  />
                  OSM
                </label>
                <label>
                  <input
                    type="radio"
                    name={`${panelId}-source`}
                    checked={basemap.source === "tianditu"}
                    disabled={!basemap.hasTiandituKey}
                    onChange={() => basemap.setSource("tianditu")}
                  />
                  {t("mapTools.tianditu")}
                </label>
              </fieldset>
              <fieldset>
                <legend>{t("mapTools.layerType")}</legend>
                <label>
                  <input
                    type="radio"
                    name={`${panelId}-type`}
                    checked={basemap.type === "vector"}
                    onChange={() => basemap.setType("vector")}
                  />
                  {t("mapTools.vector")}
                </label>
                <label>
                  <input
                    type="radio"
                    name={`${panelId}-type`}
                    checked={basemap.type === "imagery"}
                    disabled={basemap.source === "osm"}
                    onChange={() => basemap.setType("imagery")}
                  />
                  {t("mapTools.imagery")}
                </label>
              </fieldset>
              {basemap.source === "osm" ? (
                <p className="map-tools-note">{t("mapTools.osmHint")}</p>
              ) : null}
              {!basemap.hasTiandituKey ? (
                <p className="map-tools-note">{t("mapTools.keyHint")}</p>
              ) : null}
            </div>
          ) : null}

          {visiblePanel === "measurement" && measurement?.activeType ? (
            <div className="map-tools-panel-body">
              <strong className="map-tools-value">
                {t(`mapTools.${measurement.activeType}`)} ·{" "}
                {formatMeasurement(measurement.value, measurement.activeType)}
              </strong>
              <p className="map-tools-note" aria-live="polite">
                {t("mapTools.vertices", { count: measurement.pointCount })}
              </p>
              <p className="map-tools-note">{t("mapTools.measureHint")}</p>
              <div className="map-tools-actions">
                <button
                  type="button"
                  className="map-tools-tool"
                  onClick={measurement.cancel}
                >
                  {t("mapTools.cancel")}
                </button>
                <button
                  type="button"
                  className="map-tools-tool"
                  disabled={!measurement.canFinish}
                  onClick={measurement.finish}
                >
                  {t("mapTools.finish")}
                </button>
              </div>
            </div>
          ) : null}

          {visiblePanel === "results" && measurement ? (
            <div className="map-tools-panel-body">
              {measurement.results.length === 0 ? (
                <p className="map-tools-note">{t("mapTools.empty")}</p>
              ) : (
                <>
                  <ul className="map-tools-result-list">
                    {measurement.results.map((result) => (
                      <li key={result.id}>
                        <span>
                          #{result.id} {t(`mapTools.${result.type}`)} ·{" "}
                          {formatMeasurement(result.value, result.type)}
                        </span>
                        <button
                          type="button"
                          className="map-tools-link"
                          aria-label={t("mapTools.deleteResult", {
                            id: result.id,
                          })}
                          onClick={() => measurement.removeResult(result.id)}
                        >
                          {t("mapTools.delete")}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="map-tools-link"
                    onClick={measurement.clearResults}
                  >
                    {t("mapTools.clear")}
                  </button>
                </>
              )}
            </div>
          ) : null}
          {measuring && panel ? (
            <button
              type="button"
              className="map-tools-link map-tools-return"
              onClick={() => setPanel(null)}
            >
              {t("mapTools.returnToMeasurement")}
            </button>
          ) : null}
        </section>
      ) : null}

      {/* 错误单独显示，避免收起面板后失去重试入口。 */}
      {basemap.hasError || measurement?.error ? (
        <div
          className="map-tools-notices"
          style={surfaceStyle}
          aria-live="polite"
        >
          {basemap.hasError ? (
            <div role="alert">
              {t("mapTools.basemapError")}{" "}
              <button
                type="button"
                className="map-tools-link"
                onClick={basemap.retry}
              >
                {t("mapTools.retry")}
              </button>
            </div>
          ) : null}
          {measurement?.error ? (
            <div role="alert">{t(`mapTools.errors.${measurement.error}`)}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
