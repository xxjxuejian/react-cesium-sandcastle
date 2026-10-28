import { useState } from "react";
import {
  OpenStreetMapImageryProvider,
  WebMapTileServiceImageryProvider,
  WebMercatorTilingScheme,
} from "cesium";
import type { ImageryLayer } from "cesium";
import { useCesiumEffect } from "../CesiumMap/hooks";
import type { BasemapControls, BasemapSource, BasemapType } from "./types";

/** 管理当前 Viewer 的底图；页面应通过 baseLayer: false 关闭 Cesium 默认底图。 */
export function useBasemap(): BasemapControls {
  const token = import.meta.env.VITE_TIANDITU_TOKEN?.trim();
  const [source, updateSource] = useState<BasemapSource>("osm");
  const [type, updateType] = useState<BasemapType>("vector");
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useCesiumEffect(
    (viewer) => {
      const layers: ImageryLayer[] = [];
      const removeListeners: Array<() => void> = [];
      let active = true;
      try {
        if (source === "osm") {
          const provider = new OpenStreetMapImageryProvider({
            url: "https://tile.openstreetmap.org/",
            maximumLevel: 19,
          });
          removeListeners.push(
            provider.errorEvent.addEventListener(() => {
              if (active) setHasError(true);
            }),
          );
          layers.push(viewer.imageryLayers.addImageryProvider(provider, 0));
        } else if (token) {
          // 底图与注记作为一组切换，始终放在业务影像层下方；不使用 removeAll。
          const names = type === "imagery" ? ["img", "cia"] : ["vec", "cva"];
          names.forEach((name, index) => {
            const provider = new WebMapTileServiceImageryProvider({
              url: `https://t0.tianditu.gov.cn/${name}_w/wmts?tk=${encodeURIComponent(token)}`,
              layer: name,
              style: "default",
              format: "tiles",
              tileMatrixSetID: "w",
              tilingScheme: new WebMercatorTilingScheme(),
              minimumLevel: 1,
              maximumLevel: 18,
              enablePickFeatures: false,
              credit: "天地图",
            });
            removeListeners.push(
              provider.errorEvent.addEventListener(() => {
                if (active) setHasError(true);
              }),
            );
            layers.push(
              viewer.imageryLayers.addImageryProvider(provider, index),
            );
          });
        }
        viewer.scene.requestRender();
      } catch {
        // 构造失败同样保留工具 UI；微任务避免在布局 Effect 中同步更新 React 状态。
        queueMicrotask(() => {
          if (active) setHasError(true);
        });
      }
      // 来源、类型或重试次数变化时，先清理本轮图层，再创建下一组；不重建 Viewer。
      return () => {
        active = false;
        removeListeners.forEach((remove) => remove());
        if (viewer.isDestroyed()) return;
        layers.forEach((layer) => viewer.imageryLayers.remove(layer, true));
        viewer.scene.requestRender();
      };
    },
    [source, type, token, retryCount],
  );

  function setSource(nextSource: BasemapSource) {
    if (nextSource === source || (nextSource === "tianditu" && !token)) return;
    setHasError(false);
    updateSource(nextSource);
    updateType("vector");
  }

  function setType(nextType: BasemapType) {
    if (nextType === type || (source === "osm" && nextType === "imagery"))
      return;
    setHasError(false);
    updateType(nextType);
  }

  return {
    source,
    type,
    hasTiandituKey: Boolean(token),
    hasError,
    setSource,
    setType,
    retry() {
      setHasError(false);
      setRetryCount((count) => count + 1);
    },
  };
}
