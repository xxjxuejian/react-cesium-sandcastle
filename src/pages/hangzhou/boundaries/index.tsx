import { useMemo, useRef, useState } from "react";
import { Alert } from "antd";
import {
  ArcType,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  GeoJsonDataSource,
  HeightReference,
  LabelStyle,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Terrain,
} from "cesium";
import type { Cartesian2, Entity, Viewer } from "cesium";

import { CesiumMap, useCesiumEffect } from "@/components/CesiumMap";

type Position = [longitude: number, latitude: number];

type RegionGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    properties: {
      adcode: number;
      name: string;
      level: "city" | "district";
      labelPoint: Position;
    };
    geometry: { type: "MultiPolygon"; coordinates: Position[][][] };
  }>;
};

type BoundaryGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    properties:
      | { kind: "outer"; cityAdcode: number }
      | { kind: "inner"; districtAdcodes: [number, number] };
    geometry: { type: "MultiLineString"; coordinates: Position[][] };
  }>;
};

type LoadState =
  | { status: "loading" }
  | { status: "success"; districts: number; innerGroups: number }
  | { status: "error"; message: string };

type RegionSummary = { adcode: number; name: string };
type PickableRegion = RegionSummary & { polygonEntity: Entity };
type DrillActions = { enter: (adcode: number) => void; back: () => void };

const DEFAULT_FILL = Color.ROYALBLUE.withAlpha(0.7);
const HOVER_FILL = Color.CYAN.withAlpha(0.75);
const SELECTED_FILL = Color.ORANGE.withAlpha(0.8);

/** 用派生线数据分别绘制金色市界和红色区界；区县面仍负责填充与选中。 */
function BoundaryScene() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedRegion, setSelectedRegion] = useState<RegionSummary | null>(
    null,
  );
  const [drilledRegion, setDrilledRegion] = useState<RegionSummary | null>(
    null,
  );
  const drillActions = useRef<DrillActions | null>(null);

  useCesiumEffect((viewer) => {
    const controller = new AbortController();
    let active = true;
    let dataSource: GeoJsonDataSource | null = null;
    let interactionHandler: ScreenSpaceEventHandler | null = null;
    const boundaries: Entity[] = [];
    const labels: Entity[] = [];
    const pickableRegions = new Map<Entity, PickableRegion>();
    const districtViews = new Map<number, Rectangle>();
    let hoveredRegion: PickableRegion | null = null;
    let selectedRegionInScene: PickableRegion | null = null;

    function applyRegionStyle(region: PickableRegion) {
      if (!region.polygonEntity.polygon) return;
      const color =
        selectedRegionInScene?.adcode === region.adcode
          ? SELECTED_FILL
          : hoveredRegion?.adcode === region.adcode
            ? HOVER_FILL
            : DEFAULT_FILL;
      region.polygonEntity.polygon.material = new ColorMaterialProperty(color);
    }

    /** 共享区界属于两个区县，不映射到任意一侧；只有面和标签可选中。 */
    function pickRegion(position: Cartesian2) {
      const picked = viewer.scene.pick(position) as { id?: Entity } | undefined;
      return picked?.id ? (pickableRegions.get(picked.id) ?? null) : null;
    }

    async function loadScene() {
      try {
        const base = `${import.meta.env.BASE_URL}geojson/`;
        const [regionResponse, boundaryResponse] = await Promise.all([
          fetch(`${base}hangzhou.wgs84.geojson`, { signal: controller.signal }),
          fetch(`${base}hangzhou.boundaries.wgs84.geojson`, {
            signal: controller.signal,
          }),
        ]);
        if (!regionResponse.ok || !boundaryResponse.ok) {
          throw new Error(
            `GeoJSON 请求失败（行政区 ${regionResponse.status}，边界 ${boundaryResponse.status}）`,
          );
        }

        const [regionData, boundaryData] = (await Promise.all([
          regionResponse.json(),
          boundaryResponse.json(),
        ])) as [RegionGeoJson, BoundaryGeoJson];
        if (
          regionData.type !== "FeatureCollection" ||
          !Array.isArray(regionData.features) ||
          boundaryData.type !== "FeatureCollection" ||
          !Array.isArray(boundaryData.features)
        ) {
          throw new Error("行政区或边界文件不是 FeatureCollection");
        }

        const districts = regionData.features.filter(
          (feature) => feature.properties.level === "district",
        );
        const outer = boundaryData.features.filter(
          (feature) => feature.properties.kind === "outer",
        );
        const inner = boundaryData.features.filter(
          (feature) => feature.properties.kind === "inner",
        );
        if (
          districts.length !== 13 ||
          outer.length !== 1 ||
          inner.length === 0
        ) {
          throw new Error("行政区或派生边界数量不符合预期");
        }

        // 市级面不进入 DataSource；区县面的贴地轮廓由下方派生线统一绘制。
        const regions = await GeoJsonDataSource.load(
          { ...regionData, features: districts },
          { fill: DEFAULT_FILL, clampToGround: true },
        );
        if (!active) return;

        dataSource = regions;
        await viewer.dataSources.add(regions);
        if (!active) {
          if (!viewer.isDestroyed()) viewer.dataSources.remove(regions, true);
          return;
        }

        // 外缘和内部界线来自同一套区县面，每段线只出现一次。
        for (const feature of boundaryData.features) {
          const isOuter = feature.properties.kind === "outer";
          if (feature.geometry.type !== "MultiLineString") {
            throw new Error(`${feature.id} 不是 MultiLineString`);
          }
          feature.geometry.coordinates.forEach((line, lineIndex) => {
            if (line.length < 2) throw new Error(`${feature.id} 缺少线段坐标`);
            const degrees = line.flatMap(([longitude, latitude]) => [
              longitude,
              latitude,
            ]);
            boundaries.push(
              viewer.entities.add({
                id: `${feature.id}-${lineIndex}`,
                polyline: {
                  positions: Cartesian3.fromDegreesArray(degrees),
                  width: isOuter ? 4 : 3,
                  material: isOuter ? Color.GOLD : Color.CRIMSON,
                  arcType: ArcType.RHUMB,
                  clampToGround: true,
                  zIndex: isOuter ? 2 : 1,
                },
              }),
            );
          });
        }

        for (const feature of districts) {
          const { adcode, name, labelPoint } = feature.properties;
          const polygonEntity = regions.entities.getById(feature.id);
          if (!polygonEntity?.polygon) {
            throw new Error(`${name} 缺少对应的区县面`);
          }

          // 用完整面几何取景；labelPoint 只负责文字位置，不能保证覆盖整个区县。
          let west = Infinity;
          let south = Infinity;
          let east = -Infinity;
          let north = -Infinity;
          for (const [longitude, latitude] of feature.geometry.coordinates.flat(
            2,
          )) {
            west = Math.min(west, longitude);
            south = Math.min(south, latitude);
            east = Math.max(east, longitude);
            north = Math.max(north, latitude);
          }
          if (![west, south, east, north].every(Number.isFinite)) {
            throw new Error(`${name} 缺少有效的区县坐标`);
          }
          const longitudePadding = (east - west) * 0.12;
          const latitudePadding = (north - south) * 0.12;
          districtViews.set(
            adcode,
            Rectangle.fromDegrees(
              west - longitudePadding,
              south - latitudePadding,
              east + longitudePadding,
              north + latitudePadding,
            ),
          );
          const region = { adcode, name, polygonEntity };
          pickableRegions.set(polygonEntity, region);

          const label = viewer.entities.add({
            id: `hangzhou-boundary-label-${adcode}`,
            position: Cartesian3.fromDegrees(labelPoint[0], labelPoint[1]),
            label: {
              text: name,
              font: "14px sans-serif",
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 3,
              style: LabelStyle.FILL_AND_OUTLINE,
              heightReference: HeightReference.CLAMP_TO_GROUND,
            },
          });
          labels.push(label);
          pickableRegions.set(label, region);
        }

        interactionHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        interactionHandler.setInputAction(
          (movement: ScreenSpaceEventHandler.MotionEvent) => {
            const nextHovered = pickRegion(movement.endPosition);
            if (nextHovered?.adcode === hoveredRegion?.adcode) return;
            const previousHovered = hoveredRegion;
            hoveredRegion = nextHovered;
            if (previousHovered) applyRegionStyle(previousHovered);
            if (hoveredRegion) applyRegionStyle(hoveredRegion);
            viewer.scene.canvas.style.cursor = hoveredRegion ? "pointer" : "";
            viewer.scene.requestRender();
          },
          ScreenSpaceEventType.MOUSE_MOVE,
        );
        interactionHandler.setInputAction(
          (event: ScreenSpaceEventHandler.PositionedEvent) => {
            const nextSelected = pickRegion(event.position);
            const previousSelected = selectedRegionInScene;
            selectedRegionInScene = nextSelected;
            if (previousSelected) applyRegionStyle(previousSelected);
            if (nextSelected) applyRegionStyle(nextSelected);
            setSelectedRegion(
              nextSelected
                ? { adcode: nextSelected.adcode, name: nextSelected.name }
                : null,
            );
            viewer.scene.requestRender();
          },
          ScreenSpaceEventType.LEFT_CLICK,
        );

        setLoadState({
          status: "success",
          districts: districts.length,
          innerGroups: inner.length,
        });
        drillActions.current = {
          enter(adcode) {
            if (!active || selectedRegionInScene?.adcode !== adcode) return;
            const destination = districtViews.get(adcode);
            if (!destination) return;
            viewer.camera.cancelFlight();
            setDrilledRegion({
              adcode: selectedRegionInScene.adcode,
              name: selectedRegionInScene.name,
            });
            viewer.camera.flyTo({ destination, duration: 1.5 });
          },
          back() {
            if (!active) return;
            viewer.camera.cancelFlight();
            setDrilledRegion(null);
            const previousSelected = selectedRegionInScene;
            selectedRegionInScene = null;
            setSelectedRegion(null);
            if (previousSelected) applyRegionStyle(previousSelected);
            viewer.scene.requestRender();
            void viewer.flyTo(regions, { duration: 1.5 });
          },
        };
        void viewer.flyTo(regions, { duration: 1.5 });
      } catch (reason) {
        if (!active) return;
        setLoadState({
          status: "error",
          message: reason instanceof Error ? reason.message : "未知加载错误",
        });
      }
    }

    void loadScene();

    return () => {
      active = false;
      drillActions.current = null;
      controller.abort();
      interactionHandler?.destroy();
      viewer.scene.canvas.style.cursor = "";
      viewer.camera.cancelFlight();
      for (const boundary of boundaries) viewer.entities.remove(boundary);
      for (const label of labels) viewer.entities.remove(label);
      if (dataSource) viewer.dataSources.remove(dataSource, true);
    };
  }, []);

  return (
    <>
      <div className="absolute left-4 top-4 z-10 max-w-sm" aria-live="polite">
        {loadState.status === "error" ? (
          <Alert
            showIcon
            type="error"
            title="杭州边界加载失败"
            description={loadState.message}
          />
        ) : (
          <div className="rounded-md bg-[#06111f]/90 px-4 py-3 text-sm text-white shadow-lg">
            <div className="font-medium">杭州边界分层</div>
            {drilledRegion ? (
              <nav
                className="mt-2 text-xs text-slate-200"
                aria-label="区域面包屑"
              >
                <button
                  type="button"
                  className="text-amber-300 underline underline-offset-2 hover:text-amber-200"
                  onClick={() => drillActions.current?.back()}
                >
                  杭州市
                </button>
                <span aria-hidden="true"> / </span>
                <span aria-current="page">{drilledRegion.name}</span>
              </nav>
            ) : null}
            <div className="mt-1 text-slate-300">
              {loadState.status === "loading"
                ? "正在加载行政区与边界线…"
                : `${loadState.districts} 个区县 · ${loadState.innerGroups} 组内部区界`}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-200">
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-5 bg-[#ffd700]" />
                全市外缘
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-5 bg-[#dc143c]" />
                区县界线
              </span>
            </div>
          </div>
        )}
      </div>

      {selectedRegion ? (
        <aside className="pointer-events-none absolute right-4 top-4 z-10 w-56 rounded-md bg-[#06111f]/90 p-4 text-white shadow-lg">
          <div className="text-xs text-slate-400">当前选中区县</div>
          <div className="mt-2 text-lg font-semibold">
            {selectedRegion.name}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            行政编码：{selectedRegion.adcode}
          </div>
          <div className="mt-3 text-xs text-slate-400">
            共享界线不自动归属某一侧区县
          </div>
          <button
            type="button"
            className="pointer-events-auto mt-4 rounded bg-amber-400 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-amber-300"
            onClick={() => drillActions.current?.enter(selectedRegion.adcode)}
          >
            进入区县
          </button>
        </aside>
      ) : null}
    </>
  );
}

export default function HangzhouBoundariesPage() {
  // 保持 options 引用稳定，避免普通 React 重渲染时重建 Viewer。
  const viewerOptions = useMemo<Viewer.ConstructorOptions>(
    () => ({ terrain: Terrain.fromWorldTerrain() }),
    [],
  );

  return (
    <section className="relative h-[calc(100vh-7.5rem)] min-h-[28rem] overflow-hidden rounded-md bg-[#06111f]">
      <CesiumMap className="h-full w-full" options={viewerOptions}>
        <BoundaryScene />
      </CesiumMap>
    </section>
  );
}
