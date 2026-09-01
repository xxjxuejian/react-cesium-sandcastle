/** 集中维护项目级 Cesium Viewer 默认构造配置。 */
import type { Viewer } from "cesium";

/** 所有 CesiumMap 默认采用、且允许页面覆盖的 Viewer 构造配置。 */
export const DEFAULT_VIEWER_OPTIONS = {
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
} satisfies Viewer.ConstructorOptions;
