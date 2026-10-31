import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "antd";
import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  EllipsoidGeodesic,
  EllipsoidTerrainProvider,
  Entity,
  HeadingPitchRange,
  LabelStyle,
  Math as CesiumMath,
  Matrix4,
  PolylineDashMaterialProperty,
  Rectangle,
  SceneMode,
  SceneTransforms,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Transforms,
} from "cesium";
import type { Viewer } from "cesium";
import { CesiumMap, useCesiumEffect } from "@/components/CesiumMap";
import { MapToolbar } from "@/components/CesiumMapTools/MapToolbar";
import { useBasemap } from "@/components/CesiumMapTools/useBasemap";
import { DEFENSE_RINGS, hasValidKeyUnitCenter } from "@/utils/keyUnit";
import type {
  DefenseRingDraft,
  DefenseRingType,
  KeyUnitDraft,
  KeyUnitMapAction,
  KeyUnitMapMode,
} from "./types";

/** 地图只展示草稿，并把用户操作交回编辑区。 */
interface KeyUnitMapProps {
  /** 当前唯一的未保存数据。 */
  draft: KeyUnitDraft;
  /** 参数栏和地图共同选中的圈层。 */
  selected: DefenseRingType;
  /** 二维编辑或三维预览，不重建 Viewer。 */
  mode: KeyUnitMapMode;
  /** center 调整共同中心、radius 调整当前半径、null 浏览。 */
  action: KeyUnitMapAction;
  /** 查看或保存期间禁止任何业务修改。 */
  readOnly: boolean;
  /** 地图选择圈层后同步参数栏。 */
  onSelect: (type: DefenseRingType) => void;
  /** 调整中心，只更新经纬度，保留三个圈的参数。 */
  onCenterChange: (longitude: number, latitude: number) => void;
  /** 调整当前圈的半径，单位为米。 */
  onRadiusChange: (radius: number) => void;
}

// 地面统一采用零高度椭球面，不加载真实起伏地形。
const mapOptions = {
  sceneMode: SceneMode.SCENE2D,
  baseLayer: false,
  homeButton: false,
  terrainProvider: new EllipsoidTerrainProvider(),
} satisfies Viewer.ConstructorOptions;
// 此限制只保护地图几何计算，不作为单位半径的业务上限。
const previewLimit = 10_000_000;

/** 临时空值、负数或过大数值不传给 Cesium，表单仍保留原输入并提示。 */
function canPreviewRing(ring: DefenseRingDraft, mode: KeyUnitMapMode): boolean {
  if (
    ring.radius === null ||
    !Number.isFinite(ring.radius) ||
    ring.radius <= 0 ||
    ring.radius > previewLimit
  )
    return false;
  return (
    mode === "2d" ||
    (ring.minHeight !== null &&
      ring.maxHeight !== null &&
      Number.isFinite(ring.minHeight) &&
      Number.isFinite(ring.maxHeight) &&
      ring.minHeight >= 0 &&
      ring.maxHeight > ring.minHeight &&
      ring.maxHeight <= previewLimit)
  );
}

/** 先确定东方向，再沿椭球测地线放置控制点，使它与输入半径一致。 */
function radiusPoint(
  longitude: number,
  latitude: number,
  radius: number,
): Cartesian3 {
  const center = Cartesian3.fromDegrees(longitude, latitude);
  const transform = Transforms.eastNorthUpToFixedFrame(center);
  const point = Matrix4.multiplyByPoint(
    transform,
    // 方向参考点固定在 1000 米处，避免极小半径因浮点精度与中心重合。
    new Cartesian3(1000, 0, 0),
    new Cartesian3(),
  );
  const direction = Cartographic.fromCartesian(point);
  // 直接投影切平面上的点会缩短表面距离，大半径时控制点会明显偏向圈内。
  const line = new EllipsoidGeodesic(
    Cartographic.fromDegrees(longitude, latitude),
    direction,
  );
  const cartographic = line.interpolateUsingSurfaceDistance(radius);
  return Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    0,
  );
}

/** 两处地图交互共用水平测距；接近地球对跖点时 Cesium 可能无法求解。 */
function horizontalDistance(start: Cartographic, end: Cartographic): number | null {
  try {
    const distance = new EllipsoidGeodesic(start, end).surfaceDistance;
    return Number.isFinite(distance) ? distance : null;
  } catch {
    // 无解时忽略该次点击，保留草稿和后续交互，不让异常中断地图事件。
    return null;
  }
}

/** 初次打开、模式切换和手动预览时定位；普通参数输入不会反复抢相机。 */
function fitUnit(
  viewer: Viewer,
  draft: KeyUnitDraft,
  mode: KeyUnitMapMode,
  centerOnly = false,
) {
  if (!hasValidKeyUnitCenter(draft.longitude, draft.latitude)) {
    viewer.camera.setView({
      destination: Rectangle.fromDegrees(120.17, 30.2, 120.26, 30.29),
    });
    return;
  }
  const radii = DEFENSE_RINGS.filter(({ type }) =>
    canPreviewRing(draft.rings[type], mode),
  ).map(({ type }) => draft.rings[type].radius ?? 0);
  const heights = DEFENSE_RINGS.map(({ type }) =>
    Math.min(previewLimit, Math.max(0, draft.rings[type].maxHeight ?? 0)),
  );
  const radius = centerOnly
    ? 400
    : Math.max(500, ...radii, ...(mode === "3d" ? heights : []));
  const center = Cartesian3.fromDegrees(draft.longitude!, draft.latitude!);
  viewer.camera.flyToBoundingSphere(new BoundingSphere(center, radius), {
    duration: 0,
    offset: new HeadingPitchRange(
      0,
      mode === "2d" ? -Math.PI / 2 : -Math.PI / 4,
      radius * 3,
    ),
  });
}

/** Viewer 只创建一次，参数、底图和预览模式变化均更新现有实例。 */
export function KeyUnitMap(props: KeyUnitMapProps) {
  return (
    <CesiumMap options={mapOptions}>
      <KeyUnitScene {...props} />
    </CesiumMap>
  );
}

/** 页面专属实体、相机和交互；卸载时全部清理。 */
function KeyUnitScene(props: KeyUnitMapProps) {
  const basemap = useBasemap("tianditu");
  const [focus, setFocus] = useState({ sequence: 0, centerOnly: false });
  const latestRef = useRef(props);
  useLayoutEffect(() => {
    latestRef.current = props;
  }, [props]);

  useCesiumEffect((viewer) => {
    viewer.scene.globe.baseColor = Color.fromCssColorString("#dce6ed");
    viewer.scene.globe.enableLighting = false;
    viewer.screenSpaceEventHandler.removeInputAction(
      ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    );
    const scene = viewer.scene;
    const controller = scene.screenSpaceCameraController;
    const previousZoomFactor = controller.zoomFactor;
    const previousInertiaZoom = controller.inertiaZoom;
    // 默认缩放倍率为 5，圈层编辑时过于敏感；降低速度和惯性，方便小幅调整。
    // 二维编辑与三维预览共用这个控制器，不额外接管滚轮事件。
    controller.zoomFactor = 1.5;
    controller.inertiaZoom = 0.2;
    const handler = new ScreenSpaceEventHandler(scene.canvas);
    let dragging = false;
    let moved = false;
    let suppressClick = false;
    let startPosition: Cartesian2 | null = null;
    let previousInputs = controller.enableInputs;

    /** 只拾取零高度面，半透明防御体不会被误当作地面。 */
    function coordinates(position: Cartesian2) {
      const point = viewer.camera.pickEllipsoid(
        position,
        scene.globe.ellipsoid,
      );
      if (!point) return null;
      const cartographic = Cartographic.fromCartesian(point);
      return {
        longitude: Number(
          CesiumMath.toDegrees(
            CesiumMath.negativePiToPi(cartographic.longitude),
          ).toFixed(7),
        ),
        latitude: Number(
          CesiumMath.toDegrees(cartographic.latitude).toFixed(7),
        ),
      };
    }

    function adjust(position: Cartesian2) {
      const latest = latestRef.current;
      if (latest.readOnly || latest.mode !== "2d" || !latest.action) return;
      const point = coordinates(position);
      if (!point) return;
      if (latest.action === "center")
        latest.onCenterChange(point.longitude, point.latitude);
      else if (
        hasValidKeyUnitCenter(latest.draft.longitude, latest.draft.latitude)
      ) {
        // 半径按椭球表面的水平距离计算，不混入高度差或屏幕像素。
        const distance = horizontalDistance(
          Cartographic.fromDegrees(
            latest.draft.longitude!,
            latest.draft.latitude!,
          ),
          Cartographic.fromDegrees(point.longitude, point.latitude),
        );
        if (distance === null) return;
        const radius = Math.round(distance * 10) / 10;
        if (Number.isFinite(radius) && radius > 0)
          latest.onRadiusChange(radius);
      }
    }

    function stopDragging() {
      if (!dragging) return;
      dragging = false;
      suppressClick = moved;
      startPosition = null;
      controller.enableInputs = previousInputs;
      scene.requestRender();
    }

    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const latest = latestRef.current;
      if (latest.action) {
        adjust(event.position);
        return;
      }
      // 同心面可能重叠；二维按实际水平位置选择最内层，三维按可见实体选择。
      if (
        latest.mode === "2d" &&
        hasValidKeyUnitCenter(latest.draft.longitude, latest.draft.latitude)
      ) {
        const point = coordinates(event.position);
        if (!point) return;
        const distance = horizontalDistance(
          Cartographic.fromDegrees(
            latest.draft.longitude!,
            latest.draft.latitude!,
          ),
          Cartographic.fromDegrees(point.longitude, point.latitude),
        );
        if (distance === null) return;
        const ring = DEFENSE_RINGS.find(
          ({ type }) =>
            canPreviewRing(latest.draft.rings[type], "2d") &&
            distance <= latest.draft.rings[type].radius!,
        );
        if (ring) latest.onSelect(ring.type);
      } else {
        const picked = scene.drillPick(event.position, 8) as Array<{
          id?: Entity;
        }>;
        const ring = DEFENSE_RINGS.find(({ type }) =>
          picked.some(
            (item) =>
              item.id instanceof Entity &&
              item.id.id === `key-unit-ring-${type}`,
          ),
        );
        if (ring) latest.onSelect(ring.type);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      suppressClick = false;
      const latest = latestRef.current;
      if (latest.readOnly || latest.mode !== "2d" || !latest.action) return;
      const picked = scene.pick(event.position) as { id?: Entity } | undefined;
      const target =
        latest.action === "center" ? "key-unit-center" : "key-unit-radius";
      let hit = picked?.id instanceof Entity && picked.id.id === target;
      if (
        latest.action === "radius" &&
        hasValidKeyUnitCenter(latest.draft.longitude, latest.draft.latitude) &&
        canPreviewRing(latest.draft.rings[latest.selected], "2d")
      ) {
        // 圈面、引导线和点可能重叠。额外用公开的屏幕投影计算命中范围，
        // 让控制点附近的按下也可开始拖动，不依赖异步图元的拾取顺序。
        const handle = radiusPoint(
          latest.draft.longitude!,
          latest.draft.latitude!,
          latest.draft.rings[latest.selected].radius!,
        );
        const screen = SceneTransforms.worldToWindowCoordinates(scene, handle);
        hit =
          hit ||
          (!!screen && Cartesian2.distance(screen, event.position) <= 18);
      }
      if (!hit) return;
      dragging = true;
      moved = false;
      startPosition = Cartesian2.clone(event.position);
      previousInputs = controller.enableInputs;
      controller.enableInputs = false;
    }, ScreenSpaceEventType.LEFT_DOWN);

    handler.setInputAction((event: ScreenSpaceEventHandler.MotionEvent) => {
      if (!dragging || !startPosition) return;
      if (latestRef.current.readOnly || !latestRef.current.action) {
        stopDragging();
        return;
      }
      if (Cartesian2.distance(startPosition, event.endPosition) > 3)
        moved = true;
      if (moved) adjust(event.endPosition);
    }, ScreenSpaceEventType.MOUSE_MOVE);
    handler.setInputAction(stopDragging, ScreenSpaceEventType.LEFT_UP);
    // 在画布外松手、取消指针或窗口失焦时也恢复相机输入。
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    window.addEventListener("blur", stopDragging);
    return () => {
      stopDragging();
      handler.destroy();
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      window.removeEventListener("blur", stopDragging);
      if (!viewer.isDestroyed()) {
        // 配置只属于本页，卸载时恢复原值。
        controller.zoomFactor = previousZoomFactor;
        controller.inertiaZoom = previousInertiaZoom;
        viewer.camera.cancelFlight();
        scene.canvas.style.cursor = "default";
      }
    };
  }, []);

  useCesiumEffect(
    (viewer) => {
      viewer.scene.canvas.style.cursor =
        props.action && !props.readOnly ? "crosshair" : "default";
      return () => {
        if (!viewer.isDestroyed()) viewer.scene.canvas.style.cursor = "default";
      };
    },
    [props.action, props.readOnly],
  );

  useCesiumEffect(
    (viewer) => {
      if (props.mode === "2d") viewer.scene.morphTo2D(0);
      else viewer.scene.morphTo3D(0);
      fitUnit(viewer, latestRef.current.draft, props.mode);
      viewer.scene.requestRender();
    },
    [props.mode],
  );

  useCesiumEffect(
    (viewer) => {
      if (focus.sequence > 0)
        fitUnit(
          viewer,
          latestRef.current.draft,
          latestRef.current.mode,
          focus.centerOnly,
        );
    },
    [focus],
  );

  useCesiumEffect(
    (viewer) => {
      const entities: Entity[] = [];
      const draft = props.draft;
      if (!hasValidKeyUnitCenter(draft.longitude, draft.latitude)) return;
      const longitude = draft.longitude!;
      const latitude = draft.latitude!;
      const position = Cartesian3.fromDegrees(longitude, latitude, 0);
      // 先画外层再画内层，较低透明度保留底图，边线与名称共同区分圈层。
      for (const { type, label, color } of [...DEFENSE_RINGS].reverse()) {
        const ring = draft.rings[type];
        if (!canPreviewRing(ring, props.mode)) continue;
        const selected = type === props.selected;
        const fill = Color.fromCssColorString(color);
        entities.push(
          viewer.entities.add({
            id: `key-unit-ring-${type}`,
            name: label,
            position,
            ellipse: {
              semiMajorAxis: ring.radius!,
              semiMinorAxis: ring.radius!,
              height: props.mode === "3d" ? ring.maxHeight! : 0,
              extrudedHeight: props.mode === "3d" ? ring.minHeight! : undefined,
              material: fill.withAlpha(selected ? 0.15 : 0.06),
              outline: true,
              outlineColor: fill,
              numberOfVerticalLines: props.mode === "3d" ? 8 : 0,
            },
          }),
        );
      }
      entities.push(
        viewer.entities.add({
          id: "key-unit-center",
          position,
          point: {
            pixelSize: 13,
            color: Color.fromCssColorString("#1677ff"),
            outlineColor: Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: draft.name || "单位中心",
            font: "13px sans-serif",
            style: LabelStyle.FILL_AND_OUTLINE,
            fillColor: Color.WHITE,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            pixelOffset: new Cartesian2(0, 25),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }),
      );
      const ring = draft.rings[props.selected];
      if (props.mode === "2d" && canPreviewRing(ring, "2d")) {
        const point = radiusPoint(longitude, latitude, ring.radius!);
        const color = Color.fromCssColorString(
          DEFENSE_RINGS.find((item) => item.type === props.selected)!.color,
        );
        entities.push(
          viewer.entities.add({
            id: "key-unit-radius-guide",
            polyline: {
              positions: [position, point],
              width: 2,
              material: new PolylineDashMaterialProperty({ color }),
            },
          }),
        );
        entities.push(
          viewer.entities.add({
            id: "key-unit-radius",
            position: point,
            point: props.readOnly
              ? undefined
              : {
                  pixelSize: 12,
                  color: Color.WHITE,
                  outlineColor: color,
                  outlineWidth: 3,
                  disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
            label: {
              text: `${ring.radius} 米`,
              font: "12px sans-serif",
              fillColor: Color.WHITE,
              style: LabelStyle.FILL_AND_OUTLINE,
              outlineColor: Color.BLACK,
              outlineWidth: 2,
              pixelOffset: new Cartesian2(0, -20),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          }),
        );
      }
      viewer.scene.requestRender();
      return () => {
        if (viewer.isDestroyed()) return;
        entities.forEach((entity) => viewer.entities.remove(entity));
        viewer.scene.requestRender();
      };
    },
    [props.draft, props.selected, props.mode, props.readOnly],
  );

  const previewIncomplete =
    !hasValidKeyUnitCenter(props.draft.longitude, props.draft.latitude) ||
    DEFENSE_RINGS.some(
      ({ type }) => !canPreviewRing(props.draft.rings[type], props.mode),
    );
  return (
    <>
      <div className="key-unit-map-overlay">
        <Button
          size="small"
          onClick={() =>
            setFocus((previous) => ({
              sequence: previous.sequence + 1,
              centerOnly: false,
            }))
          }
        >
          预览全部
        </Button>
        <Button
          size="small"
          disabled={
            !hasValidKeyUnitCenter(props.draft.longitude, props.draft.latitude)
          }
          onClick={() =>
            setFocus((previous) => ({
              sequence: previous.sequence + 1,
              centerOnly: true,
            }))
          }
        >
          定位单位
        </Button>
      </div>
      <MapToolbar tools={["basemap"]} basemap={basemap} />
      {previewIncomplete ? (
        <div className="key-unit-map-warning">
          请完善中心点和圈层参数；无效或过大的范围暂不显示。
        </div>
      ) : null}
    </>
  );
}
