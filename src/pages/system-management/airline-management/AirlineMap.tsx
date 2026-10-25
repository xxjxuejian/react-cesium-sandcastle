import { useLayoutEffect, useRef, useState } from "react";
import { Alert, Button } from "antd";
import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  Entity,
  HeadingPitchRange,
  Math as CesiumMath,
  OpenStreetMapImageryProvider,
  Rectangle,
  SceneMode,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "cesium";
import type { Viewer } from "cesium";
import { CesiumMap, useCesium, useCesiumEffect } from "@/components/CesiumMap";
import type { AirlineWaypoint } from "./types";

/** 航线地图只接收表单状态，自己不保存另一份航点数据。 */
interface AirlineMapProps {
  /** 按飞行顺序排列的航点，临时不完整的坐标会跳过绘制。 */
  waypoints: AirlineWaypoint[];
  /** 当前选中的航点下标；未选中时为 null。 */
  selectedIndex: number | null;
  /** 列表请求定位的航点；为 null 时不改变相机。 */
  focusPoint: AirlineWaypoint | null;
  /** 是否处于连续点击添加航点的模式。 */
  drawing: boolean;
  /** 查看或保存期间禁止添加、拖动，仍可选择和定位。 */
  readOnly: boolean;
  /** 新增航点采用的相对起飞点高度，单位为米。 */
  defaultAltitude: number;
  /** 地图点击后将新航点交给表单保存为未提交状态。 */
  onAdd: (point: AirlineWaypoint) => void;
  /** 拖动仅修改水平位置，保留当前航点的高度。 */
  onMove: (index: number, longitude: number, latitude: number) => void;
  /** 选中地图航点时，通知左侧列表选中对应行。 */
  onSelect: (index: number) => void;
}

/** 仅在当前页面使用二维地图，航点相对高度不会被误用为椭球绝对高度。 */
const mapOptions = {
  sceneMode: SceneMode.SCENE2D,
  baseLayer: false,
  homeButton: false,
} satisfies Viewer.ConstructorOptions;

/** 输入过程中可能暂时清空坐标，Cesium 只接收范围内的有效经纬度。 */
function hasValidPosition(point: AirlineWaypoint): boolean {
  return (
    Boolean(point) &&
    Number.isFinite(point.longitude) &&
    Number.isFinite(point.latitude) &&
    Math.abs(point.longitude) <= 180 &&
    Math.abs(point.latitude) <= 90
  );
}

/** 打开地图和点击“预览整条航线”共用定位逻辑，不在编辑每个字段时自动移动相机。 */
function fitAirline(
  viewer: Viewer,
  waypoints: AirlineWaypoint[],
  duration: number,
) {
  const positions = waypoints
    .filter(hasValidPosition)
    .map((point) => Cartesian3.fromDegrees(point.longitude, point.latitude));
  if (positions.length === 0) {
    viewer.camera.setView({
      destination: Rectangle.fromDegrees(120.17, 30.17, 120.25, 30.24),
    });
    return;
  }
  const sphere = BoundingSphere.fromPoints(positions);
  viewer.camera.flyToBoundingSphere(sphere, {
    duration,
    offset: new HeadingPitchRange(
      0,
      -Math.PI / 2 + 0.0001,
      Math.max(sphere.radius * 3, 1500),
    ),
  });
}

/** CesiumMap 管理 Viewer 的创建和销毁；场景组件负责此页面的实体和鼠标事件。 */
export function AirlineMap(props: AirlineMapProps) {
  return (
    <div className="h-[480px] overflow-hidden rounded-lg border border-gray-200 xl:h-[680px]">
      <CesiumMap options={mapOptions}>
        <AirlineScene {...props} />
      </CesiumMap>
    </div>
  );
}

/** 在 Viewer 就绪后挂载，不会在组件渲染期间直接调用 Cesium API。 */
function AirlineScene(props: AirlineMapProps) {
  const viewer = useCesium();
  const [imageryError, setImageryError] = useState(false);
  const initialWaypointsRef = useRef(props.waypoints);
  const latestRef = useRef(props);

  // 鼠标事件只注册一次，通过 ref 获取最新表单回调和绘制状态，避免读到旧值。
  useLayoutEffect(() => {
    latestRef.current = props;
  }, [props]);

  useCesiumEffect(
    (currentViewer) => {
      currentViewer.scene.canvas.style.cursor =
        props.drawing && !props.readOnly ? "crosshair" : "default";
      return () => {
        currentViewer.scene.canvas.style.cursor = "default";
      };
    },
    [props.drawing, props.readOnly],
  );

  useCesiumEffect((currentViewer) => {
    const scene = currentViewer.scene;
    const controller = scene.screenSpaceCameraController;
    scene.globe.baseColor = Color.fromCssColorString("#dce6ed");
    scene.globe.enableLighting = false;
    // 使用无需密钥的道路底图；保留 Cesium 自带的地图来源署名。
    const provider = new OpenStreetMapImageryProvider({
      url: "https://tile.openstreetmap.org/",
      maximumLevel: 19,
    });
    const layer = currentViewer.imageryLayers.addImageryProvider(provider);
    const removeImageryError = provider.errorEvent.addEventListener(() =>
      setImageryError(true),
    );
    fitAirline(currentViewer, initialWaypointsRef.current, 0);
    // 禁用默认双击行为，防止绘制时意外追踪实体或改变相机。
    currentViewer.screenSpaceEventHandler.removeInputAction(
      ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    );

    const handler = new ScreenSpaceEventHandler(scene.canvas);
    let dragIndex: number | null = null;
    let dragStart: Cartesian2 | null = null;
    let moved = false;
    let suppressClick = false;
    let previousEnableInputs = controller.enableInputs;

    /** 只识别本页面创建的航点，路径折线和底图点击不会被当成航点。 */
    function pickWaypoint(position: Cartesian2): number | null {
      const picked = scene.pick(position) as { id?: Entity } | undefined;
      if (
        !(picked?.id instanceof Entity) ||
        !picked.id.id.startsWith("airline-waypoint-")
      )
        return null;
      const index = Number(picked.id.id.slice("airline-waypoint-".length));
      return Number.isInteger(index) ? index : null;
    }

    /** 二维平面选点转换为 WGS84 度数；鼠标指向地图之外时不更新。 */
    function pickCoordinates(position: Cartesian2) {
      const cartesian = currentViewer.camera.pickEllipsoid(
        position,
        scene.globe.ellipsoid,
      );
      if (!cartesian) return null;
      const cartographic = Cartographic.fromCartesian(cartesian);
      return {
        longitude: Number(
          CesiumMath.toDegrees(cartographic.longitude).toFixed(7),
        ),
        latitude: Number(
          CesiumMath.toDegrees(cartographic.latitude).toFixed(7),
        ),
      };
    }

    /** 松开鼠标或离开窗口时恢复相机，避免拖动中断后地图无法操作。 */
    function stopDragging() {
      if (dragIndex === null) return;
      suppressClick = moved;
      dragIndex = null;
      dragStart = null;
      controller.enableInputs = previousEnableInputs;
    }

    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const latest = latestRef.current;
      const index = pickWaypoint(event.position);
      if (index !== null) {
        latest.onSelect(index);
        return;
      }
      if (!latest.drawing || latest.readOnly) return;
      const coordinates = pickCoordinates(event.position);
      if (coordinates)
        latest.onAdd({ ...coordinates, altitude: latest.defaultAltitude });
    }, ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      // 新的一次按下代表新操作；上次拖动若未产生 click，也不能吞掉这次点击。
      suppressClick = false;
      const latest = latestRef.current;
      if (latest.readOnly || latest.drawing) return;
      const index = pickWaypoint(event.position);
      if (index === null) return;
      dragIndex = index;
      dragStart = Cartesian2.clone(event.position);
      moved = false;
      previousEnableInputs = controller.enableInputs;
      // 拖航点时暂时关闭相机输入，否则地图会随鼠标一起平移。
      controller.enableInputs = false;
      latest.onSelect(index);
    }, ScreenSpaceEventType.LEFT_DOWN);

    handler.setInputAction((event: ScreenSpaceEventHandler.MotionEvent) => {
      if (dragIndex === null || !dragStart) return;
      if (latestRef.current.readOnly) {
        stopDragging();
        return;
      }
      if (Cartesian2.distance(dragStart, event.endPosition) > 3) moved = true;
      if (!moved) return;
      const coordinates = pickCoordinates(event.endPosition);
      if (coordinates)
        latestRef.current.onMove(
          dragIndex,
          coordinates.longitude,
          coordinates.latitude,
        );
    }, ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction(stopDragging, ScreenSpaceEventType.LEFT_UP);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    window.addEventListener("blur", stopDragging);

    return () => {
      stopDragging();
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      window.removeEventListener("blur", stopDragging);
      handler.destroy();
      removeImageryError();
      if (!currentViewer.isDestroyed()) {
        currentViewer.camera.cancelFlight();
        currentViewer.imageryLayers.remove(layer, true);
      }
    };
  }, []);

  useCesiumEffect(
    (currentViewer) => {
      const entities: Entity[] = [];
      const positions: Cartesian3[] = [];
      let allPositionsValid = true;

      props.waypoints.forEach((point, index) => {
        if (!hasValidPosition(point)) {
          allPositionsValid = false;
          return;
        }
        // 地图只表现水平位置，高度在标签中显示，避免混淆高度基准。
        const position = Cartesian3.fromDegrees(
          point.longitude,
          point.latitude,
        );
        positions.push(position);
        const selected = index === props.selectedIndex;
        const endpoint = index === 0 || index === props.waypoints.length - 1;
        entities.push(
          currentViewer.entities.add({
            id: `airline-waypoint-${index}`,
            position,
            point: {
              pixelSize: selected ? 16 : 12,
              color: selected
                ? Color.ORANGE
                : endpoint
                  ? Color.fromCssColorString("#1677ff")
                  : Color.WHITE,
              outlineColor: Color.fromCssColorString("#1677ff"),
              outlineWidth: 3,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: `${index + 1} · ${Number.isFinite(point.altitude) ? point.altitude : "待填写"} 米`,
              font: "14px sans-serif",
              fillColor: Color.WHITE,
              showBackground: true,
              backgroundColor:
                Color.fromCssColorString("#17324d").withAlpha(0.9),
              pixelOffset: new Cartesian2(0, -28),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          }),
        );
      });

      // 暂时缺失坐标时不跨过该航点连接，待输入完整后恢复路径。
      if (allPositionsValid && positions.length >= 2) {
        entities.push(
          currentViewer.entities.add({
            id: "airline-path",
            polyline: {
              positions,
              width: 4,
              material: Color.fromCssColorString("#1677ff"),
            },
          }),
        );
      }
      currentViewer.scene.requestRender();

      return () => {
        if (currentViewer.isDestroyed()) return;
        // 仅清理此 Effect 创建的实体，保留地图宿主和其他资源。
        entities.forEach((entity) => currentViewer.entities.remove(entity));
        currentViewer.scene.requestRender();
      };
    },
    [props.waypoints, props.selectedIndex],
  );

  useCesiumEffect(
    (currentViewer) => {
      if (!props.focusPoint || !hasValidPosition(props.focusPoint)) return;
      const target = Cartesian3.fromDegrees(
        props.focusPoint.longitude,
        props.focusPoint.latitude,
      );
      currentViewer.camera.flyToBoundingSphere(new BoundingSphere(target, 0), {
        duration: 0.5,
        offset: new HeadingPitchRange(0, -Math.PI / 2 + 0.0001, 1500),
      });
      return () => {
        if (!currentViewer.isDestroyed()) currentViewer.camera.cancelFlight();
      };
    },
    [props.focusPoint],
  );

  return (
    <>
      <div className="absolute right-3 top-3 z-10">
        <Button onClick={() => fitAirline(viewer, props.waypoints, 0.6)}>
          预览整条航线
        </Button>
      </div>
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-sm">
        WGS84 · 二维路径{props.drawing ? " · 点击添加航点" : ""}
      </div>
      {imageryError ? (
        <Alert
          className="absolute bottom-10 left-3 right-3 z-10"
          type="warning"
          showIcon
          title="底图暂时无法加载，仍可在左侧编辑坐标和高度。"
        />
      ) : null}
    </>
  );
}
