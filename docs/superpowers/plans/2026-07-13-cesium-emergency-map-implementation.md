# Cesium 应急一张图实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 React + TypeScript + Vite 项目中新增独立“应急一张图”页面，建立可复用的 Cesium 地图内核、点位图层、相机与测量能力，并完成避难场所和摄像头的展示查询联动。

**Architecture:** 使用“地图内核 + 能力模块 + 业务图层”三层结构。`src/features/map` 集中管理 Viewer、图层、拾取、相机和测量，`src/pages/emergency-map` 负责业务数据、筛选、悬浮面板和详情；后台 CRUD 页面不直接依赖 Cesium。

**Tech Stack:** React 19、TypeScript 5.9、Vite 8、CesiumJS、Ant Design 6、Tailwind CSS 3、Axios、vite-plugin-mock、Vitest、Testing Library。

## Global Constraints

- 默认使用中文说明、JSDoc、界面文案和 Markdown；代码、API、库名与专业术语保持原名。
- React 页面和业务组件不得获取 `Viewer`、`Entity`、`Cartesian3`。
- `src/features/map` 不得读取 `ShelterRecord`、`CameraRecord` 或业务 `payload` 字段。
- 业务图层显隐以 React 的 `enabledLayerIds` 为唯一真值。
- 地图点位引用必须同时包含 `layerId` 和 `pointId`，不能假设跨图层 ID 唯一。
- 首期不引入 Resium、Redux、Zustand、全局事件总线或高德兼容接口。
- 首期不加载全球地形、OSM Buildings、其他 3D Tiles、摄像头抓拍图或实时视频。
- Cesium 静态资源路径必须跟随 `VITE_BASE_PATH`，开发和生产子路径均不得出现资源 404。
- 每个任务只提交该任务列出的文件，不得夹带当前工作区中的避难场所页面、API、Mock 或其他用户改动。

---

## 文件结构总览

计划最终新增或修改以下文件：

```text
build/
└─ cesiumBuildConfig.ts

mock/map/
├─ camera.mock.ts
└─ shelter-map.mock.ts

src/api/
└─ emergencyMap.ts

src/assets/map/
├─ camera-marker.svg
└─ shelter-marker.svg

src/features/map/
├─ camera/CameraController.ts
├─ components/CesiumMapCanvas.tsx
├─ core/CesiumMapRuntime.ts
├─ core/MapInteraction.ts
├─ core/runtimeTypes.ts
├─ layers/BaseMapController.ts
├─ layers/PointLayerController.ts
├─ layers/types.ts
├─ tools/MeasurementController.ts
├─ tools/measurementMath.ts
├─ tools/types.ts
├─ MapController.ts
├─ coordinate.ts
└─ types.ts

src/pages/emergency-map/
├─ components/MapLayerPanel.tsx
├─ components/MapPointDetailPanel.tsx
├─ components/MapResultList.tsx
├─ components/MapSearchPanel.tsx
├─ components/MapToolbar.tsx
├─ details/CameraDetailPanel.tsx
├─ details/ShelterDetailPanel.tsx
├─ mapLayers/cameraLayer.ts
├─ mapLayers/shelterLayer.ts
├─ constants.ts
├─ index.tsx
└─ types.ts

src/test/setup.ts
src/types/cesium.d.ts
.env.example
vitest.config.ts
```

现有文件修改范围：

```text
package.json
pnpm-lock.yaml
vite.config.ts
tsconfig.node.json
src/layouts/MainLayout/index.tsx
src/layouts/MainLayout/Content.tsx
src/router/types.ts
src/router/transform.tsx
src/router/mockRoutes.ts
src/router/menu.tsx
src/i18n/locales/zh-CN.ts
src/i18n/locales/en-US.ts
```

---

### Task 1: 建立测试环境和 Cesium 构建配置

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `vite.config.ts`
- Modify: `tsconfig.node.json`
- Create: `build/cesiumBuildConfig.ts`
- Create: `build/cesiumBuildConfig.test.ts`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/types/cesium.d.ts`
- Create: `.env.example`

**Interfaces:**
- Consumes: `VITE_BASE_PATH`，缺省值为 `/`。
- Produces: `normalizeBasePath(basePath: string): string`、`getCesiumBaseUrl(basePath: string): string`、可运行的 `pnpm test`。

- [ ] **Step 1: 安装运行和测试依赖**

Run:

```powershell
pnpm.cmd add cesium
pnpm.cmd add -D vite-plugin-static-copy vitest jsdom @testing-library/react @testing-library/jest-dom
```

Expected: `package.json` 出现上述依赖，`pnpm-lock.yaml` 更新，命令退出码为 0。

- [ ] **Step 2: 添加测试脚本和 Vitest 配置**

在 `package.json` 的 `scripts` 中增加：

```json
"test": "vitest run"
```

创建 `vitest.config.ts`：

```ts
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
  },
});
```

创建 `src/test/setup.ts`：

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: 先写 Cesium 基础路径失败测试**

创建 `build/cesiumBuildConfig.test.ts`：

```ts
import { describe, expect, it } from "vitest";

import { getCesiumBaseUrl, normalizeBasePath } from "./cesiumBuildConfig";

describe("Cesium 构建路径", () => {
  it.each([
    ["/", "/"],
    ["demo", "/demo/"],
    ["/demo", "/demo/"],
    ["/demo/", "/demo/"],
  ])("把 %s 规范化为 %s", (input, expected) => {
    expect(normalizeBasePath(input)).toBe(expected);
  });

  it("生成跟随 Vite base 的 Cesium 静态资源目录", () => {
    expect(getCesiumBaseUrl("/demo/")).toBe("/demo/cesiumStatic/");
  });
});
```

- [ ] **Step 4: 运行测试确认失败**

Run:

```powershell
pnpm.cmd test -- build/cesiumBuildConfig.test.ts
```

Expected: FAIL，提示无法找到 `./cesiumBuildConfig`。

- [ ] **Step 5: 实现构建路径并接入 Vite**

创建 `build/cesiumBuildConfig.ts`：

```ts
/** 规范化 Vite 部署基础路径。 */
export function normalizeBasePath(basePath: string) {
  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

/** 生成 Cesium 静态资源的公开访问路径。 */
export function getCesiumBaseUrl(basePath: string) {
  return `${normalizeBasePath(basePath)}cesiumStatic/`;
}
```

把 `tsconfig.node.json` 的 `include` 改为：

```json
["vite.config.ts", "vitest.config.ts", "build/**/*.ts"]
```

在 `vite.config.ts` 中：

```ts
import { viteStaticCopy } from "vite-plugin-static-copy";
import { getCesiumBaseUrl, normalizeBasePath } from "./build/cesiumBuildConfig";

const cesiumSource = "node_modules/cesium/Build/Cesium";
```

在配置函数内部先计算：

```ts
const base = normalizeBasePath(process.env.VITE_BASE_PATH ?? "/");
const cesiumBaseUrl = getCesiumBaseUrl(base);
```

将 `base` 改为上述变量，在 `plugins` 中追加：

```ts
viteStaticCopy({
  targets: [
    { src: `${cesiumSource}/Workers`, dest: "cesiumStatic" },
    { src: `${cesiumSource}/ThirdParty`, dest: "cesiumStatic" },
    { src: `${cesiumSource}/Assets`, dest: "cesiumStatic" },
    { src: `${cesiumSource}/Widgets`, dest: "cesiumStatic" },
  ],
}),
```

在 Vite 配置顶层增加：

```ts
define: {
  CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl),
},
```

创建 `src/types/cesium.d.ts`：

```ts
/** Cesium Workers、Assets 和 Widgets 的公开基础路径。 */
declare const CESIUM_BASE_URL: string;
```

创建 `.env.example`：

```dotenv
# 应用部署基础路径，本地开发使用 /
VITE_BASE_PATH=/

# 使用 Cesium ion 资产时填写受限访问令牌；不使用 ion 时保持为空
VITE_CESIUM_ION_TOKEN=
```

- [ ] **Step 6: 验证测试和生产构建**

Run:

```powershell
pnpm.cmd test -- build/cesiumBuildConfig.test.ts
pnpm.cmd build
```

Expected: 测试 PASS；构建成功；`dist/cesiumStatic` 下包含四个静态资源目录。

- [ ] **Step 7: 提交任务**

```powershell
git add package.json pnpm-lock.yaml vite.config.ts tsconfig.node.json vitest.config.ts build src/test src/types/cesium.d.ts .env.example
git commit -m "build: configure Cesium and Vitest"
```

**Checkpoint 1A:** Cesium 依赖、静态资源与测试环境就绪，尚未创建 Viewer。

---

### Task 2: 定义共享地图契约和坐标校验

**Files:**
- Create: `src/features/map/types.ts`
- Create: `src/features/map/coordinate.ts`
- Create: `src/features/map/coordinate.test.ts`

**Interfaces:**
- Consumes: 无。
- Produces: `GeoPoint`、`MapPoint`、`MapPointRef`、`MapPointClick`、`MapController`、`isValidGeoPoint()`、`getMapPointKey()`。

- [ ] **Step 1: 写失败测试**

创建 `src/features/map/coordinate.test.ts`：

```ts
import { describe, expect, it } from "vitest";

import { getMapPointKey, isValidGeoPoint } from "./coordinate";

describe("地图坐标", () => {
  it("接受合法经纬度", () => {
    expect(isValidGeoPoint({ longitude: 120.2, latitude: 30.2 })).toBe(true);
  });

  it.each([
    { longitude: 181, latitude: 30 },
    { longitude: 120, latitude: 91 },
    { longitude: Number.NaN, latitude: 30 },
  ])("拒绝越界或非数字坐标", (point) => {
    expect(isValidGeoPoint(point)).toBe(false);
  });

  it("使用图层和点位 ID 生成无冲突键", () => {
    expect(getMapPointKey({ layerId: "shelters", pointId: "001" })).toBe(
      "shelters:001",
    );
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm.cmd test -- src/features/map/coordinate.test.ts`

Expected: FAIL，提示模块或导出不存在。

- [ ] **Step 3: 定义类型契约**

创建 `src/features/map/types.ts`，完整定义设计文档中的类型，并使用以下稳定签名：

```ts
export interface GeoPoint {
  longitude: number;
  latitude: number;
  height?: number;
}

export interface MapPointStyle {
  icon: string;
  color?: string;
  scale?: number;
}

export interface MapPoint<TPayload = unknown, TKind extends string = string> {
  id: string;
  layerId: string;
  kind: TKind;
  name: string;
  position: GeoPoint;
  style: MapPointStyle;
  payload: TPayload;
}

export interface MapPointRef {
  layerId: string;
  pointId: string;
}

export interface MapPointClick<TPoint extends MapPoint = MapPoint> {
  point: TPoint;
}

export type MeasurementMode = "distance" | "area";

export interface MapController {
  setLayerVisible(layerId: string, visible: boolean): void;
  setLayerPoints(layerId: string, points: MapPoint[]): void;
  flyToPoint(point: MapPointRef): Promise<void>;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): Promise<void>;
  startMeasurement(mode: MeasurementMode): void;
  cancelMeasurement(): void;
  clearMeasurement(): void;
  destroy(): void;
}
```

- [ ] **Step 4: 实现坐标工具**

创建 `src/features/map/coordinate.ts`：

```ts
import type { GeoPoint, MapPointRef } from "./types";

/** 判断坐标是否可用于地图定位。 */
export function isValidGeoPoint(point: GeoPoint) {
  return (
    Number.isFinite(point.longitude) &&
    Number.isFinite(point.latitude) &&
    point.longitude >= -180 &&
    point.longitude <= 180 &&
    point.latitude >= -90 &&
    point.latitude <= 90
  );
}

/** 生成图层内点位的稳定索引键。 */
export function getMapPointKey({ layerId, pointId }: MapPointRef) {
  return `${layerId}:${pointId}`;
}
```

- [ ] **Step 5: 验证并提交**

Run: `pnpm.cmd test -- src/features/map/coordinate.test.ts`

Expected: PASS。

```powershell
git add src/features/map/types.ts src/features/map/coordinate.ts src/features/map/coordinate.test.ts
git commit -m "feat: define shared map contracts"
```

---

### Task 3: 实现 Viewer 生命周期和 React 画布桥接

**Files:**
- Create: `src/features/map/core/runtimeTypes.ts`
- Create: `src/features/map/core/CesiumMapRuntime.ts`
- Create: `src/features/map/core/CesiumMapRuntime.test.ts`
- Create: `src/features/map/components/CesiumMapCanvas.tsx`
- Create: `src/features/map/components/CesiumMapCanvas.test.tsx`
- Create: `src/features/map/MapController.ts`

**Interfaces:**
- Consumes: Task 2 的 `MapController`、`MapPointClick`、`GeoPoint`。
- Produces: `CesiumMapRuntime.initialize(container)`、幂等 `destroy()`、`CesiumMapCanvas` 的 `onReady` 与 `onPointClick`。

- [ ] **Step 1: 写 Runtime 生命周期失败测试**

测试使用注入的 `viewerFactory`，断言：初始化一次只创建一个 Viewer；连续两次 `destroy()` 只销毁一次；销毁后允许重新初始化。测试文件必须使用最小 Fake Viewer，不启动 WebGL。

```ts
it("幂等创建和销毁 Viewer", () => {
  const destroy = vi.fn();
  const viewerFactory = vi.fn(() => ({ destroy, isDestroyed: () => false }));
  const runtime = new CesiumMapRuntime({ viewerFactory });
  const container = document.createElement("div");

  runtime.initialize(container);
  runtime.initialize(container);
  runtime.destroy();
  runtime.destroy();

  expect(viewerFactory).toHaveBeenCalledTimes(1);
  expect(destroy).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm.cmd test -- src/features/map/core/CesiumMapRuntime.test.ts`

Expected: FAIL，提示 `CesiumMapRuntime` 不存在。

- [ ] **Step 3: 实现 Runtime**

在 `runtimeTypes.ts` 定义用于测试注入的最小契约：

```ts
import type { Viewer } from "cesium";

export type ViewerFactory = (
  container: HTMLElement,
  options: Viewer.ConstructorOptions,
) => Viewer;
```

`CesiumMapRuntime` 必须：

- 默认使用 `new Viewer(container, options)`。
- 关闭设计文档列出的内置控件。
- 设置 `requestRenderMode: true`。
- 若 `VITE_CESIUM_ION_TOKEN` 非空，则初始化 `Ion.defaultAccessToken`。
- `initialize()` 已初始化时直接返回既有 Viewer。
- `destroy()` 先销毁后把内部引用设为 `null`。
- 提供 `getViewer()`；未初始化时抛出中文错误 `地图尚未初始化`。

- [ ] **Step 4: 写 React StrictMode 失败测试**

`CesiumMapCanvas.test.tsx` 注入 fake runtime，使用 `render`、`unmount`，断言挂载调用 `initialize`，卸载调用 `destroy`，`onReady` 只在成功初始化后调用。

- [ ] **Step 5: 实现 CesiumMapCanvas 和控制器组合入口**

`CesiumMapCanvas` 属性固定为：

```ts
interface CesiumMapCanvasProps {
  className?: string;
  initialView: {
    longitude: number;
    latitude: number;
    height: number;
  };
  onReady: (controller: MapController) => void;
  onPointClick: (markerEvent: MapPointClick) => void;
  onInitializationError: (error: Error) => void;
}
```

组件导入一次：

```ts
import "cesium/Build/Cesium/Widgets/widgets.css";
```

使用 `containerRef` 和单个 `useEffect` 创建 Runtime；cleanup 只调用 controller 的 `destroy()`。不要把 controller 放入 React state。

`src/features/map/MapController.ts` 首期先组合 Runtime 并为尚未接入的图层、相机和测量方法抛出明确错误；后续任务逐个替换。不可向页面暴露 `getViewer()`。

- [ ] **Step 6: 验证并提交**

Run:

```powershell
pnpm.cmd test -- src/features/map/core/CesiumMapRuntime.test.ts src/features/map/components/CesiumMapCanvas.test.tsx
pnpm.cmd build
```

Expected: 测试和构建通过。

```powershell
git add src/features/map/core src/features/map/components src/features/map/MapController.ts
git commit -m "feat: add Cesium runtime lifecycle"
```

**Checkpoint 1B:** 可以在隔离测试中创建和销毁地图 Runtime，React 画布已具备接入页面的稳定契约。

---

### Task 4: 实现业务点位图层和拾取事件

**Files:**
- Create: `src/features/map/layers/types.ts`
- Create: `src/features/map/layers/PointLayerController.ts`
- Create: `src/features/map/layers/PointLayerController.test.ts`
- Create: `src/features/map/core/MapInteraction.ts`
- Create: `src/features/map/core/MapInteraction.test.ts`
- Modify: `src/features/map/MapController.ts`
- Modify: `src/features/map/components/CesiumMapCanvas.tsx`

**Interfaces:**
- Consumes: `MapPoint`、`MapPointRef`、`getMapPointKey()`、初始化后的 Viewer。
- Produces: `setLayerPoints()`、`setLayerVisible()`、`getPointByEntity()`、`MapPointClick`、空白点击清空事件。

- [ ] **Step 1: 写图层增量更新失败测试**

测试创建 `PointLayerController` 和 fake DataSource collection，先写入两个点，再写入一个更新点和一个新点，断言最终索引数量为 2，旧点已删除，保留点复用原 Entity。

测试点固定使用：

```ts
const shelterPoint: MapPoint = {
  id: "001",
  layerId: "shelters",
  kind: "shelter",
  name: "中心体育馆",
  position: { longitude: 120.2, latitude: 30.2 },
  style: { icon: "/marker.svg", color: "#16a34a", scale: 1 },
  payload: {},
};
```

- [ ] **Step 2: 实现 PointLayerController**

控制器必须为每个 `layerId` 创建一个 `CustomDataSource`，内部索引使用：

```ts
Map<string, { entity: Entity; point: MapPoint }>
```

键由 `getMapPointKey()` 生成。`setLayerPoints()` 执行三段式 diff：删除不存在的键、更新已有 Entity、创建新 Entity。`setLayerVisible()` 只更新 `CustomDataSource.show` 并请求场景渲染。

Entity 使用 `position` 和 `billboard`；点位名称写入 `name`，不使用 Cesium `description` 或默认 InfoBox。

- [ ] **Step 3: 写拾取事件失败测试**

测试 `resolveMapPointFromPick(pickedObject, pointLayerController)`：拾取到已登记 Entity 返回 `MapPoint`；拾取空白、未知对象返回 `null`。

- [ ] **Step 4: 实现 MapInteraction**

`MapInteraction` 使用一个 `ScreenSpaceEventHandler(viewer.scene.canvas)`：

- `LEFT_CLICK` 调用 `viewer.scene.pick(position)`。
- 已知点位调用 `onPointClick({ point })`。
- 空白调用 `onMapBlankClick()`。
- `destroy()` 移除 handler，且可重复调用。

- [ ] **Step 5: 接入 MapController 和画布事件**

`MapController.setLayerPoints()`、`setLayerVisible()` 委托给 `PointLayerController`。`CesiumMapCanvas` 把 `onPointClick` 交给 `MapInteraction`，空白点击使用新增可选属性：

```ts
onMapBlankClick?: () => void;
```

- [ ] **Step 6: 验证并提交**

Run: `pnpm.cmd test -- src/features/map/layers src/features/map/core/MapInteraction.test.ts`

Expected: PASS。

```powershell
git add src/features/map/layers src/features/map/core/MapInteraction.ts src/features/map/core/MapInteraction.test.ts src/features/map/MapController.ts src/features/map/components/CesiumMapCanvas.tsx
git commit -m "feat: add map point layers and picking"
```

---

### Task 5: 实现相机控制和初始视角

**Files:**
- Create: `src/features/map/camera/CameraController.ts`
- Create: `src/features/map/camera/CameraController.test.ts`
- Modify: `src/features/map/MapController.ts`

**Interfaces:**
- Consumes: Viewer、`MapPointRef`、`PointLayerController`。
- Produces: `zoomIn()`、`zoomOut()`、`resetView()`、`flyToPoint()`。

- [ ] **Step 1: 写失败测试**

使用 fake camera，断言：

- `zoomIn()` 调用 `camera.zoomIn(currentHeight * 0.2)`。
- `zoomOut()` 调用 `camera.zoomOut(currentHeight * 0.2)`。
- `resetView()` 飞行到传入的初始经纬度和高度。
- 未找到 `MapPointRef` 时 `flyToPoint()` reject `地图点位不存在`。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm.cmd test -- src/features/map/camera/CameraController.test.ts`

Expected: FAIL，提示控制器不存在。

- [ ] **Step 3: 实现 CameraController**

构造参数固定为：

```ts
interface CameraControllerOptions {
  viewer: Viewer;
  pointLayers: PointLayerController;
  initialView: { longitude: number; latitude: number; height: number };
}
```

`flyToPoint()` 根据 `MapPointRef` 获取 Entity，并调用 `viewer.flyTo(entity, { duration: 0.8 })`。`resetView()` 使用 `camera.flyTo()`。所有 Promise 方法返回 Cesium 操作完成结果转换后的 `Promise<void>`。

- [ ] **Step 4: 接入门面、验证和提交**

Run: `pnpm.cmd test -- src/features/map/camera/CameraController.test.ts`

Expected: PASS。

```powershell
git add src/features/map/camera src/features/map/MapController.ts
git commit -m "feat: add map camera controls"
```

---

### Task 6: 实现距离和面积测量

**Files:**
- Create: `src/features/map/tools/types.ts`
- Create: `src/features/map/tools/measurementMath.ts`
- Create: `src/features/map/tools/measurementMath.test.ts`
- Create: `src/features/map/tools/MeasurementController.ts`
- Create: `src/features/map/tools/MeasurementController.test.ts`
- Modify: `src/features/map/MapController.ts`

**Interfaces:**
- Consumes: Viewer、`MeasurementMode`。
- Produces: `calculateSurfaceDistance()`、`calculatePolygonArea()`、`formatDistance()`、`formatArea()`、测量模式互斥生命周期。

- [ ] **Step 1: 写测量数学失败测试**

至少覆盖：相同点距离为 0；约 1 公里距离格式化为 `1.00 km`；999 平方米显示 `999.00 m²`；10000 平方米显示 `1.00 ha`；三点多边形面积大于 0。

- [ ] **Step 2: 实现纯计算函数**

- 距离使用 `EllipsoidGeodesic.surfaceDistance`，并合并相邻点的高度差。
- 面积使用 `EllipsoidTangentPlane.fromPoints()` 投影到局部二维平面，再使用鞋带公式计算。
- `formatDistance()` 在 1000 米处切换到 km。
- `formatArea()` 在 10000 平方米处切换到 ha。

- [ ] **Step 3: 写控制器生命周期失败测试**

使用可注入的 handler factory，断言调用 `start("distance")` 后再调用 `start("area")` 会先销毁旧 handler；`cancel()` 和 `destroy()` 可重复调用；`clear()` 只清理测量 DataSource。

- [ ] **Step 4: 实现 MeasurementController**

控制器使用独立 `CustomDataSource("measurements")`。交互规则固定为：

- 左键添加顶点。
- 鼠标移动更新动态线或面。
- 右键完成当前测量。
- `Esc` 取消当前未完成测量。
- `clear()` 清除所有完成和未完成图形。
- 切换模式先调用 `cancel()`。

测距至少需要 2 个点，测面至少需要 3 个点；不足时右键等同于取消。

- [ ] **Step 5: 接入门面、验证和提交**

Run:

```powershell
pnpm.cmd test -- src/features/map/tools
pnpm.cmd build
```

Expected: PASS，构建成功。

```powershell
git add src/features/map/tools src/features/map/MapController.ts
git commit -m "feat: add distance and area measurement"
```

**Checkpoint 2:** 共享地图模块已经具备点位图层、拾取、相机和测量能力，且不依赖任何应急业务类型。

---

### Task 7: 建立地图专用业务数据和 Mock API

**Files:**
- Create: `src/pages/emergency-map/types.ts`
- Create: `src/api/emergencyMap.ts`
- Create: `mock/map/shelter-map.mock.ts`
- Create: `mock/map/camera.mock.ts`
- Modify: `mock/system-management/shelter.mock.ts`
- Create: `src/api/emergencyMap.test.ts`

**Interfaces:**
- Consumes: 现有 `ShelterRecord`、Axios `request`。
- Produces: `CameraRecord`、`EmergencyMapQuery`、`EmergencyMapData`、`getShelterMapData()`、`getCameraMapData()`。

- [ ] **Step 1: 定义首期摄像头和查询类型**

`types.ts` 使用以下契约：

```ts
import type { GeoPoint } from "@/features/map/types";
import type {
  ShelterFacilityType,
  ShelterOperationStatus,
  ShelterUsage,
} from "@/pages/system-management/shelter-management/types";

export type CameraOnlineStatus = "online" | "offline";

export interface CameraRecord {
  id: string;
  name: string;
  deviceCode: string;
  region: string;
  installationAddress: string;
  location: GeoPoint;
  onlineStatus: CameraOnlineStatus;
  updatedAt: string;
}

export interface EmergencyMapQuery {
  keyword?: string;
  region?: string;
  shelterFacilityType?: ShelterFacilityType;
  shelterUsage?: ShelterUsage;
  operationStatus?: ShelterOperationStatus;
  cameraOnlineStatus?: CameraOnlineStatus;
}

export interface EmergencyMapLayerResult<T> {
  list: T[];
  total: number;
}
```

- [ ] **Step 2: 写 API 失败测试**

Mock `@/utils/request`，断言：

```ts
expect(request.get).toHaveBeenCalledWith("/map/shelters", { params });
expect(request.get).toHaveBeenCalledWith("/map/cameras", { params });
```

- [ ] **Step 3: 实现 API 包装**

```ts
export function getShelterMapData(params: EmergencyMapQuery) {
  return request.get<
    EmergencyMapLayerResult<ShelterRecord>,
    EmergencyMapLayerResult<ShelterRecord>
  >("/map/shelters", { params });
}

export function getCameraMapData(params: EmergencyMapQuery) {
  return request.get<
    EmergencyMapLayerResult<CameraRecord>,
    EmergencyMapLayerResult<CameraRecord>
  >("/map/cameras", { params });
}
```

- [ ] **Step 4: 实现 Mock 路由**

- 在 `mock/system-management/shelter.mock.ts` 导出以下只读访问函数，不能复制或暴露可直接修改的数组引用：

```ts
/** 获取地图接口使用的最新避难场所快照。 */
export function getShelterMockRecords() {
  return [...shelters];
}
```

- `/api/map/shelters` 调用 `getShelterMockRecords()`，确保后台新增、编辑和删除后地图接口读取同一份运行时数据；支持 `keyword`、`shelterFacilityType`、`shelterUsage`、`operationStatus`。
- `/api/map/cameras` 至少提供 6 个杭州区域摄像头样例，包含在线和离线状态，支持 `keyword`、`region`、`cameraOnlineStatus`。
- 两个接口统一返回 `{ list, total }`，不分页。
- Mock 方法使用中文 JSDoc，类型结构沿用当前 `ShelterMockMethod` 风格。

- [ ] **Step 5: 验证并提交**

Run: `pnpm.cmd test -- src/api/emergencyMap.test.ts`

Expected: PASS。

```powershell
git add src/pages/emergency-map/types.ts src/api/emergencyMap.ts src/api/emergencyMap.test.ts mock/map mock/system-management/shelter.mock.ts
git commit -m "feat: add emergency map data APIs"
```

---

### Task 8: 实现避难场所和摄像头地图适配器

**Files:**
- Create: `src/assets/map/shelter-marker.svg`
- Create: `src/assets/map/camera-marker.svg`
- Create: `src/pages/emergency-map/constants.ts`
- Create: `src/pages/emergency-map/mapLayers/shelterLayer.ts`
- Create: `src/pages/emergency-map/mapLayers/shelterLayer.test.ts`
- Create: `src/pages/emergency-map/mapLayers/cameraLayer.ts`
- Create: `src/pages/emergency-map/mapLayers/cameraLayer.test.ts`

**Interfaces:**
- Consumes: `ShelterRecord`、`CameraRecord`、`MapPoint`、`isValidGeoPoint()`。
- Produces: `toShelterMapPoints()`、`toCameraMapPoints()`，返回 `{ points, invalidCount }`。

- [ ] **Step 1: 写避难场所映射失败测试**

断言：

- `layerId` 固定为 `shelters`，`kind` 固定为 `shelter`。
- `operationStatus=open` 使用绿色，`full` 使用红色，`maintenance` 使用橙色，`closed` 使用灰色。
- 无效坐标不进入 `points`，计入 `invalidCount`。
- `payload` 保持原 `ShelterRecord` 引用。

- [ ] **Step 2: 实现避难场所适配器**

签名固定为：

```ts
export function toShelterMapPoints(records: ShelterRecord[]): {
  points: MapPoint<ShelterRecord, "shelter">[];
  invalidCount: number;
}
```

- [ ] **Step 3: 写摄像头映射失败测试并实现**

断言在线使用蓝色、离线使用灰色；`layerId` 为 `cameras`，`kind` 为 `camera`；无效坐标处理与避难场所一致。

签名固定为：

```ts
export function toCameraMapPoints(records: CameraRecord[]): {
  points: MapPoint<CameraRecord, "camera">[];
  invalidCount: number;
}
```

- [ ] **Step 4: 创建简洁 SVG 标记资源**

两个 SVG 使用单色白色图形和透明背景，由 Cesium billboard 的 `color` 决定状态颜色；不得在 SVG 内写业务状态颜色。

- [ ] **Step 5: 验证并提交**

Run: `pnpm.cmd test -- src/pages/emergency-map/mapLayers`

Expected: PASS。

```powershell
git add src/assets/map src/pages/emergency-map/constants.ts src/pages/emergency-map/mapLayers
git commit -m "feat: map emergency business records to points"
```

---

### Task 9: 增加全幅内容布局、路由、菜单和国际化

**Files:**
- Modify: `src/router/types.ts`
- Modify: `src/router/transform.tsx`
- Modify: `src/router/mockRoutes.ts`
- Modify: `src/router/menu.tsx`
- Modify: `src/layouts/MainLayout/index.tsx`
- Modify: `src/layouts/MainLayout/Content.tsx`
- Modify: `src/i18n/locales/zh-CN.ts`
- Modify: `src/i18n/locales/en-US.ts`
- Create: `src/layouts/MainLayout/Content.test.tsx`

**Interfaces:**
- Consumes: React Router 当前匹配项。
- Produces: `BackendRouteMeta.contentLayout?: "default" | "full"`；`/emergency-map` 顶级路由。

- [ ] **Step 1: 写布局失败测试**

使用内存路由分别渲染普通页面和 `handle.contentLayout="full"` 页面，断言普通页面存在 `p-4` 和圆角容器，全幅页面不存在两层 padding 且内容容器具有 `h-full min-h-0 overflow-hidden`。

- [ ] **Step 2: 扩展路由元信息**

在 `BackendRouteMeta` 增加：

```ts
contentLayout?: "default" | "full";
```

`transformRoutes()` 把元信息同步到标准路由 `handle`：

```ts
handle: {
  contentLayout: route.meta?.contentLayout ?? "default",
},
```

- [ ] **Step 3: 调整布局滚动边界**

- `MainLayout` 外层改为 `h-screen overflow-hidden`。
- Header 保持 `h-14`。
- 内层 Layout 增加 `min-h-0 min-w-0`。
- `MainLayoutContent` 使用 `useMatches()` 获取最后一个带 `contentLayout` 的 handle。
- 默认模式继续保留外层和内层 `p-4`。
- full 模式取消 padding、圆角和背景卡片，让地图占满 Header 下方剩余区域。
- 默认模式 Content 使用 `overflow-auto`，回归验证避难场所长表格仍可滚动。

- [ ] **Step 4: 增加路由和菜单**

在 `mockRoutes` 增加顶级项：

```ts
{
  path: "emergency-map",
  name: "EmergencyMap",
  component: "emergency-map",
  meta: {
    title: "应急一张图",
    titleKey: "menu.emergencyMap",
    icon: "EnvironmentOutlined",
    showInMenu: true,
    order: 5,
    contentLayout: "full",
  },
}
```

原 `system-management` 的 order 调整为 6。`menu.tsx` 导入并注册 `EnvironmentOutlined`。

国际化增加：

```ts
emergencyMap: "应急一张图"
```

```ts
emergencyMap: "Emergency Map"
```

- [ ] **Step 5: 验证并提交**

Run:

```powershell
pnpm.cmd test -- src/layouts/MainLayout/Content.test.tsx
pnpm.cmd build
```

Expected: PASS；动态路由能够找到 `src/pages/emergency-map/index.tsx`，因此本任务执行前需在该路径创建返回最小 JSX 的临时页面，并在 Task 10 替换为正式页面。临时页面内容固定为：

```tsx
export default function EmergencyMap() {
  return <div className="h-full">应急一张图</div>;
}
```

```powershell
git add src/router src/layouts/MainLayout src/i18n/locales src/pages/emergency-map/index.tsx
git commit -m "feat: add emergency map route layout"
```

---

### Task 10: 实现应急地图页面状态和数据编排

**Files:**
- Modify: `src/pages/emergency-map/index.tsx`
- Create: `src/pages/emergency-map/index.test.tsx`
- Create: `src/pages/emergency-map/components/MapSearchPanel.tsx`
- Create: `src/pages/emergency-map/components/MapLayerPanel.tsx`
- Create: `src/pages/emergency-map/components/MapResultList.tsx`

**Interfaces:**
- Consumes: Task 3 的 `CesiumMapCanvas`、Task 7 API、Task 8 适配器。
- Produces: 页面唯一业务状态、图层显隐、查询、结果列表和地图点位同步。

- [ ] **Step 1: 写页面编排失败测试**

Mock `CesiumMapCanvas`，通过 `onReady(fakeController)` 交付控制器；Mock 两个 API。断言：

- 初次加载分别调用避难场所和摄像头 API。
- 数据返回后分别调用 `setLayerPoints("shelters", points)` 和 `setLayerPoints("cameras", points)`。
- 关闭摄像头图层后调用 `setLayerVisible("cameras", false)`。
- 点击结果项后调用 `flyToPoint({ layerId, pointId })`。
- API 失败只在对应图层显示错误，不阻止另一图层渲染。

- [ ] **Step 2: 实现页面状态**

页面状态至少包括：

```ts
const [enabledLayerIds, setEnabledLayerIds] = useState(() =>
  new Set(["shelters", "cameras"]),
);
const [query, setQuery] = useState<EmergencyMapQuery>({});
const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
const [measurementMode, setMeasurementMode] =
  useState<MeasurementMode | null>(null);
const controllerRef = useRef<MapController | null>(null);
```

另外为两类图层分别保存 `loading`、`error`、`points`、`invalidCount`。不能把 controller 存入 state。

- [ ] **Step 3: 实现加载和同步规则**

- 查询条件变化时并行请求两个图层。
- 使用 AbortController 或递增 requestId 忽略过期响应。
- API 成功后调用对应适配器并同步 controller。
- 数据刷新后如果 `selectedPoint` 不再存在，清空选择。
- controller 晚于数据到达时，`onReady` 必须把当前两类 points 和显隐状态一次性同步进去。

- [ ] **Step 4: 实现左侧基础组件**

- `MapSearchPanel`：名称关键字、区域、避难场所形态、应急用途、运营状态、摄像头在线状态，提交和重置通过语义化回调交给页面。
- `MapLayerPanel`：显示图层开关、可见数量、无效坐标数量、加载和错误状态。
- `MapResultList`：按当前启用图层合并结果；点击返回完整 `MapPoint`。
- 三个组件只接收数据和回调，不导入 Cesium。

- [ ] **Step 5: 验证并提交**

Run: `pnpm.cmd test -- src/pages/emergency-map/index.test.tsx`

Expected: PASS。

```powershell
git add src/pages/emergency-map/index.tsx src/pages/emergency-map/index.test.tsx src/pages/emergency-map/components/MapSearchPanel.tsx src/pages/emergency-map/components/MapLayerPanel.tsx src/pages/emergency-map/components/MapResultList.tsx
git commit -m "feat: orchestrate emergency map data"
```

---

### Task 11: 实现沉浸式控制面板和类型化详情

**Files:**
- Create: `src/pages/emergency-map/components/MapToolbar.tsx`
- Create: `src/pages/emergency-map/components/MapPointDetailPanel.tsx`
- Create: `src/pages/emergency-map/details/ShelterDetailPanel.tsx`
- Create: `src/pages/emergency-map/details/CameraDetailPanel.tsx`
- Create: `src/pages/emergency-map/components/MapToolbar.test.tsx`
- Create: `src/pages/emergency-map/components/MapPointDetailPanel.test.tsx`
- Modify: `src/pages/emergency-map/index.tsx`

**Interfaces:**
- Consumes: `selectedPoint`、`MapController` 命令回调、`measurementMode`。
- Produces: 缩放、复位、测量、清除、关闭详情和类型化详情渲染。

- [ ] **Step 1: 写工具栏失败测试**

断言每个按钮调用对应语义回调；测距激活时按钮具有 `aria-pressed="true"`；切换到测面先触发新的模式；所有图标按钮都有中文 `aria-label` 和 Tooltip。

- [ ] **Step 2: 实现 MapToolbar**

属性固定为：

```ts
interface MapToolbarProps {
  measurementMode: MeasurementMode | null;
  detailOpen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onMeasurementChange: (mode: MeasurementMode | null) => void;
  onClearMeasurement: () => void;
}
```

`detailOpen` 为 true 时增加向左偏移 class，不能与右侧详情面板重叠。

- [ ] **Step 3: 写详情分发失败测试**

分别传入 `kind="shelter"` 和 `kind="camera"`，断言渲染对应详情；传入 `null` 不渲染面板；点击关闭调用 `onClose`。

- [ ] **Step 4: 实现业务详情**

- `ShelterDetailPanel` 展示名称、形态、用途、运营状态、可用/总容量、设施、地址、管理单位、联系人和电话。
- `CameraDetailPanel` 展示名称、设备编号、所属区域、安装位置、在线状态和更新时间。
- `MapPointDetailPanel` 使用静态 `switch (point.kind)` 分发，未知 kind 返回通用名称和坐标，不引入动态插件注册表。

- [ ] **Step 5: 完成页面交互**

- 地图点位点击设置 `selectedPoint`。
- 地图空白点击和详情关闭清空 `selectedPoint`。
- 结果列表点击先设置选择，再调用 `flyToPoint()`。
- 测量模式改变时调用 `startMeasurement()` 或 `cancelMeasurement()`。
- 页面卸载不额外调用 controller.destroy；由 `CesiumMapCanvas` 唯一负责销毁。
- 左右悬浮容器使用 `pointer-events-none`，真实面板和按钮使用 `pointer-events-auto`。

- [ ] **Step 6: 验证并提交**

Run:

```powershell
pnpm.cmd test -- src/pages/emergency-map/components
pnpm.cmd lint
pnpm.cmd build
```

Expected: 全部通过。

```powershell
git add src/pages/emergency-map
git commit -m "feat: add emergency map controls and details"
```

**Checkpoint 3:** 避难场所和摄像头能够加载、筛选、显隐、定位、选择和展示详情，基础地图工具可用。

---

### Task 12: 完成错误恢复、聚合、性能和端到端验证

**Files:**
- Create: `src/features/map/layers/BaseMapController.ts`
- Create: `src/features/map/layers/BaseMapController.test.ts`
- Modify: `src/features/map/layers/PointLayerController.ts`
- Modify: `src/features/map/core/CesiumMapRuntime.ts`
- Modify: `src/pages/emergency-map/index.tsx`
- Modify: `src/pages/emergency-map/components/MapLayerPanel.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: 完整地图页面和控制器。
- Produces: 默认/备用底图切换、点位聚合、初始化重试和最终运行说明。

- [ ] **Step 1: 写底图失败回退测试**

使用 fake imagery layer collection，断言默认底图 provider reject 后启用备用 provider，两个 provider 都失败时抛出 `底图加载失败`。

- [ ] **Step 2: 实现 BaseMapController**

底图定义使用：

```ts
export interface BaseMapDefinition {
  id: string;
  name: string;
  createProvider: () => Promise<ImageryProvider>;
}
```

页面提供默认和备用定义，Runtime 不硬编码服务商。失败回退只执行一次，避免无限重试。

- [ ] **Step 3: 配置点位聚合和按需渲染**

每个业务 `CustomDataSource` 设置：

```ts
dataSource.clustering.enabled = true;
dataSource.clustering.pixelRange = 40;
dataSource.clustering.minimumClusterSize = 3;
```

点位 diff、显隐、样式和聚合变化后调用 `viewer.scene.requestRender()`。相机移动监听不得直接调用 React `setState`。

- [ ] **Step 4: 实现 Viewer 初始化错误和重试**

- `CesiumMapCanvas` 把同步初始化异常转换为 `onInitializationError(error)`。
- 页面显示 Ant Design `Result`，包含“重新加载地图”按钮。
- 重试通过递增 `mapInstanceKey` 重新挂载 `CesiumMapCanvas`。
- 单个业务图层失败继续保留另一图层和地图工具。

- [ ] **Step 5: 补充 README 运行说明**

增加“应急一张图”章节，记录：

- `pnpm install` 后 Cesium 静态资源由 Vite 自动复制。
- ion 资产需要在 `.env.local` 配置 `VITE_CESIUM_ION_TOKEN`。
- 本地路由为 `/#/emergency-map`。
- 不提交真实 Token。

- [ ] **Step 6: 执行全量自动验证**

Run:

```powershell
pnpm.cmd test
pnpm.cmd lint
pnpm.cmd build
```

Expected: 三条命令退出码均为 0；`dist/cesiumStatic` 下四个目录存在。

- [ ] **Step 7: 执行浏览器验收**

Run: `pnpm.cmd dev`

按顺序检查：

1. 打开 `/#/emergency-map`，地图初始化且无 Cesium 资源 404。
2. 关闭、打开避难场所和摄像头图层，点位和计数同步。
3. 使用四类筛选条件，旧请求结果不会覆盖新查询。
4. 点击地图点位打开正确详情；点击空白关闭。
5. 点击结果列表后地图飞行并高亮对应点位。
6. 测距和测面互斥，右键完成，`Esc` 取消，清除按钮移除结果。
7. 连续进入和离开路由 5 次，控制台没有重复 Viewer、已销毁对象或事件异常。
8. 模拟摄像头接口失败，避难场所仍可使用。
9. 使用无效坐标样例，地图跳过点位且图层面板显示异常数量。
10. 打开避难场所管理页，确认表格滚动和默认内容 padding 未回归。

- [ ] **Step 8: 检查提交范围并提交**

Run:

```powershell
git diff --check
git status --short
```

Expected: 没有空白错误；暂存前逐项确认不包含任务范围外改动。

```powershell
git add src/features/map src/pages/emergency-map README.md
git commit -m "feat: harden emergency map experience"
```

---

## 最终验收标准

- `/#/emergency-map` 为独立顶级菜单页面，并使用 full 内容布局。
- Cesium 仅在地图路由加载，普通后台页面不导入 Cesium Runtime。
- 开发和生产子路径下 Workers、ThirdParty、Assets、Widgets 均无 404。
- 避难场所和摄像头使用独立 DataSource，可独立加载、筛选、显隐和聚合。
- 结果列表、地图点位和右侧详情稳定双向联动。
- 缩放、初始视角、飞行定位、测距、测面、取消和清除可用。
- 坐标异常、单图层失败、底图失败和 Viewer 初始化失败均有明确处理。
- 连续挂载和卸载不会遗留 Viewer、DataSource 或事件处理器。
- `pnpm test`、`pnpm lint`、`pnpm build` 全部通过。

## 参考设计

- `docs/superpowers/specs/2026-07-13-cesium-emergency-map-architecture-design.md`
- `docs/superpowers/specs/2026-07-10-shelter-management-design.md`
