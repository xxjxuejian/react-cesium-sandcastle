import { useEffect, useRef, useState } from "react";
import {
  Cartesian3,
  Viewer,
  WebMapTileServiceImageryProvider,
  WebMercatorTilingScheme,
} from "cesium";

// Key 保存在根目录的 .env.local 中，不直接写进页面源码。
const token = import.meta.env.VITE_TIANDITU_TOKEN?.trim();

/** 直接使用 Cesium API 展示天地图球面墨卡托底图与注记。 */
export default function TiandituBasic() {
  const containerRef = useRef<HTMLDivElement>(null);
  // 保存同一个 Viewer，切换底图时继续使用它，避免地图和相机被重新创建。
  const viewerRef = useRef<Viewer | null>(null);
  const [isImagery, setIsImagery] = useState(false);
  const [error, setError] = useState("");

  // React 先把 div 放进页面，useEffect 再使用这个真实 DOM 创建 Viewer。
  useEffect(() => {
    if (!containerRef.current || !token) return;

    // 1. 创建三维地球，关闭默认底图和不需要的控件。
    let viewer: Viewer;
    try {
      viewer = new Viewer(containerRef.current, {
        baseLayer: false,
        baseLayerPicker: false,
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
      });
    } catch {
      // 只在外部 WebGL 创建失败时更新提示，不是从已有状态推导新状态。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("地图创建失败，请检查浏览器是否支持 WebGL。");
      return;
    }
    viewerRef.current = viewer;

    // 2. 从杭州上方 30 千米处向下看。参数依次为经度、纬度、高度（米）。
    // 相机只在创建地图时定位一次，之后切换底图不会改变当前视角。
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(120.1551, 30.2741, 30_000),
      orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
    });

    // 离开页面时释放 WebGL 和地图资源。
    // StrictMode 在开发时会额外执行一次创建与清理，也依赖这里避免重复地图。
    return () => {
      viewerRef.current = null;
      viewer.destroy();
    };
  }, []);

  // 上面的 Effect 先创建 Viewer，这个 Effect 再加载当前选择的底图和注记。
  // 点击按钮改变 isImagery 后，React 先清理旧图层，再执行这里加载新图层。
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !token) return;

    const baseLayerName = isImagery ? "img" : "vec";
    const labelLayerName = isImagery ? "cia" : "cva";

    // 3. 添加底图。_w、矩阵集 w 和 WebMercatorTilingScheme 必须对应。
    // 这里的“矢量图”是地图样式，WMTS 返回的仍是一张张图片瓦片。
    const baseMap = new WebMapTileServiceImageryProvider({
      url: `https://t0.tianditu.gov.cn/${baseLayerName}_w/wmts?tk=${token}`,
      layer: baseLayerName,
      style: "default",
      format: "tiles",
      tileMatrixSetID: "w",
      tilingScheme: new WebMercatorTilingScheme(),
      minimumLevel: 1,
      maximumLevel: 18,
      credit: "天地图",
    });
    const removeBaseMapError = baseMap.errorEvent.addEventListener(() => {
      setError("天地图底图加载失败，请检查网络、Key 和服务权限后刷新页面。");
    });
    const baseMapLayer = viewer.imageryLayers.addImageryProvider(baseMap);

    // 4. 后添加的注记显示在上面：矢量图搭配 cva，影像图搭配 cia。
    const labels = new WebMapTileServiceImageryProvider({
      url: `https://t0.tianditu.gov.cn/${labelLayerName}_w/wmts?tk=${token}`,
      layer: labelLayerName,
      style: "default",
      format: "tiles",
      tileMatrixSetID: "w",
      tilingScheme: new WebMercatorTilingScheme(),
      minimumLevel: 1,
      maximumLevel: 18,
      credit: "天地图",
    });
    const removeLabelsError = labels.errorEvent.addEventListener(() => {
      setError("天地图注记加载失败，请检查网络、Key 和服务权限后刷新页面。");
    });
    const labelLayer = viewer.imageryLayers.addImageryProvider(labels);

    // 切换时只移除这两个图层，remove 默认也会销毁对应的图层资源。
    // 离开页面时 Viewer 可能已经被上一个 Effect 销毁，因此先检查。
    return () => {
      removeBaseMapError();
      removeLabelsError();
      if (!viewer.isDestroyed()) {
        viewer.imageryLayers.remove(labelLayer);
        viewer.imageryLayers.remove(baseMapLayer);
      }
    };
  }, [isImagery]);

  const message = token
    ? error
    : "请在 .env.local 中配置 VITE_TIANDITU_TOKEN，然后重启开发服务。";

  return (
    <div className="relative h-[calc(100vh-7.5rem)] min-h-[28rem] overflow-hidden rounded-md">
      <div ref={containerRef} className="h-full w-full" />
      <button
        type="button"
        disabled={!token}
        onClick={() => {
          if (!viewerRef.current) return;
          setError("");
          setIsImagery((previous) => !previous);
        }}
        className="absolute top-3 left-3 z-10 rounded bg-white px-4 py-2 text-sm text-slate-800 shadow hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isImagery ? "切换为矢量底图" : "切换为影像底图"}
      </button>
      {message && (
        <p
          role="alert"
          className="absolute top-16 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded bg-white p-3 text-sm text-red-700 shadow"
        >
          {message}
        </p>
      )}
    </div>
  );
}
