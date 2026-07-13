# Cesium 应急一张图架构设计

## 背景

当前项目已经建设 `system-management/shelter-management` 避难场所管理页面，并在 `ShelterRecord` 中保留 `location` 坐标。现有避难场所页面的职责是查询、新增、编辑、删除和查看业务数据，不适合继续承担 Cesium Viewer 生命周期、地图工具和其他业务点位展示。

本设计新增独立的“应急一张图”页面，以 Cesium 为地图引擎，首期展示避难场所和摄像头两类点位，并提供图层切换、查询、定位、距离测量、面积测量和视角控制等基础能力。

## 已确认的设计决策

- 地图采用独立“应急一张图”页面，不嵌入避难场所管理页。
- 首期是展示与查询型地图，不在地图中新增或编辑业务数据。
- React 直接封装原生 Cesium，不使用 Resium。
- 采用“地图内核 + 能力模块 + 业务图层”架构。
- 页面使用沉浸式悬浮面板布局。
- 左侧显示图层、筛选和结果列表，右侧显示选中点位详情。
- 摄像头首期只展示点位和基础信息，不接入抓拍图或实时视频。
- 首期不设计高德与 Cesium 的统一引擎接口，但业务数据模型不得依赖 Cesium 类型。

## 目标

- 建立可复用且职责清晰的 Cesium 地图基础模块。
- 让页面和业务组件通过稳定门面使用地图能力，不直接操作 `Viewer`。
- 支持避难场所和摄像头按独立图层加载、显隐、筛选、聚合和选择。
- 支持地图与结果列表双向定位。
- 支持缩放、初始视角、测距、测面和清除等基础工具。
- 保证 Cesium 静态资源能够在 Vite 开发环境和子路径部署环境中正确加载。
- 为事件点、附近资源分析、服务范围和摄像头视频等后续能力保留自然扩展位置。

## 非目标

- 不在避难场所管理页内创建 Cesium Viewer。
- 不在地图中新增、拖动或编辑避难场所和摄像头。
- 不建设完整 GIS 插件平台、全局事件总线或跨页面地图 Store。
- 不在首期兼容高德地图。
- 不接入实时视频、视频转码或播放器鉴权。
- 不接入事件处置、疏散路线、影响范围和资源调度。
- 不在首期加载全球地形、OSM Buildings 或其他 3D Tiles。

## 总体架构

依赖只能从上向下：业务页面依赖共享地图能力，共享地图能力依赖 Cesium 地图内核。地图内核不能反向依赖 React 页面或业务类型。

```text
React 页面与业务面板
        ↓
业务图层与地图工具
        ↓
Cesium 地图内核
```

### 推荐目录

```text
src/
├─ features/map/
│  ├─ components/
│  │  └─ CesiumMapCanvas.tsx
│  ├─ core/
│  │  ├─ CesiumMapRuntime.ts
│  │  ├─ MapInteraction.ts
│  │  └─ runtimeTypes.ts
│  ├─ layers/
│  │  ├─ PointLayerController.ts
│  │  ├─ BaseMapController.ts
│  │  └─ types.ts
│  ├─ tools/
│  │  ├─ MeasurementController.ts
│  │  └─ types.ts
│  ├─ camera/
│  │  └─ CameraController.ts
│  ├─ MapController.ts
│  └─ types.ts
│
└─ pages/emergency-map/
   ├─ components/
   │  ├─ MapLayerPanel.tsx
   │  ├─ MapSearchPanel.tsx
   │  ├─ MapResultList.tsx
   │  ├─ MapToolbar.tsx
   │  └─ MapPointDetailPanel.tsx
   ├─ details/
   │  ├─ ShelterDetailPanel.tsx
   │  └─ CameraDetailPanel.tsx
   ├─ mapLayers/
   │  ├─ shelterLayer.ts
   │  └─ cameraLayer.ts
   ├─ constants.ts
   ├─ types.ts
   └─ index.tsx
```

如果后续文件数量较少，可以在实施阶段合并同一职责下的文件，但不得破坏以下边界。

### 页面与业务层

`pages/emergency-map` 认识 `ShelterRecord`、`CameraRecord` 和业务字典，负责：

- 请求避难场所和摄像头地图数据。
- 持有图层开关、查询条件、当前选中点位和面板状态。
- 将业务记录映射为通用 `MapPoint`。
- 根据点位类型选择对应的右侧详情组件。
- 将用户操作转换为 `MapController` 命令。

该层不能导入或保存 `Viewer`、`Entity`、`Cartesian3` 等 Cesium 运行对象。

### 共享地图能力层

`features/map` 负责：

- 提供 React 地图画布容器。
- 管理底图、业务点位图层、相机和测量工具。
- 将业务无关的地图命令转换为 Cesium 操作。
- 将 Cesium 拾取结果转换为通用点位点击事件。

该层只认识 `MapPoint`、`MapLayerDefinition`、`MeasurementMode` 等通用契约，不读取业务 `payload` 的字段。

### Cesium 地图内核

`features/map/core` 是唯一集中持有 `Viewer` 的区域，负责：

- 创建、初始化和销毁 Viewer。
- 注册和移除屏幕拾取事件。
- 管理 Cesium DataSource、场景资源和内部对象索引。
- 保证初始化和销毁流程可重复调用。

内核不知道“避难场所”“摄像头”等业务概念，也不持有悬浮面板状态。

## 通用类型契约

```ts
/** 地理坐标。 */
export interface GeoPoint {
  /** 经度。 */
  longitude: number;
  /** 纬度。 */
  latitude: number;
  /** 高度，单位为米。 */
  height?: number;
}

/** 地图点位样式。 */
export interface MapPointStyle {
  /** 图标地址或受支持的图标标识。 */
  icon: string;
  /** 图标颜色。 */
  color?: string;
  /** 图标缩放比例。 */
  scale?: number;
}

/** 地图点位。 */
export interface MapPoint<TPayload = unknown, TKind extends string = string> {
  /** 点位在所属图层中的标识。 */
  id: string;
  /** 所属图层标识。 */
  layerId: string;
  /** 业务点位类型。 */
  kind: TKind;
  /** 点位名称。 */
  name: string;
  /** 地理位置。 */
  position: GeoPoint;
  /** 地图显示样式。 */
  style: MapPointStyle;
  /** 地图模块不解析的业务数据。 */
  payload: TPayload;
}

/** 地图点位引用，避免不同图层中的业务 ID 冲突。 */
export interface MapPointRef {
  /** 图层标识。 */
  layerId: string;
  /** 点位标识。 */
  pointId: string;
}

/** 点位点击事件。 */
export interface MapPointClick<TPoint extends MapPoint = MapPoint> {
  /** 被点击的通用点位。 */
  point: TPoint;
}
```

`payload` 可携带 `ShelterRecord` 或 `CameraRecord`，共享地图模块只能原样保存和返回。未来如果详情数据变得较重，可把 `payload` 改为轻量摘要，并在选中点位后按 ID 请求完整详情。

### MapController 门面

```ts
export interface MapController {
  setLayerVisible(layerId: string, visible: boolean): void;
  setLayerPoints(layerId: string, points: MapPoint[]): void;
  flyToPoint(point: MapPointRef): Promise<void>;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): Promise<void>;
  startMeasurement(mode: "distance" | "area"): void;
  cancelMeasurement(): void;
  clearMeasurement(): void;
  destroy(): void;
}
```

`CesiumMapCanvas` 通过 `onReady(controller)` 向页面交付门面，通过 `onPointClick(markerEvent)` 回传通用点位事件。页面把 controller 保存到 `useRef`，并把定位、图层切换等业务回调传给控制面板；控制面板不直接获取 Viewer。

## 状态归属

### React 页面持有

- `enabledLayerIds`：启用的业务图层，是图层可见性的唯一真值。
- 避难场所和摄像头筛选条件。
- `selectedPoint`：当前选中的通用点位。
- 左侧和右侧悬浮面板的开关状态。
- API 数据、加载状态和错误状态。
- `measurementMode`：当前测量模式。

### Cesium Runtime 持有

- Viewer 和场景资源。
- 各图层对应的 `CustomDataSource`。
- `MapPointRef` 与 Entity 的内部索引。
- 屏幕拾取事件处理器。
- 正在绘制的测量临时图形。
- 相机飞行等短期运行状态。

Runtime 中的状态不能成为业务真值。React 状态改变后通过 `MapController` 同步到 Runtime；Runtime 销毁时可以安全释放全部状态。

## 数据流

### 渲染避难场所

```text
Shelter Map API
  → ShelterRecord[]
  → shelterLayer 映射
  → MapPoint<ShelterRecord>[]
  → PointLayerController
  → CustomDataSource / Entity
  → Cesium Scene
```

### 点击避难场所

```text
用户点击 Entity
  → MapInteraction 拾取 MapPointRef
  → 查找对应 MapPoint
  → 触发 MapPointClick
  → 页面更新 selectedPoint
  → ShelterDetailPanel
```

### 图层开关

```text
用户切换图层
  → 页面更新 enabledLayerIds
  → controller.setLayerVisible(layerId, visible)
  → 对应 CustomDataSource.show 更新
```

React 的 `enabledLayerIds` 是唯一真值，Cesium 的 `show` 只是它在运行时的投影。

## 页面布局与交互

页面采用沉浸式悬浮面板布局：

- Cesium 地图填满页面内容区域。
- 左侧悬浮面板承载图层、筛选和结果列表，可折叠。
- 右侧垂直工具栏承载缩放、复位、测距、测面和清除。
- 点击点位后，在右侧打开稳定宽度的详情面板。
- 详情打开时，工具栏向地图内部偏移，不能与详情面板重叠。
- 点击地图空白区域或详情关闭按钮时取消选择。
- 地图容器的悬浮层只在实际控件区域接收指针事件，避免透明覆盖层阻断地图操作。

右侧详情根据 `selectedPoint.kind` 选择 `ShelterDetailPanel` 或 `CameraDetailPanel`。首期使用明确的静态映射，不建设动态插件注册系统。

## 图层系统

### 底图层

- 同一时间只启用一个底图。
- 首期提供默认底图和一个备用底图。
- 底图配置与业务图层配置分开。
- 底图服务商在实施阶段根据部署环境确认，不能在地图内核中硬编码。

### 业务图层

- 避难场所和摄像头各自使用独立 `CustomDataSource`。
- 每个点位必须携带明确的 `layerId`。
- 每个图层支持显隐、数量统计、图例、筛选和独立聚合配置。
- 避难场所按运营状态显示颜色。
- 摄像头按在线、离线状态显示颜色或图标。
- 选中点位拥有独立高亮样式。
- 图层面板显示筛选后的可见点位数和无效坐标数量。

### 临时工具层

- 测距和测面产生的线、面、顶点及标签放入独立 DataSource。
- 临时工具层不显示在业务图层列表中。
- 清除测量结果不能影响底图和业务图层。

## 基础地图工具

首期提供：

- 放大和缩小。
- 返回预设初始视角。
- 飞行定位到指定点位。
- 测量距离。
- 测量面积。
- 结束、取消和清除测量结果。

测距与测面互斥，同一时间只能激活一种模式。切换模式、按 `Esc`、离开路由或销毁 Viewer 时，必须移除当前测量事件处理器。测量过程中产生的临时对象由 `MeasurementController` 统一管理。

## 首期业务能力

### 避难场所

- 按名称、场所形态、应急用途和运营状态筛选。
- 按运营状态显示图标颜色和图例。
- 详情显示容量、设施、地址、管理单位和联系人等已有数据。
- 从结果列表飞行定位到地图点位。
- 从地图点位打开右侧详情。

### 摄像头

摄像头数据模型首期至少包含：

- ID、名称和设备编号。
- 所属区域和安装位置。
- 经纬度坐标。
- 在线状态。
- 最后更新时间。

支持按名称、所属区域和在线状态筛选，区分在线和离线图标。首期详情面板不显示抓拍图或实时视频，但可以保留不渲染的媒体区域扩展位置。

### 通用体验

- 图层点位聚合。
- 选中点位高亮。
- 地图与结果列表双向联动。
- 无效坐标跳过渲染并计数。
- 加载、空结果和图层错误状态。

## 地图数据接口

地图页不通过扩大 `pageSize` 复用后台 CRUD 分页接口。建议提供地图专用轻量接口：

```text
GET /api/map/shelters
GET /api/map/cameras
```

首期接口支持对应业务筛选，并返回地图展示和右侧详情所需字段。数据量增大后增加视口范围参数：

```text
west / south / east / north
```

届时由页面对相机变化做节流，只请求当前视口附近的数据。首期数据量未达到必要规模前，不实现视口请求和缓存淘汰。

## Cesium 与 Vite 配置

### 依赖

```text
cesium
vite-plugin-static-copy
```

### 静态资源

Cesium 需要在运行环境中访问以下目录：

```text
Workers
ThirdParty
Assets
Widgets
```

Vite 构建时将这些目录复制到 `cesiumStatic`。`CESIUM_BASE_URL` 必须结合现有 `VITE_BASE_PATH` 生成，保证根路径开发和子路径部署均能访问：

```text
<VITE_BASE_PATH>/cesiumStatic/Workers
<VITE_BASE_PATH>/cesiumStatic/ThirdParty
<VITE_BASE_PATH>/cesiumStatic/Assets
<VITE_BASE_PATH>/cesiumStatic/Widgets
```

Widgets CSS 只导入一次。Cesium 代码只被 `emergency-map` 路由引用，让现有懒加载路由把 Cesium 隔离到地图页面代码块中。

### Viewer 初始化

- 关闭 animation、timeline、geocoder、baseLayerPicker、infoBox、selectionIndicator、homeButton、sceneModePicker 和 navigationHelpButton 等重复内置控件。
- 开启 `requestRenderMode`，数据或样式变化后由控制器请求重新渲染。
- 保留 Cesium 和底图服务商要求的版权信息。
- 初始视角放在页面配置中，不硬编码到 Runtime。
- 底图和地形作为初始化配置传入，不在内核中绑定具体服务商。

如果使用 Cesium ion，令牌读取 `VITE_CESIUM_ION_TOKEN`，并在 `.env.example` 中说明用途。真实令牌不能提交到仓库。

## 异常处理

- Viewer 初始化失败：显示整页错误状态和重新加载入口，不显示不可用的控制面板。
- 单个业务图层请求失败：仅标记对应图层失败，其他图层继续工作。
- 默认底图失败：尝试切换备用底图并提示用户。
- 坐标缺失、非数字或越界：跳过该点位并增加异常数据计数。
- 定位目标不存在：取消飞行并显示轻提示。
- 点位在数据刷新后消失：清空对应的 `selectedPoint` 和详情面板。
- 测量异常退出：统一清理事件处理器、动态属性和临时图形。
- Runtime 的 `destroy()` 可重复调用；重复调用不能抛出异常。

## 性能策略

- 首期使用 `Entity + CustomDataSource`，优先保证业务交互和维护成本。
- 每个业务图层独立启用和配置聚合。
- `PointLayerController` 使用 `MapPointRef` 维护索引，按 ID 增量新增、更新和删除 Entity。
- 筛选和数据刷新不能无条件销毁重建全部 DataSource。
- 相机移动事件不直接触发高频 React `setState`。
- 图标、颜色和 Cesium 属性对象尽量复用。
- 静态场景使用按需渲染。
- 页面卸载时销毁 Viewer、DataSource、事件处理器和仍在执行的异步任务。

只有实际性能分析证明 Entity 无法满足目标数据规模后，才将内部渲染替换为 `BillboardCollection` 或 `PointPrimitiveCollection`。替换时保持 `MapController` 和 `MapPoint` 契约不变。

## 验证策略

### 自动验证

- `ShelterRecord` 到 `MapPoint` 的映射。
- `CameraRecord` 到 `MapPoint` 的映射。
- 坐标合法性判断。
- 图层显隐和点位增量更新。
- Cesium 拾取结果到 `MapPointClick` 的归一化。
- 距离、面积结果格式化。
- Runtime 初始化和销毁的幂等性。
- 执行 `pnpm lint` 和 `pnpm build`。

项目目前没有测试脚本。实施时引入 Vitest，补充 `pnpm test`，优先测试不依赖 WebGL 的纯函数和控制器契约，不做脆弱的像素级 Cesium 单元测试。

### 浏览器手动验证

- 连续进入和离开地图路由，确认没有重复 Viewer 和重复事件。
- 底图切换、业务图层显隐、筛选、聚合和点位计数。
- 地图点位与结果列表双向定位。
- 避难场所和摄像头详情切换。
- 测距、测面、结束、取消和清除。
- 缺少令牌、图层请求失败、底图失败和无效坐标场景。
- 子路径部署下 Workers、Assets 和 Widgets 不出现 404。
- 比较多次进入地图前后的内存和事件监听数量。

## 后续演进方向

后续能力按独立业务需求逐项设计，不纳入首期实现计划：

- 事件点及事件影响范围。
- 附近避难场所搜索，并按距离和可用容量排序。
- 避难场所服务半径和覆盖盲区。
- 摄像头方向角、视域范围、抓拍图和实时视频。
- 疏散路线和应急资源调度。
- 容量热力图、统计专题和时间轴。

这些能力优先通过新增业务图层、详情组件或独立分析控制器实现。只有出现多个独立团队动态接入模块的真实需求后，才评估插件注册系统和全局地图状态管理。

## 首期完成标准

- 新增独立“应急一张图”路由和菜单入口。
- Cesium 在开发和生产子路径中正常初始化，无静态资源 404。
- 避难场所和摄像头可以独立加载、筛选、显隐和聚合。
- 地图点位、结果列表和右侧详情可以稳定联动。
- 缩放、初始视角、测距、测面和清除可用。
- 页面多次挂载和卸载后不存在重复 Viewer 或遗留事件。
- 地图模块不反向依赖业务页面，业务组件不直接操作 Viewer。
- 自动验证、`pnpm lint`、`pnpm test` 和 `pnpm build` 通过。
