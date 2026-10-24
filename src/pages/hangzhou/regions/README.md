# 杭州行政区页面说明

## 1. 页面目标

本页面对应路由 `/hangzhou/regions`，用于在 Cesium 三维场景中展示杭州市下辖 13 个区县：

- 加载区县 GeoJSON；
- 显示贴合地形的区县填充；
- 显示区县完整环线，包含内部区界和全市外缘；
- 显示区县名称；
- 鼠标悬停时高亮区县；
- 点击后保持选中状态并显示名称和行政编码；
- 点击地图空白区域取消选择；
- 加载完成后将相机飞入杭州市全域；
- 展示 GeoJSON 的加载中、加载成功和加载失败状态。

页面入口是 [`index.tsx`](./index.tsx)。页面使用的行政区数据是 [`public/geojson/hangzhou.wgs84.geojson`](../../../../public/geojson/hangzhou.wgs84.geojson)。它包含 1 个杭州市和 13 个区县的 `MultiPolygon` Feature；本页只读取区县要素绘制面、标签和完整环线，不绘制独立市级要素。若需金色外缘、红色内界分开显示，请看使用派生线数据的 [`/hangzhou/boundaries`](../boundaries/README.md) 页面。具体来源、坐标转换方式和精度限制见 [`public/geojson/README.md`](../../../../public/geojson/README.md)。

### 与 `boundaries` 页面的区别

两个页面都使用 `CesiumMap`、Cesium World Terrain 和同一份标准行政区面数据，显示 13 个区县的贴地填充与名称标签，并支持悬停高亮、点击选中和详情展示。主要区别在于边界线的数据组织、绘制方式，以及是否支持区县下钻。

| 对比项 | `/hangzhou/regions` | `/hangzhou/boundaries` |
| --- | --- | --- |
| 页面重点 | 学习行政区的基础绘制和拾取交互 | 展示分类去重后的双色边界，并支持区县下钻 |
| 加载数据 | `hangzhou.wgs84.geojson` | 同一份面数据，以及 `hangzhou.boundaries.wgs84.geojson` 派生线数据 |
| 边界绘制方式 | 逐个区县读取完整环线，创建贴地折线 | 读取脚本预先生成的外缘与内部区界，分别创建贴地折线 |
| 边界颜色 | 全市外缘和内部区界均为红色 | 全市外缘为金色，内部区界为红色 |
| 相邻区县的共享边界 | 两个区县各画一次，共享线段会重复绘制 | 每段共享边界只绘制一次 |
| 可拾取并选中的对象 | 区县面、名称标签、边界线 | 区县面和名称标签；边界线不映射到某一侧区县，点击后清除选择 |
| 区县下钻与返回 | 当前未实现 | 选中后点击“进入区县”，按完整面几何范围取景；通过面包屑返回全市 |

例如，A 区和 B 区相邻时，`regions` 会在绘制 A 区完整轮廓时画出共享边界，在绘制 B 区时再画一次。`boundaries` 则先由脚本识别共享线段，将其归入内部区界，页面只画一次。只属于一个区县的线段归入全市外缘。因此，双色边界的实现既涉及颜色设置，也涉及离线数据处理。

两个页面都不叠画独立市级面的边界。`regions` 的完整区县环线自然包含全市外缘；`boundaries` 的外缘从同一套区县面派生，避免另取独立市级边界后出现坐标不完全重合的双线。

学习时可以先阅读本页，理解“加载区县面 → 绘制边界和标签 → 拾取与样式更新 → 清理资源”，再阅读 [`boundaries` 页面说明](../boundaries/README.md)，理解派生边界数据的使用、区县范围取景和下钻返回。`CES-REGION-007` 指标分级设色不属于 `boundaries` 页面的实现或验收范围。

## 2. 页面结构

```text
HangzhouRegionsPage
└── CesiumMap
    └── RegionsScene
        ├── GeoJsonDataSource：区县面填充
        ├── Polyline Entity：区县完整环线（内部区界与全市外缘）
        ├── Label Entity：区县名称
        ├── ScreenSpaceEventHandler：悬停与点击拾取
        ├── 选中详情面板：名称与行政编码
        └── 页面状态层：加载中、成功数量、失败信息
```

### `HangzhouRegionsPage`

页面组件负责创建本页专用的 Viewer 配置：

```ts
const viewerOptions = useMemo<Viewer.ConstructorOptions>(
  () => ({
    terrain: Terrain.fromWorldTerrain(),
  }),
  [],
);
```

`Terrain.fromWorldTerrain()` 为 Viewer 接入 Cesium World Terrain。`viewerOptions` 使用 `useMemo` 保持引用稳定，并通过 `CesiumMap` 的 `options` 传入 Viewer 构造过程。

### `RegionsScene`

`RegionsScene` 通过 `useCesiumEffect()` 使用已经创建完成的 Viewer，执行顺序如下：

1. 使用 `import.meta.env.BASE_URL` 生成 GeoJSON 的浏览器 URL；
2. 使用 `fetch()` 下载并检查 GeoJSON；
3. 使用 `GeoJsonDataSource.load()` 创建区县面填充；
4. 遍历每个 `MultiPolygon` 的环线，创建独立的贴地 `PolylineGraphics`；
5. 使用标准数据的 `labelPoint` 创建区县名称标签；
6. 将区县面、边界和标签映射到同一个区县记录；
7. 注册鼠标移动和左键点击事件；
8. 将加载状态更新为成功，并通过 `viewer.flyTo()` 飞入全部区县；
9. 页面卸载时终止请求、销毁事件处理器、取消相机飞行，并移除 DataSource、边界和标签。

`active` 标记用于防止异步加载晚于页面卸载后继续访问旧 Viewer。`AbortController` 用于终止尚未完成的 GeoJSON 请求。

## 3. 区域填充配置

区县面由 `GeoJsonDataSource` 创建：

```ts
const districts = geojson.features.filter((feature) => feature.properties.level === "district");
const regions = await GeoJsonDataSource.load({ ...geojson, features: districts }, {
  fill: DEFAULT_REGION_FILL,
  clampToGround: true,
});
```

| 配置 | 当前值 | 含义 |
| --- | --- | --- |
| `fill` | `DEFAULT_REGION_FILL` | 默认多边形填充色，当前为 `Color.ROYALBLUE.withAlpha(0.7)` |
| `clampToGround` | `true` | 将 GeoJSON 几何贴到当前地表，而不是固定在椭球高度零的位置 |

### 修改填充颜色

修改页面顶部的 `DEFAULT_REGION_FILL`：

```ts
const DEFAULT_REGION_FILL = Color.CYAN.withAlpha(0.25);
```

也可以使用 CSS 颜色：

```ts
const DEFAULT_REGION_FILL = Color.fromCssColorString("#2563eb").withAlpha(0.35);
```

`withAlpha()` 的取值范围是 `0` 到 `1`：

- `0`：完全透明；
- `0.2`：底图大部分可见；
- `0.5`：半透明；
- `1`：完全不透明。

当前页面所有区县使用同一种填充颜色。如果后续需要每个区县使用不同颜色，应在 DataSource 加载完成后根据 Entity 的 `adcode` 修改各自的 `polygon.material`。

## 4. `clampToGround` 的含义和影响

### 开启：`clampToGround: true`

多边形和折线会贴到当前地表：

- 加载真实地形时，会沿山体起伏；
- 没有真实地形时，会贴到默认椭球表面，因此看不出真实山体高度；
- 适合行政区、道路和地面轨迹；
- 贴地几何需要进行地形适配，数据点很多时会增加一定的处理成本。

### 关闭：`clampToGround: false`

GeoJSON 多边形按椭球高度零绘制：

- 不会随着真实地形起伏；
- 山区地形可能遮住多边形或与多边形相交；
- 多边形自身的 `outline` 可以参与普通几何渲染；
- 适合不加载真实地形的平面验证，但不适合本页的三维地形展示目标。

需要区分两个配置：

- `GeoJsonDataSource` 和 `PolylineGraphics` 使用 `clampToGround`；
- 标签使用 `heightReference: HeightReference.CLAMP_TO_GROUND`。

它们的目标相同，API 所属对象不同。

## 5. 为什么贴地区县没有自动显示内部边界

GeoJSON 包含 13 个独立区县，内部边界缺失并非数据被合并。

`GeoJsonDataSource` 可为多边形配置 `outline`，但 Cesium 在多边形贴地时会关闭 `PolygonGraphics` 自身的轮廓渲染。因此页面已经注释掉以下参数，不能用它们实现可靠的内部区界：

```ts
stroke: Color.FUCHSIA,
strokeWidth: 2,
clampToGround: true,
```

相邻区县又使用同一种填充颜色，所以没有独立边界线时，视觉上会连成一整块。

## 6. 当前区县内部边界的实现方式

当前页面保留 `GeoJsonDataSource` 负责面填充，再从同一份 GeoJSON 中读取所有 `MultiPolygon` 环线，为每条环线创建独立的 `PolylineGraphics`：

```ts
polyline: {
  positions: Cartesian3.fromDegreesArray(degrees),
  width: 3,
  material: Color.CRIMSON,
  arcType: ArcType.RHUMB,
  clampToGround: true,
  zIndex: 1,
},
```

| 配置 | 当前值 | 含义 |
| --- | --- | --- |
| `positions` | GeoJSON 环线转换结果 | 折线经过的三维坐标点 |
| `width` | `3` | 边界线屏幕宽度，单位为像素 |
| `material` | `Color.CRIMSON` | 实际可见的区县边界颜色 |
| `arcType` | `ArcType.RHUMB` | 相邻坐标点按等航线方式连接，与当前 GeoJSON 多边形边缘保持一致 |
| `clampToGround` | `true` | 边界线贴合地形 |
| `zIndex` | `1` | 贴地几何的绘制顺序 |

### 修改实际可见的边界颜色

应修改独立折线的 `material`：

```ts
material: Color.YELLOW,
```

或者：

```ts
material: Color.fromCssColorString("#ffffff").withAlpha(0.9),
```

修改 `GeoJsonDataSource` 的 `stroke` 不会改变当前贴地模式下可靠显示的内部区界。边界宽度应修改独立折线的 `width`。

当前页面只绘制 13 个区县的完整红色环线，因此全市外缘也为红色。`boundaries` 数组在页面卸载时逐个移除这些 Entity。

### 为什么不再叠画独立市界

区县完整环线已经包含全市外缘。如果再从独立的杭州市 `330100` 面要素绘制一次外边界，同一外缘就会由两套数据重复绘制。两套数据的顶点数量、采样位置和局部形状并不完全相同，即使设置更高的 `zIndex` 或更宽的线，也无法保证它们完全重合；放大后可能看到两条错开的线、颜色交错或局部毛边。`zIndex` 只控制叠放顺序，不会修正坐标差异。

本页统一使用区县数据，避免这种**跨数据源的外缘双线**。相邻区县各自的完整环线仍会重复绘制共享的内部区界；这与两套不同市界错位的问题不同。若要求外缘和内部区界使用不同颜色且每段线只画一次，应使用同一套区县面派生的分类线数据，见 [`/hangzhou/boundaries`](../boundaries/README.md)。

## 7. 区县标签

标签使用项目标准 GeoJSON 的 `labelPoint`：

```ts
const { labelPoint } = feature.properties;
```

转换脚本优先使用原始数据的 `centroid`，缺失时使用 `center`，然后统一转为 WGS84。萧山区缺少原始 `centroid`，因此其 `labelPoint` 来自原始 `center`。标签配置中的主要参数如下：

| 配置 | 含义 |
| --- | --- |
| `text` | 区县名称 |
| `font` | 标签字体和字号 |
| `fillColor` | 文字填充颜色 |
| `outlineColor` | 文字描边颜色 |
| `outlineWidth` | 文字描边宽度 |
| `HeightReference.CLAMP_TO_GROUND` | 将标签位置贴到地形表面 |

## 8. 地形如何加载

页面在创建 Viewer 时加载 Cesium World Terrain：

```ts
terrain: Terrain.fromWorldTerrain(),
```

项目启动时，[`src/main.tsx`](../../../main.tsx) 会读取环境变量 `VITE_CESIUM_ION_TOKEN`，并设置 `Ion.defaultAccessToken`。World Terrain 属于 Cesium ion 在线资源，因此必须提供有效 Token，并保证当前网络可以访问 Cesium ion。

地形采用分块和多级细节加载。创建 Viewer 时不会一次性下载完整地形，而是根据当前相机视野逐步请求可见瓦片；相机靠近地面后，还会继续请求更高精度瓦片。因此进入页面后先看到低精度表面、随后山体逐渐变清晰属于正常现象。

当前配置没有请求顶点法线和水体遮罩。如果以后添加：

```ts
terrain: Terrain.fromWorldTerrain({
  requestVertexNormals: true,
  requestWaterMask: true,
}),
```

会增加额外数据下载。只在确实需要地形光照或水面效果时开启。

## 9. 地形加载较慢的常见原因

1. **在线资源网络延迟**：World Terrain 需要访问 Cesium ion 和 CDN，网络质量会直接影响瓦片响应时间。
2. **首次访问没有浏览器缓存**：首次进入页面需要下载地形和影像；再次访问通常会更快。
3. **视野覆盖范围大**：初始相机需要展示整个杭州市，屏幕中同时存在较多地形瓦片。
4. **多级细节逐步细化**：Cesium 先加载低精度瓦片，再根据相机距离继续加载高精度瓦片。
5. **影像与地形同时请求**：底图影像、地形、Cesium 静态资源和 GeoJSON 会共享浏览器网络连接及设备资源。
6. **贴地几何处理**：当前边界约有 4,500 个坐标点，贴地填充和折线需要等待地形并进行几何适配，但它通常不是远程地形首次加载慢的主要原因。
7. **Token 或资源权限异常**：无效 Token、来源限制、配额或网络拦截可能表现为长时间等待，并最终在 Network 或控制台中出现 `401`、`403` 或请求失败。
8. **开发环境首次编译**：Vite 首次进入包含 Cesium 的页面时还可能进行依赖优化，这与地形瓦片下载是两段不同的耗时。

### 排查方式

- 在浏览器 Network 中区分 GeoJSON、影像和地形瓦片请求；
- 检查地形请求是否长时间处于 `Pending`，或出现 `401`、`403`；
- 确认 `VITE_CESIUM_ION_TOKEN` 已正确配置；
- 比较首次进入与刷新后的加载时间，判断是否受缓存影响；
- 暂时移除 `terrain` 配置进行对照，确认慢的是地形请求还是页面代码；
- 保持 `requestVertexNormals` 和 `requestWaterMask` 关闭，直到页面确实需要这些效果。

页面左上角的“已加载 13 个区县”只表示 GeoJSON 已完成处理，不表示当前视野中的所有高精度地形瓦片都已下载完成。

## 10. 区县悬停与点击

页面只创建一个 `ScreenSpaceEventHandler`，集中处理两种事件：

- `MOUSE_MOVE`：拾取鼠标下的区县并更新悬停样式；
- `LEFT_CLICK`：保存选中区县，或在点击空白区域时取消选择。

区县面来自 `GeoJsonDataSource`，边界和标签来自 `viewer.entities`。页面使用 `Map<Entity, PickableRegion>` 将这三类 Entity 都映射到相同的区县记录。因此，鼠标停在填充、文字或边界线上时，都能得到相同的 `name` 和 `adcode`。

当前三种填充状态为：

```ts
const DEFAULT_REGION_FILL = Color.ROYALBLUE.withAlpha(0.7);
const HOVER_REGION_FILL = Color.CYAN.withAlpha(0.75);
const SELECTED_REGION_FILL = Color.ORANGE.withAlpha(0.8);
```

样式优先级是“选中 > 悬停 > 默认”。被选中的区县即使仍位于鼠标下，也保持橙色。点击其他区县后，原区县恢复为悬停色或默认色；点击空白区域后取消选中并关闭详情面板。

修改上述三个常量即可调整默认、悬停和选中颜色。运行时更新 Polygon 时使用 `ColorMaterialProperty`，以符合 `PolygonGraphics.material` 的公开类型。

## 11. 资源清理

页面遵循“谁创建，谁清理”：

- `AbortController.abort()`：终止未完成的 GeoJSON 请求；
- `viewer.camera.cancelFlight()`：取消尚未完成的相机飞行；
- `interactionHandler.destroy()`：销毁鼠标移动和点击事件处理器；
- `viewer.entities.remove(boundary)`：移除区县边界；
- `viewer.entities.remove(label)`：移除区县标签；
- `viewer.dataSources.remove(dataSource, true)`：移除并销毁区县 DataSource。

这些清理保证在 React StrictMode 或路由反复切换时，不会把旧页面的 Entity、DataSource 或异步结果留在新的 Viewer 中。
