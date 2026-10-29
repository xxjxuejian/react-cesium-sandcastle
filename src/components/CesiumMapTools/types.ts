/** 底图来源：osm 为 OpenStreetMap，tianditu 为需要 Key 的天地图。 */
export type BasemapSource = "osm" | "tianditu";

/** 底图样式：vector 为道路矢量样式，imagery 为影像；实际都通过图片瓦片加载。 */
export type BasemapType = "vector" | "imagery";

/** 默认工具栏或自定义 UI 可使用的底图状态和操作。 */
export interface BasemapControls {
  /** 当前地图来源；由 useBasemap 的初始来源决定，天地图缺少 Key 时使用 osm。 */
  source: BasemapSource;
  /** 当前图层类型；OSM 只允许 vector。 */
  type: BasemapType;
  /** 是否已配置天地图 Key，仅暴露可用状态，不向 UI 传递 Key。 */
  hasTiandituKey: boolean;
  /** 当前图层是否加载失败；重试或切换后清除。 */
  hasError: boolean;
  /** 切换来源，同时重置为矢量图；缺少 Key 时忽略天地图请求。 */
  setSource: (source: BasemapSource) => void;
  /** 切换当前来源支持的类型；忽略 OSM 影像请求。 */
  setType: (type: BasemapType) => void;
  /** 重新创建当前底图及注记，重新请求失败的瓦片。 */
  retry: () => void;
}

/** 水平测量类型：distance 为折线长度，area 为闭合多边形面积。 */
export type MeasurementType = "distance" | "area";

/** WGS84 经纬度，顺序为经度、纬度，单位为度；不保存高度。 */
export type MeasurementPosition = [longitude: number, latitude: number];

/** 测量失败原因；UI 根据此标识翻译提示文字。 */
export type MeasurementError =
  | "tooFewPoints"
  | "invalidShape"
  | "selfIntersection"
  | "unsupportedArea"
  | "unavailable";

/** 已完成的一组测量，仅保存在当前地图，不进入业务接口或全局 Store。 */
export interface MeasurementResult {
  /** 当前地图内递增生成的编号，清空后也不复用，便于删除指定结果。 */
  id: number;
  /** 本次测量的类型，决定数值单位和图形样式。 */
  type: MeasurementType;
  /** 用户确定的顶点；面积闭合边由工具补齐，不重复保存首点。 */
  positions: MeasurementPosition[];
  /** 水平距离为米，水平面积为平方米；忽略地形起伏。 */
  value: number;
}

/** 测量 Hook 的接入参数，适合未来与页面绘制或保存状态协调。 */
export interface MeasurementOptions {
  /** 是否禁止新测量；省略时为 false，变为 true 时取消当前草稿，保留结果。 */
  disabled?: boolean;
}

/** 工具栏和页面自定义按钮共用的测量状态与操作。 */
export interface MeasurementControls {
  /** 当前测量类型；null 表示浏览状态，不占用页面业务取点。 */
  activeType: MeasurementType | null;
  /** 当前是否禁止开始测量。 */
  disabled: boolean;
  /** 当前已确定的顶点数量，不包含随鼠标移动的预览点。 */
  pointCount: number;
  /** 是否满足完成所需的最少顶点数；完成时仍会检查形状是否合法。 */
  canFinish: boolean;
  /** 当前预览值，距离单位为米，面积单位为平方米。 */
  value: number;
  /** 当前错误原因；null 表示没有错误。 */
  error: MeasurementError | null;
  /** 已完成的全部结果，按完成顺序排列。 */
  results: MeasurementResult[];
  /** 开始指定测量；已有草稿会取消，完成结果保留。 */
  start: (type: MeasurementType) => void;
  /** 校验并完成当前测量，不足或无效时保留草稿并提示原因。 */
  finish: () => void;
  /** 取消当前草稿，恢复光标与默认交互，不删除完成结果。 */
  cancel: () => void;
  /** 删除指定编号的结果及其图形。 */
  removeResult: (id: number) => void;
  /** 取消草稿并清空所有测量结果，不影响业务图形。 */
  clearResults: () => void;
}

/** 工具栏可按需启用的能力：底图、测距、测面积。 */
export type MapTool = "basemap" | "distance" | "area";
