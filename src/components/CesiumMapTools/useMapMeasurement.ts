import { useRef, useState } from "react";
import {
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  CustomDataSource,
  HeightReference,
  Math as CesiumMath,
  PolygonHierarchy,
  SceneMode,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "cesium";
import type { Entity } from "cesium";
import { useCesium, useCesiumEffect } from "../CesiumMap/hooks";
import {
  calculateArea,
  calculateDistance,
  formatMeasurement,
  validateMeasurement,
  MEASUREMENT_ENTITY_PREFIX,
} from "./measurement";
import type {
  MeasurementControls,
  MeasurementError,
  MeasurementOptions,
  MeasurementPosition,
  MeasurementResult,
  MeasurementType,
} from "./types";

/** 一次尚未完成的测量；鼠标移动只修改这里，不把 Cesium 对象放入 React 状态。 */
interface MeasurementSession {
  /** 当前绘制的是距离折线还是面积多边形。 */
  type: MeasurementType;
  /** 已点击确定的经纬度顶点。 */
  points: MeasurementPosition[];
  /** 随鼠标移动的预览点；null 表示没有有效预览位置。 */
  preview: MeasurementPosition | null;
  /** 本次草稿创建的实体，完成或取消后统一移除。 */
  entities: Entity[];
  /** 移除输入监听、草稿，并恢复进入测量前的设置。 */
  cleanup: () => void;
}

/** 提供水平测量与清理能力；UI 可使用默认工具栏，也可自行组织按钮。 */
export function useMapMeasurement({
  disabled = false,
}: MeasurementOptions = {}): MeasurementControls {
  const viewer = useCesium();
  const sourceRef = useRef<CustomDataSource | null>(null);
  const sessionRef = useRef<MeasurementSession | null>(null);
  const resultEntitiesRef = useRef(new Map<number, Entity[]>());
  const nextIdRef = useRef(1);
  const [activeType, setActiveType] = useState<MeasurementType | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [value, setValue] = useState(0);
  const [error, setError] = useState<MeasurementError | null>(null);
  const [results, setResults] = useState<MeasurementResult[]>([]);

  useCesiumEffect((currentViewer) => {
    const source = new CustomDataSource("map-tool-measurements");
    const resultEntities = resultEntitiesRef.current;
    sourceRef.current = source;
    let active = true;
    // add 返回 Promise。路由可能在添加完成前卸载，所以完成后仍要检查本轮生命周期。
    void currentViewer.dataSources
      .add(source)
      .then(() => {
        if (!active && !currentViewer.isDestroyed())
          currentViewer.dataSources.remove(source, true);
      })
      .catch(() => {
        if (active) setError("unavailable");
      });
    return () => {
      active = false;
      sessionRef.current?.cleanup();
      sessionRef.current = null;
      sourceRef.current = null;
      resultEntities.clear();
      if (!currentViewer.isDestroyed()) {
        currentViewer.dataSources.remove(source, true);
        currentViewer.scene.requestRender();
      }
    };
  }, []);

  function cancel() {
    sessionRef.current?.cleanup();
    sessionRef.current = null;
    setActiveType(null);
    setPointCount(0);
    setValue(0);
    setError(null);
  }

  // disabled 来自外部业务流程：保存或切换绘制模式时，立即释放测量占用的输入资源。
  useCesiumEffect(() => {
    if (disabled && sessionRef.current) cancel();
  }, [disabled]);

  function finish() {
    const session = sessionRef.current;
    const source = sourceRef.current;
    if (!session || !source || viewer.isDestroyed()) return;
    const validationError = validateMeasurement(session.type, session.points);
    if (validationError) {
      setError(validationError);
      return;
    }

    const positions = session.points.map(
      ([lon, lat]): MeasurementPosition => [lon, lat],
    );
    const result: MeasurementResult = {
      id: nextIdRef.current++,
      type: session.type,
      positions,
      value:
        session.type === "distance"
          ? calculateDistance(positions)
          : calculateArea(positions),
    };
    const cartesianPositions = positions.map(([lon, lat]) =>
      Cartesian3.fromDegrees(lon, lat),
    );
    const entities: Entity[] = [];
    const linePositions =
      result.type === "area"
        ? [...cartesianPositions, cartesianPositions[0]]
        : cartesianPositions;
    entities.push(
      source.entities.add({
        id: `${MEASUREMENT_ENTITY_PREFIX}${result.id}-line`,
        polyline: {
          positions: linePositions,
          width: 3,
          material: Color.YELLOW,
          clampToGround: true,
          zIndex: 10,
        },
      }),
    );
    if (result.type === "area") {
      entities.push(
        source.entities.add({
          id: `${MEASUREMENT_ENTITY_PREFIX}${result.id}-polygon`,
          polygon: {
            hierarchy: new PolygonHierarchy(cartesianPositions),
            material: Color.YELLOW.withAlpha(0.25),
            zIndex: 10,
          },
        }),
      );
    }
    entities.push(
      source.entities.add({
        id: `${MEASUREMENT_ENTITY_PREFIX}${result.id}-label`,
        position: cartesianPositions.at(-1),
        label: {
          text: `#${result.id} · ${formatMeasurement(result.value, result.type)}`,
          font: "14px sans-serif",
          fillColor: Color.WHITE,
          showBackground: true,
          backgroundColor: Color.BLACK.withAlpha(0.8),
          pixelOffset: new Cartesian2(0, -24),
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
    );
    resultEntitiesRef.current.set(result.id, entities);
    setResults((previous) => [...previous, result]);
    cancel();
    viewer.scene.requestRender();
  }

  function start(type: MeasurementType) {
    const source = sourceRef.current;
    if (disabled || !source || viewer.isDestroyed()) return;
    cancel();
    viewer.camera.cancelFlight();
    const scene = viewer.scene;
    const previousCursor = scene.canvas.style.cursor;
    const defaultHandler = viewer.screenSpaceEventHandler;
    const previousDoubleClick = defaultHandler.getInputAction(
      ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    );
    defaultHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    scene.canvas.style.cursor = "crosshair";
    const handler = new ScreenSpaceEventHandler(scene.canvas);
    const session: MeasurementSession = {
      type,
      points: [],
      preview: null,
      entities: [],
      cleanup: () => {},
    };
    sessionRef.current = session;
    setActiveType(type);
    let lastPreviewUpdate = 0;

    /** 先取真实地表位置，失败时回到椭球；忽略模型与测量图形的深度，避免自己挡住自己。 */
    function pickPosition(position: Cartesian2): MeasurementPosition | null {
      let cartesian: Cartesian3 | undefined;
      if (scene.mode === SceneMode.SCENE3D) {
        const ray = viewer.camera.getPickRay(position);
        if (ray) cartesian = scene.globe.pick(ray, scene);
      }
      cartesian ??= viewer.camera.pickEllipsoid(
        position,
        scene.globe.ellipsoid,
      );
      if (!cartesian) return null;
      const point = Cartographic.fromCartesian(cartesian);
      return [
        CesiumMath.toDegrees(point.longitude),
        CesiumMath.toDegrees(point.latitude),
      ];
    }

    function previewPoints() {
      return session.preview
        ? [...session.points, session.preview]
        : session.points;
    }

    function previewPositions() {
      return previewPoints().map(([lon, lat]) =>
        Cartesian3.fromDegrees(lon, lat),
      );
    }

    // CallbackProperty 在 Cesium 渲染时读取最新 Ref 数据，移动鼠标无需反复增删实体。
    session.entities.push(
      source.entities.add({
        id: `${MEASUREMENT_ENTITY_PREFIX}draft-line`,
        polyline: {
          positions: new CallbackProperty(() => {
            const positions = previewPositions();
            return type === "area" && positions.length >= 3
              ? [...positions, positions[0]]
              : positions;
          }, false),
          width: 3,
          material: Color.YELLOW,
          clampToGround: true,
          zIndex: 10,
        },
      }),
    );
    if (type === "area") {
      session.entities.push(
        source.entities.add({
          id: `${MEASUREMENT_ENTITY_PREFIX}draft-polygon`,
          polygon: {
            show: new CallbackProperty(
              () => previewPoints().length >= 3,
              false,
            ),
            hierarchy: new CallbackProperty(
              () => new PolygonHierarchy(previewPositions()),
              false,
            ),
            material: Color.YELLOW.withAlpha(0.2),
            zIndex: 10,
          },
        }),
      );
    }

    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      const point = pickPosition(event.position);
      if (!point) return;
      const previous = session.points.at(-1);
      // 小于一厘米的重复点击不增加顶点，避免零长度边。
      if (previous && calculateDistance([previous, point]) < 0.01) return;
      session.points.push(point);
      session.preview = null;
      session.entities.push(
        source.entities.add({
          id: `${MEASUREMENT_ENTITY_PREFIX}draft-point-${session.points.length}`,
          position: Cartesian3.fromDegrees(point[0], point[1]),
          point: {
            pixelSize: 8,
            color: Color.YELLOW,
            outlineColor: Color.BLACK,
            outlineWidth: 1,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }),
      );
      setPointCount(session.points.length);
      setValue(
        type === "distance"
          ? calculateDistance(session.points)
          : calculateArea(session.points),
      );
      setError(null);
      scene.requestRender();
    }, ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction((event: ScreenSpaceEventHandler.MotionEvent) => {
      session.preview = pickPosition(event.endPosition);
      // 图形跟随每次鼠标移动；工具栏数值最多每 100 毫秒更新一次，避免整页高频渲染。
      if (performance.now() - lastPreviewUpdate >= 100) {
        const points = previewPoints();
        setValue(
          type === "distance"
            ? calculateDistance(points)
            : calculateArea(points),
        );
        lastPreviewUpdate = performance.now();
      }
      scene.requestRender();
    }, ScreenSpaceEventType.MOUSE_MOVE);
    handler.setInputAction(finish, ScreenSpaceEventType.RIGHT_CLICK);

    function handleKeyDown(event: KeyboardEvent) {
      // 工具栏输入或其他弹窗拥有焦点时，不拦截其键盘操作。
      const target = event.target as HTMLElement | null;
      if (
        event.key === "Escape" &&
        !target?.closest(
          "input, textarea, select, [contenteditable=true], [role=dialog]",
        )
      ) {
        event.preventDefault();
        cancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    session.cleanup = () => {
      handler.destroy();
      document.removeEventListener("keydown", handleKeyDown);
      if (viewer.isDestroyed()) return;
      session.entities.forEach((entity) => source.entities.remove(entity));
      scene.canvas.style.cursor = previousCursor;
      if (previousDoubleClick)
        defaultHandler.setInputAction(
          previousDoubleClick,
          ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
        );
      scene.requestRender();
    };
    scene.requestRender();
  }

  function removeResult(id: number) {
    const source = sourceRef.current;
    if (!source || viewer.isDestroyed()) return;
    resultEntitiesRef.current
      .get(id)
      ?.forEach((entity) => source.entities.remove(entity));
    resultEntitiesRef.current.delete(id);
    setResults((previous) => previous.filter((result) => result.id !== id));
    viewer.scene.requestRender();
  }

  function clearResults() {
    cancel();
    if (!viewer.isDestroyed()) sourceRef.current?.entities.removeAll();
    resultEntitiesRef.current.clear();
    setResults([]);
    if (!viewer.isDestroyed()) viewer.scene.requestRender();
  }

  return {
    activeType,
    disabled,
    pointCount,
    value,
    error,
    results,
    canFinish: pointCount >= (activeType === "area" ? 3 : 2),
    start,
    finish,
    cancel,
    removeResult,
    clearResults,
  };
}
