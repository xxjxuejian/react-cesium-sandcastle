# Cesium 通用基础组件技术方案

## 1. 文档目的

本文定义本项目中 CesiumJS 基础能力的封装边界，为后续页面提供一致的地图容器、`Viewer` 生命周期和访问方式。

本文只描述技术方案，不包含本轮代码实现。后续实现应以本文的职责划分、公开 API 和验收标准为基线。

## 2. 项目现状

项目当前使用 React 19、TypeScript、Vite 和原生 CesiumJS 1.143.0，没有引入 Resium 等 React 封装层。

现有基础设施已经完成以下工作：

- `src/main.tsx` 全局导入 Cesium Widgets CSS。
- `src/main.tsx` 在应用启动时配置 `Ion.defaultAccessToken`。
- `vite.config.ts` 配置 `CESIUM_BASE_URL`，并复制 Workers、ThirdParty、Assets 和 Widgets 静态资源。
- 页面由 React Router 懒加载，切换子路由时会卸载当前页面。
- 开发环境启用了 React `StrictMode`。

当前 `src/pages/getting-started/hello-world/index.tsx` 同时承担了以下职责：

- 渲染 Cesium 容器。
- 创建和销毁 `Viewer`。
- 保存 `Viewer` 引用。
- 监听渲染错误。
- 配置 World Terrain。
- 设置上海初始视角。
- 渲染错误提示。

其中前三类属于可复用的基础设施，地形和相机配置属于具体页面行为，应该拆开。

## 3. 核心决策

### 3.1 采用组件与 Hook 的组合方案

不在“基础组件”和“自定义 Hook”之间二选一，而是组合使用：

- `CesiumMap` 组件负责 DOM、`Viewer` 生命周期和公共运行状态。
- `useCesium()` 向后代业务组件提供当前地图的 `Viewer`。
- `useCesiumEffect()` 帮助业务功能注册和清理 Cesium 资源。

Cesium `Viewer` 是依赖真实 DOM 的命令式对象，需要可靠地创建和销毁，因此它的所有权更适合放在组件中。页面中的实体、图层、相机和交互逻辑则适合拆分为 Hooks 或无 UI 的场景组件。

### 3.2 每个页面持有独立 Viewer

每个 Cesium 页面独立创建和销毁自己的 `Viewer`，切换路由时不保活。

这符合当前示例型项目的特点，可以保证不同页面之间的以下状态相互隔离：

- Entity、DataSource 和 Primitive。
- 相机位置和控制器设置。
- Clock 和动画状态。
- 屏幕空间事件。
- 影像、地形和后处理阶段。

如果未来出现需要在多个业务路由间保持同一个场景的需求，应新增独立的“持久地图外壳”方案，而不是改变当前基础组件的默认生命周期。

### 3.3 使用局部 Context，不使用全局 Store

`Viewer` 由每个 `CesiumMap` 内部的局部 Context 提供，不放入 Zustand，也不创建模块级单例。

这样可以：

- 自然支持同一页面并列渲染多个地图。
- 避免跨页面访问已经销毁的 `Viewer`。
- 让业务组件始终访问距离自己最近的地图实例。
- 使 Viewer 生命周期与 React 组件树保持一致。

Context 本身作为内部实现，不在第一版中公开。页面只通过 `useCesium()` 访问实例。

### 3.4 基础层保持薄而稳定

基础层只管理所有页面都需要的机制，不内置具体示例或业务能力。

基础层负责：

- 地图宿主 DOM。
- 创建、保存和销毁 `Viewer`。
- 合并项目默认配置与页面配置。
- Viewer 初始化状态。
- Viewer 构造错误和 `scene.renderError`。
- 容器尺寸变化后的 `viewer.resize()`。
- 向后代提供非空 `Viewer`。

页面负责：

- 页面在应用布局中的实际高度。
- 地形和底图。
- 初始视角及后续相机控制。
- Entity、DataSource、Primitive 和 3D Tiles。
- 鼠标、键盘和触摸交互。
- Clock、动画、材质和后处理。
- 页面资源加载状态与错误恢复。
- 页面创建资源的局部清理。

## 4. 建议目录结构

第一版建议使用以下结构：

```text
src/
├─ components/
│  └─ CesiumMap/
│     ├─ CesiumMap.tsx
│     ├─ context.ts
│     ├─ defaults.ts
│     ├─ hooks.ts
│     ├─ types.ts
│     └─ index.ts
└─ pages/
   └─ getting-started/
      └─ hello-world/
         ├─ hooks/
         │  └─ useHelloWorldScene.ts
         └─ index.tsx
```

通用生命周期能力留在 `components/CesiumMap` 内。页面专属的 Cesium 行为继续放在对应页面目录中，避免形成包含所有领域功能的全局 Hooks 目录。

如果文件内容很少，可以在第一版合并 `context.ts`、`hooks.ts` 和 `types.ts`，不需要为了目录形式进行无意义拆分。

## 5. 第一版公开 API

第一版只公开：

```ts
export { CesiumMap } from "./CesiumMap";
export { useCesium, useCesiumEffect } from "./hooks";
export { DEFAULT_VIEWER_OPTIONS } from "./defaults";
export type { CesiumMapProps, CesiumEffect } from "./types";
```

暂不公开：

- 原始 React Context。
- 全局 Cesium Provider。
- 模块级 Viewer 获取函数。
- `forwardRef` 或命令式组件 Ref。
- 业务图层注册中心。
- 通用事件总线。

这些能力只有在出现明确用例后再增加。

### 5.1 CesiumMap

建议的 Props 语义如下：

```ts
import type { CSSProperties, ReactNode } from "react";
import type { Viewer } from "cesium";

export type CesiumMapProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  options?: Viewer.ConstructorOptions;
  onReady?: (viewer: Viewer) => void;
  onError?: (error: Error) => void;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
};
```

约束：

- `className` 和 `style` 应用到最外层地图宿主元素。
- 宿主元素默认占满父容器，但不计算应用 Header、Sidebar 或 Content 的尺寸。
- `options` 只在 Viewer 构造时读取，不作为响应式配置。
- `onReady` 在本轮 Viewer 成功创建后调用一次。
- `onError` 用于向页面或监控系统报告基础层错误。
- 修改关键构造配置时，调用方通过改变 React `key` 显式重建地图。

示例：

```tsx
<section className="h-[calc(100vh-7.5rem)] min-h-[28rem]">
  <CesiumMap className="h-full w-full" options={viewerOptions}>
    <HelloWorldScene />
  </CesiumMap>
</section>
```

### 5.2 useCesium

`useCesium()` 返回最近一个 `CesiumMap` 提供的非空 `Viewer`：

```ts
function useCesium(): Viewer;
```

业务 children 只在 Viewer 创建成功后渲染，因此调用方不需要重复处理 `Viewer | null`。

如果在 `CesiumMap` 外部调用，应抛出包含明确修复建议的错误，例如：

```text
useCesium must be used within a CesiumMap.
```

这里的“就绪”只表示 Viewer 已经完成同步构造，并且基础监听器已经安装；不代表地形、影像、3D Tiles 或其他异步资源已经加载完成。

### 5.3 useCesiumEffect

建议签名：

```ts
import type { DependencyList } from "react";
import type { Viewer } from "cesium";

export type CesiumEffect = (
  viewer: Viewer,
) => void | (() => void);

function useCesiumEffect(
  setup: CesiumEffect,
  dependencies: DependencyList,
): void;
```

使用方式：

```tsx
function PageScene() {
  useCesiumEffect((viewer) => {
    const entity = viewer.entities.add({
      // 页面配置
    });

    return () => {
      viewer.entities.remove(entity);
    };
  }, []);

  return null;
}
```

该 Hook 应遵循 `useEffect` 的依赖语义。实现时应为 ESLint 配置自定义 Effect Hook 检查，避免业务代码因缺少依赖而读取陈旧闭包。

底层建议使用 `useLayoutEffect` 执行 Cesium 场景资源的 setup 和 cleanup，而 `CesiumMap` 使用普通 `useEffect` 管理 Viewer。React 卸载时，后代组件的布局 Effect cleanup 会先于父组件的被动 Effect cleanup，因此页面资源可以在 `viewer.destroy()` 前完成清理。

这个 Hook 只适合注册同步的 Cesium 场景副作用。耗时网络请求仍应使用普通 Effect 或页面数据 Hook 管理，资源加载完成后再通过短小的 `useCesiumEffect` 挂载到 Viewer。

## 6. 默认 Viewer 配置

建议提供项目级默认配置：

```ts
import type { Viewer } from "cesium";

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
```

构造时采用浅合并，并以页面配置为准：

```ts
const mergedOptions = {
  ...DEFAULT_VIEWER_OPTIONS,
  ...options,
};
```

默认配置不包含：

- `Terrain.fromWorldTerrain()`。
- 具体 ImageryProvider。
- 初始相机位置。
- `scene3DOnly`。
- 阴影、光照或后处理。

Clock、路径动画或其他持续变化的页面需要覆盖 `requestRenderMode` 或 `maximumRenderTimeChange`。否则将最大渲染时间变化设为无穷大后，单纯的仿真时间推进不会自动触发连续渲染。

## 7. 生命周期设计

### 7.1 创建阶段

推荐顺序：

1. React 挂载宿主元素。
2. Effect 确认容器存在。
3. 合并默认配置与首次传入的页面配置。
4. 创建 `Viewer`。
5. 注册 `scene.renderError` 监听。
6. 创建并注册 `ResizeObserver`。
7. 更新内部就绪状态并调用 `onReady`。
8. Provider 渲染业务 children。

`options` 是构造期输入。基础组件应保存首次配置，避免父组件每次创建新的对象字面量时意外销毁和重建 Viewer。

`onReady` 和 `onError` 可以使用最新回调引用，既避免陈旧闭包，也不应因为回调 identity 改变而重建 Viewer。

### 7.2 清理阶段

推荐顺序：

1. 业务 children 卸载，`useCesiumEffect` 的布局 Effect cleanup 先释放页面资源。
2. `CesiumMap` 的被动 Effect cleanup 停止向当前组件提交异步状态。
3. 断开 `ResizeObserver`。
4. 移除 `scene.renderError` 监听。
5. 如果 Viewer 尚未销毁，调用 `viewer.destroy()`。
6. 清空内部 Viewer 引用。

清理逻辑必须允许“只完成了部分初始化”的情况，并且重复执行时保持安全。

不能假设父子组件的普通 `useEffect` 会按“子级先清理”的顺序运行。React 19 中父级被动 Effect cleanup 会先于后代的被动 Effect cleanup；如果两边都使用普通 `useEffect`，父组件可能先销毁 Viewer。`useCesiumEffect` 的布局阶段清理是本方案保证资源顺序的组成部分。

### 7.3 React StrictMode

开发环境中的 StrictMode 会验证 Effect 的 setup/cleanup 对称性。实现必须正确处理一次开发期的创建、清理、再次创建，不能依赖 Viewer 只创建一次。

需要重点避免：

- cleanup 后仍持有已销毁的 Viewer。
- 同一个事件监听器重复注册。
- `ResizeObserver` 未断开。
- 异步回调向已经卸载的组件更新状态。
- 将 StrictMode 的正常双阶段检查误判为 Viewer 重复初始化缺陷。

## 8. 资源所有权与清理

采用“谁创建，谁清理”的规则。

| 资源 | 创建者 | 清理者 |
| --- | --- | --- |
| Viewer | `CesiumMap` | `CesiumMap` |
| ResizeObserver | `CesiumMap` | `CesiumMap` |
| `scene.renderError` 监听 | `CesiumMap` | `CesiumMap` |
| Entity | 页面 Hook | 同一个页面 Hook |
| Primitive / 3D Tileset | 页面 Hook | 同一个页面 Hook |
| DataSource | 页面 Hook | 同一个页面 Hook |
| ScreenSpaceEventHandler | 页面 Hook | 同一个页面 Hook |
| 相机或 Clock 事件 | 页面 Hook | 同一个页面 Hook |
| 网络请求与异步资源状态 | 页面 Hook | 同一个页面 Hook |

虽然 `viewer.destroy()` 最终会释放 Viewer 拥有的大部分资源，页面 Hook 仍必须提供 cleanup。原因是 Hook 的依赖可能在 Viewer 整体卸载前发生变化，StrictMode 也会主动执行 Effect 的建立和清理检查。

直接使用普通 `useEffect` 操作 Viewer 时，cleanup 必须能够处理 Viewer 已经销毁的情况。优先使用 `useCesiumEffect` 管理同步场景资源，以获得统一的清理顺序。

对于异步加载，应同时处理“资源完成加载时 Effect 已失效”的情况：失效后不要再把资源加入 Viewer；如果资源已经创建，则立即销毁或移除。

## 9. 容器与尺寸策略

`CesiumMap` 默认只填满父容器，不写入当前 MainLayout 的 `7.5rem` 偏移。

推荐的内部结构是一个相对定位宿主，Cesium 容器铺满宿主，状态层和业务 UI 作为覆盖层渲染：

```tsx
<div className={className} style={style}>
  <div className="absolute inset-0" ref={containerRef} />
  {/* loading、error 和 children */}
</div>
```

实际实现需要保证外层建立定位上下文，并具有明确的宽高。页面应负责设置高度，例如全视口地图、固定高度示例或响应式面板。

基础组件使用 `ResizeObserver` 监听自身宿主变化，并执行：

```ts
viewer.resize();
viewer.scene.requestRender();
```

这可以覆盖侧栏折叠、面板拖动和父容器响应式变化。在按需渲染模式下，不能只等待 Cesium 在下一渲染帧中自行发现尺寸变化。

## 10. 状态与错误处理

基础组件内部至少区分：

- `initializing`：容器已挂载，Viewer 尚未可用。
- `ready`：Viewer 已创建，可以渲染业务 children。
- `error`：构造 Viewer 或渲染场景时发生基础错误。

基础层处理：

- `new Viewer(...)` 抛出的同步异常。
- `viewer.scene.renderError`。
- 默认错误展示。
- 调用可选的 `onError`。

页面处理：

- Terrain、Imagery、3D Tiles、GeoJSON、CZML 和模型加载错误。
- 接口鉴权或业务数据错误。
- 单个图层的重试、降级和错误提示。

进入基础错误状态后，地图 DOM 可以保留以便完成生命周期清理，依赖 Viewer 的 children 应停止渲染并执行自己的 cleanup。第一版可以通过改变 `CesiumMap` 的 `key` 实现显式重试，不需要在基础层内置复杂的自动重试策略。

未知异常统一转换为 `Error`，不把 `unknown` 或任意对象直接暴露给组件 API。

## 11. Hello World 页面迁移示意

页面保留布局、地形和初始相机行为，基础组件接管 Viewer 生命周期。

```tsx
import { useMemo } from "react";
import { Cartesian3, Terrain } from "cesium";
import type { Viewer } from "cesium";

import {
  CesiumMap,
  useCesiumEffect,
} from "@/components/CesiumMap";

function HelloWorldScene() {
  useCesiumEffect((viewer) => {
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        121.4737,
        31.2304,
        2_000_000,
      ),
    });

    return () => {
      viewer.camera.cancelFlight();
    };
  }, []);

  return null;
}

export default function HelloWorldPage() {
  const options = useMemo<Viewer.ConstructorOptions>(
    () => ({
      terrain: Terrain.fromWorldTerrain(),
    }),
    [],
  );

  return (
    <section className="h-[calc(100vh-7.5rem)] min-h-[28rem]">
      <CesiumMap className="h-full w-full" options={options}>
        <HelloWorldScene />
      </CesiumMap>
    </section>
  );
}
```

代码仅用于表达职责分离，实施时应根据实际组件样式、错误 UI 和 ESLint 配置调整。

## 12. 多实例行为

同一页面允许存在多个 `CesiumMap`：

```tsx
<div className="grid h-full grid-cols-2 gap-2">
  <CesiumMap>
    <LeftScene />
  </CesiumMap>

  <CesiumMap>
    <RightScene />
  </CesiumMap>
</div>
```

`LeftScene` 和 `RightScene` 分别访问最近的 Context，不共享 Viewer。任何 Hook 都不得从模块全局变量或 Zustand 获取“当前 Viewer”。

## 13. 验证策略

第一版不为了 Cesium Viewer 测试立即引入新的测试框架。

实现后至少执行：

```powershell
pnpm lint
pnpm build
```

手动验证清单：

1. Hello World 页面能够正常创建地图并飞到目标位置。
2. 从 Cesium 页面切换到其他路由后没有继续渲染、事件残留或 WebGL 上下文泄漏。
3. 返回 Cesium 页面后可以重新创建 Viewer。
4. React StrictMode 下不会因使用已销毁 Viewer 报错。
5. 页面资源 cleanup 发生在 `viewer.destroy()` 之前。
6. 展开和折叠侧栏后画布尺寸正确，没有拉伸或空白。
7. 调整浏览器尺寸后 Viewer 正确适配。
8. 同一页面挂载两个 `CesiumMap` 时实例互不干扰。
9. 在缺少或无效 Ion Token 时能够显示可理解的资源错误。
10. 人为触发构造错误或渲染错误时，`onError` 和错误覆盖层按预期工作。
11. 改变 `key` 后旧 Viewer 被销毁，并创建新 Viewer。

纯函数和配置合并可以补充普通单元测试。涉及真实 Viewer、WebGL、路由切换和容器尺寸的稳定自动化回归，后续更适合使用 Playwright 浏览器测试，而不是依赖 jsdom 模拟 WebGL。

## 14. 不采用的方案

### 14.1 只封装 Hook

纯 Hook 虽然能返回 `containerRef` 和 Viewer，但会让每个页面重复宿主结构、尺寸约定、loading/error UI 和生命周期边界，不利于形成一致的基础能力。

### 14.2 只封装组件并通过回调使用 Viewer

只提供 `onReady(viewer)` 会迫使页面把 Viewer 保存到 Ref 或 State，再向多个子功能传递。随着场景功能拆分，Props 传递和命令式协调会迅速增加。

### 14.3 将 Viewer 放入 Zustand

Viewer 是包含 DOM、WebGL 上下文和大量内部状态的命令式对象，不是适合持久化或序列化的应用状态。全局 Store 还会模糊实例所有权，使路由卸载后更容易访问失效对象。

### 14.4 在基础组件内置所有 Cesium 能力

把地形、底图、相机、图层、拾取、标绘和业务工具栏都做成基础组件 Props，会产生大量相互影响的布尔开关，并让不同页面难以独立控制生命周期。

## 15. 后续实施顺序

建议后续单独按以下顺序实施：

1. 新增 `CesiumMap`、内部 Context 和默认配置。
2. 实现 `useCesium()`。
3. 实现 `useCesiumEffect()` 及 ESLint 自定义 Effect Hook 检查。
4. 实现构造错误、渲染错误和可替换 fallback。
5. 实现 `ResizeObserver` 尺寸同步。
6. 迁移 Hello World 页面，保持当前功能和布局不变。
7. 执行 lint、build 和手动验证清单。
8. 再迁移 resolution-scale、clock 和 google-2d-tiles 页面。

## 16. 演进边界

只有出现明确需求时，才考虑增加：

- 跨路由持久化 Viewer。
- 图层注册表或插件机制。
- 统一资源加载状态中心。
- 命令式 Ref API。
- 相机、交互、数据源等更细粒度的通用 Hooks。
- Playwright WebGL 回归测试。

新增能力时继续遵循两个原则：Viewer 生命周期必须有唯一所有者；页面资源必须能够独立注册和清理。
