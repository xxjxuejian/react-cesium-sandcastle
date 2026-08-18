import { useEffect, useRef, useState } from "react";
import { Alert } from "antd";
import { Cartesian3, Terrain, Viewer } from "cesium";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知的 Cesium 初始化错误";
}

export default function CesiumWidgetPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let isActive = true;
    let viewer: Viewer | null = null;
    let removeRenderErrorListener: (() => void) | undefined;

    try {
      viewer = new Viewer(container, {
        terrain: Terrain.fromWorldTerrain(),
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        requestRenderMode: true,
        maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      });
      viewerRef.current = viewer;

      removeRenderErrorListener = viewer.scene.renderError.addEventListener(
        (_scene, error) => {
          setInitializationError(getErrorMessage(error));
        },
      );

      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(121.4737, 31.2304, 2_000_000),
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      queueMicrotask(() => {
        if (isActive) {
          setInitializationError(errorMessage);
        }
      });
    }

    return () => {
      isActive = false;
      removeRenderErrorListener?.();

      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }

      if (viewerRef.current === viewer) {
        viewerRef.current = null;
      }
    };
  }, []);

  return (
    <section className="relative h-[calc(100vh-7.5rem)] min-h-[28rem] overflow-hidden rounded-md bg-[#06111f]">
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label="Cesium ion 三维地图"
      />

      {initializationError ? (
        <div className="absolute left-4 top-4 z-20 max-w-xl">
          <Alert
            showIcon
            type="error"
            title="Cesium 场景初始化失败"
            description={initializationError}
          />
        </div>
      ) : null}
    </section>
  );
}
