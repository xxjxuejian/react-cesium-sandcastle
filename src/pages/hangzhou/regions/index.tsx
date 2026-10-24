import { useMemo, useState } from "react";
import { Alert } from "antd";
import {
  ArcType,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  GeoJsonDataSource,
  HeightReference,
  LabelStyle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "cesium";
import { Terrain } from "cesium";
import type { Cartesian2, Entity, Viewer } from "cesium";

import { CesiumMap, useCesiumEffect } from "@/components/CesiumMap";

/** GeoJSON 中的二维坐标，依次为 WGS84 经度和纬度。 */
type GeoJsonPosition = [longitude: number, latitude: number];

/** 只描述当前页面实际读取的 GeoJSON 字段，避免引入完整 GeoJSON 类型。 */
type RegionGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: {
      type: "MultiPolygon";
      coordinates: GeoJsonPosition[][][];
    };
    properties: {
      adcode: number;
      name: string;
      level: "city" | "district";
      parentAdcode: number | null;
      labelPoint: GeoJsonPosition;
    };
  }>;
};

/** 驱动左上角加载提示的三种页面状态。 */
type LoadState =
  | { status: "loading" }
  | { status: "success"; count: number }
  | { status: "error"; message: string };

/** 详情面板需要展示的区县基本信息。 */
type RegionSummary = {
  adcode: number;
  name: string;
};

/** Cesium 拾取结果对应的区县信息。 */
type PickableRegion = RegionSummary & {
  /** GeoJsonDataSource 创建的区县面，用于统一更新填充样式。 */
  polygonEntity: Entity;
};

// 三种状态颜色集中在这里配置，alpha 越小，底图和地形越清晰可见。
const DEFAULT_REGION_FILL = Color.ROYALBLUE.withAlpha(0.7);
const HOVER_REGION_FILL = Color.CYAN.withAlpha(0.75);
const SELECTED_REGION_FILL = Color.ORANGE.withAlpha(0.8);

/** 加载区县场景，并管理本页创建的 Cesium 资源和鼠标交互。 */
function RegionsScene() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  // React 只保存面板需要的普通数据，Cesium Entity 保留在 Effect 内部管理。
  const [selectedRegion, setSelectedRegion] = useState<RegionSummary | null>(
    null,
  );

  // 空依赖数组表示场景资源只随当前 Viewer 生命周期创建和清理一次。
  useCesiumEffect((viewer) => {
    // controller 终止网络请求，active 防止异步任务在页面卸载后继续操作 Viewer。
    const controller = new AbortController();
    let active = true;

    // 记录本页创建的 Cesium 资源，供卸载清理使用。
    let dataSource: GeoJsonDataSource | null = null;
    let interactionHandler: ScreenSpaceEventHandler | null = null;
    const labels: Entity[] = [];
    const boundaries: Entity[] = [];

    // 面、边界和标签都映射到同一个区县，因此三类对象具有一致的拾取结果。
    const pickableRegions = new Map<Entity, PickableRegion>();
    let hoveredRegion: PickableRegion | null = null;
    let selectedRegionInScene: PickableRegion | null = null;

    /** 根据选中、悬停、默认的优先级更新一个区县的填充色。 */
    function applyRegionStyle(region: PickableRegion) {
      if (!region.polygonEntity.polygon) return;

      const color =
        selectedRegionInScene?.adcode === region.adcode
          ? SELECTED_REGION_FILL
          : hoveredRegion?.adcode === region.adcode
            ? HOVER_REGION_FILL
            : DEFAULT_REGION_FILL;

      region.polygonEntity.polygon.material = new ColorMaterialProperty(color);
    }

    /** 将屏幕坐标下拾取到的 Cesium Entity 转换为本页的区县记录。 */
    function pickRegion(position: Cartesian2) {
      const picked = viewer.scene.pick(position) as { id?: Entity } | undefined;
      return picked?.id ? (pickableRegions.get(picked.id) ?? null) : null;
    }

    /** 加载 GeoJSON，创建区县面、贴地边界、标签及鼠标事件。 */
    async function loadRegions() {
      try {
        // public 资源需拼接 Vite base，才能在 GitHub Pages 子路径下正确访问。
        const url = `${import.meta.env.BASE_URL}geojson/hangzhou.wgs84.geojson`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`GeoJSON 请求失败（HTTP ${response.status}）`);
        }

        const geojson = (await response.json()) as RegionGeoJson;
        if (
          geojson.type !== "FeatureCollection" ||
          !Array.isArray(geojson.features)
        ) {
          throw new Error("GeoJSON 缺少区县要素");
        }
        // 只取区县；完整区县环线自身已包含全市外缘，不叠画独立市级边界。
        const districts = geojson.features.filter(
          (feature) => feature.properties.level === "district",
        );
        if (districts.length === 0) {
          throw new Error("GeoJSON 缺少区县要素");
        }

        // 市级面不交给 DataSource，避免覆盖区县填充及鼠标拾取。
        const regions = await GeoJsonDataSource.load(
          { ...geojson, features: districts },
          {
            // 贴地 Polygon 的轮廓不保证显示，真正可见的区界由下方独立 Polyline 绘制。
            // stroke: Color.FUCHSIA,
            // strokeWidth: 2,
            // 区县默认填充色；悬停和选中时会在 applyRegionStyle 中替换。
            fill: DEFAULT_REGION_FILL,
            // 将区县面贴到地形表面；关闭后会按椭球高度零绘制。
            clampToGround: true,
          },
        );

        // GeoJsonDataSource.load 可能晚于页面卸载完成，此时不能访问旧 Viewer。
        if (!active) return;

        dataSource = regions;
        await viewer.dataSources.add(regions);
        if (!active) {
          // add() 即使接收现成 DataSource 也会异步提交，卸载后需再次移除。
          if (!viewer.isDestroyed()) viewer.dataSources.remove(regions, true);
          return;
        }

        for (const feature of districts) {
          const { adcode, name, labelPoint } = feature.properties;
          // 标准 GeoJSON 的 Feature.id 会成为 Cesium Entity.id。
          const polygonEntity = regions.entities.getById(feature.id);
          if (!polygonEntity?.polygon) {
            throw new Error(`${name} 缺少对应的区县面`);
          }
          const region = { adcode, name, polygonEntity };
          pickableRegions.set(polygonEntity, region);

          // 贴地 Polygon 的 outline 不可靠；完整环线同时画出区县界和全市外缘。
          feature.geometry.coordinates.forEach((polygon, polygonIndex) => {
            polygon.forEach((ring, ringIndex) => {
              const degrees = ring.flatMap(([longitude, latitude]) => [
                longitude,
                latitude,
              ]);
              // console.log("degrees", degrees);

              const boundary = viewer.entities.add({
                id: `hangzhou-region-boundary-${adcode}-${polygonIndex}-${ringIndex}`,
                polyline: {
                  positions: Cartesian3.fromDegreesArray(degrees),
                  // width 单位为屏幕像素；material 控制实际可见的区界颜色。
                  width: 3,
                  material: Color.CRIMSON,
                  // RHUMB 按等航线连接坐标点，适合忠实连接原始边界顶点。
                  arcType: ArcType.RHUMB,
                  // 边界必须与区县面一样贴地，才能跟随 World Terrain 起伏。
                  clampToGround: true,
                  // zIndex 只用于调整贴地几何之间的绘制顺序。
                  zIndex: 1,
                },
              });

              boundaries.push(boundary);
              pickableRegions.set(boundary, region);
            });
          });

          const label = viewer.entities.add({
            id: `hangzhou-region-label-${adcode}`,
            position: Cartesian3.fromDegrees(labelPoint[0], labelPoint[1]),
            label: {
              text: name,
              font: "14px sans-serif",
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 3,
              style: LabelStyle.FILL_AND_OUTLINE,
              // 标签锚点贴到地形，避免固定在椭球表面后被山体遮挡。
              heightReference: HeightReference.CLAMP_TO_GROUND,
            },
          });

          labels.push(label);
          pickableRegions.set(label, region);
        }

        // 一个事件处理器集中管理本页交互，卸载时统一销毁。
        interactionHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);

        // 鼠标移动只在区县发生变化时更新样式，减少重复材质赋值。
        interactionHandler.setInputAction(
          (movement: ScreenSpaceEventHandler.MotionEvent) => {
            const nextHoveredRegion = pickRegion(movement.endPosition);
            if (nextHoveredRegion?.adcode === hoveredRegion?.adcode) return;

            const previousHoveredRegion = hoveredRegion;
            hoveredRegion = nextHoveredRegion;

            if (previousHoveredRegion) applyRegionStyle(previousHoveredRegion);
            if (hoveredRegion) applyRegionStyle(hoveredRegion);

            viewer.scene.canvas.style.cursor = hoveredRegion ? "pointer" : "";
            viewer.scene.requestRender();
          },
          ScreenSpaceEventType.MOUSE_MOVE,
        );

        // 点击区县保持选中；点击未映射到区县的对象或空白处会取消选择。
        interactionHandler.setInputAction(
          (event: ScreenSpaceEventHandler.PositionedEvent) => {
            const nextSelectedRegion = pickRegion(event.position);
            const previousSelectedRegion = selectedRegionInScene;
            selectedRegionInScene = nextSelectedRegion;

            if (previousSelectedRegion) {
              applyRegionStyle(previousSelectedRegion);
            }
            if (selectedRegionInScene) applyRegionStyle(selectedRegionInScene);

            setSelectedRegion(
              selectedRegionInScene
                ? {
                    adcode: selectedRegionInScene.adcode,
                    name: selectedRegionInScene.name,
                  }
                : null,
            );
            viewer.scene.requestRender();
          },
          ScreenSpaceEventType.LEFT_CLICK,
        );

        setLoadState({ status: "success", count: districts.length });
        // duration 单位为秒，让初始视野平滑移动到全部区县范围。
        void viewer.flyTo(regions, { duration: 1.5 });
      } catch (reason) {
        if (!active) return;
        setLoadState({
          status: "error",
          message: reason instanceof Error ? reason.message : "未知加载错误",
        });
      }
    }

    void loadRegions();

    return () => {
      // 清理顺序先阻止异步回写和新交互，再移除场景资源。
      active = false;
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
            title="行政区加载失败"
            description={loadState.message}
          />
        ) : (
          <div className="rounded-md bg-[#06111f]/85 px-4 py-3 text-sm text-white shadow-lg">
            <div className="font-medium">杭州行政区</div>
            <div className="mt-1 text-slate-300">
              {loadState.status === "loading"
                ? "正在加载区县边界…"
                : `已加载 ${loadState.count} 个区县`}
            </div>
          </div>
        )}
      </div>

      {/* pointer-events-none 避免信息面板遮挡其下方的地图拖动和点击。 */}
      {selectedRegion ? (
        <aside className="pointer-events-none absolute right-4 top-4 z-10 w-56 rounded-md bg-[#06111f]/90 p-4 text-white shadow-lg">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
            当前选中区县
          </div>
          <div className="mt-2 text-lg font-semibold">
            {selectedRegion.name}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            行政编码：{selectedRegion.adcode}
          </div>
          <div className="mt-3 text-xs text-slate-400">
            点击地图空白区域可取消选择
          </div>
        </aside>
      ) : null}
    </>
  );
}

export default function HangzhouRegionsPage() {
  // CesiumMap 会根据 options 引用创建 Viewer，useMemo 可避免普通重渲染重建场景。
  const viewerOptions = useMemo<Viewer.ConstructorOptions>(
    () => ({
      // Cesium World Terrain 是在线资源，需要有效的 Cesium ion Token 和网络连接。
      terrain: Terrain.fromWorldTerrain(),
    }),
    [],
  );

  return (
    <section className="relative h-[calc(100vh-7.5rem)] min-h-[28rem] overflow-hidden rounded-md bg-[#06111f]">
      <CesiumMap className="h-full w-full" options={viewerOptions}>
        <RegionsScene />
      </CesiumMap>
    </section>
  );
}
