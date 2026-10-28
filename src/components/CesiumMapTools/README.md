# 地图基础工具

当前接入页为 `src/pages/hangzhou/boundaries/index.tsx`。航线页暂不接入，原有航点与表单逻辑保持原样。

## 文件与职责

| 文件                   | 职责                                                            |
| ---------------------- | --------------------------------------------------------------- |
| `useBasemap.ts`        | 底图来源、图层类型、瓦片错误与重试，只清理自己创建的图层        |
| `useMapMeasurement.ts` | 地图取点、草稿预览、测量结果、鼠标键盘事件与清理                |
| `MapToolbar.tsx`       | 默认工具栏、底图面板、测量提示与结果列表，通过回调调用两个 Hook |
| `MapToolbar.css`       | 定位、间距、窄屏布局和键盘焦点样式；面板颜色沿用应用主题        |
| `measurement.ts`       | 与 React 无关的距离、面积、自交检查及单位格式化                 |
| `types.ts`             | 状态和公开操作的类型，包含单位、默认行为与生命周期说明          |

这两个 Hook 是已经明确需要跨页面复用的能力。页面专属的行政区加载、样式、选中和下钻仍放在原页面中；工具没有注册中心、全局 Store 或额外的地图 Provider。

## 从页面到 Cesium 的执行顺序

1. 页面创建 `CesiumMap`，构造选项包含 `baseLayer: false`，让公共工具接管底图。
2. `CesiumMap` 创建 Viewer，等实例就绪后渲染场景组件，并通过局部 Context 提供它。
3. 场景组件调用两个 Hook。底图默认加载 OSM，测量 Hook 添加自己的 `CustomDataSource`。
4. 工具栏接收 Hook 返回的状态和回调，点击按钮后直接调用对应方法。
5. 底图选项改变后，场景副作用移除上一组底图并创建下一组，相机和行政区保留。
6. 点击开始测量时注册事件，左键确定顶点，鼠标移动更新预览。完成后保存结果并释放本次事件；取消只移除草稿。
7. 页面离开时，Hook 清理自己的图层、数据源、事件和光标；`CesiumMap` 负责销毁 Viewer。

`CallbackProperty` 读取 Ref 中的预览顶点，让图形跟随鼠标。工具栏的预览数值最多每 100 毫秒更新一次，避免每次鼠标移动都触发页面重新渲染。

## 最小接入示例

```tsx
import { CesiumMap } from "@/components/CesiumMap";
import { MapToolbar } from "@/components/CesiumMapTools/MapToolbar";
import { useBasemap } from "@/components/CesiumMapTools/useBasemap";
import { useMapMeasurement } from "@/components/CesiumMapTools/useMapMeasurement";

function SceneTools() {
  const basemap = useBasemap();
  const measurement = useMapMeasurement();
  return <MapToolbar basemap={basemap} measurement={measurement} />;
}

export function MapExample() {
  return (
    <div className="h-[600px]">
      <CesiumMap options={{ baseLayer: false }}>
        <SceneTools />
      </CesiumMap>
    </div>
  );
}
```

`CesiumMap` 只读取首次构造选项。切换底图应调用 `basemap.setSource()` 或 `basemap.setType()`，而不是修改 `options`。

页面需要不同 UI 时，可直接使用 Hook 返回的状态和方法。默认工具栏通过 `tools` 选择能力，例如 `tools={["basemap", "distance"]}`；通过 `className` 调整容器定位。

## 工具栏样式与操作（2026-10-25）

- 使用“底图、测距、测面积、结果”四个简单文字按钮；当前工具轻量高亮，结果数量直接显示在文字后面。桌面竖排，窄屏在底部横排。
- 底图面板只保留来源与类型两组普通单选项，禁用选项保留说明；不展示缩略图或额外状态卡片。具体 Key 配置步骤仍见下节。
- 底图、结果和当前测量共用一个主面板位置。查看底图或结果不会取消测量，可以点击“返回正在进行的测量”继续查看草稿。
- 再次点击当前测量工具会取消草稿，完成结果保留；清空入口放在结果面板中，减少主工具栏上的干扰。
- 底图和结果面板可点击外部收起，也可按 Esc 关闭并把焦点归还打开面板的按钮。测量面板继续由测量 Hook 处理 Esc 取消。
- 测量面板仅显示当前数值、顶点数、一行操作提示及完成／取消按钮；结果使用简短列表，支持删除和清空。不增加示意线、大号仪表数字或装饰图标。
- 面板颜色通过 `theme.useToken()` 跟随应用主题；样式只负责必要的定位、间距和选中状态，没有额外动画。所有选择器使用 `map-tools` 前缀，减少样式相互覆盖。

以上交互仍直接调用原有 Hook，不新增全局状态、工具注册中心或通用面板框架。

## 来源与 Key

- 每次进入页面默认 OSM 矢量图，即使已经配置天地图 Key 也不会自动切换来源。
- OSM 标准服务不提供影像图，UI 和 Hook 均阻止该组合。
- 天地图 Key 配置在 `.env.local` 的 `VITE_TIANDITU_TOKEN` 中，修改后重启开发服务；根目录 `.env.example` 已提供变量示例。
- 天地图矢量图使用 `vec_w` 与 `cva_w`，影像图使用 `img_w` 与 `cia_w`。两组都使用球面墨卡托矩阵集 `w`。
- 更换来源会重置为矢量图；当前来源失败时可重试或主动切回 OSM，不自动替换来源。

## 测量与页面交互

测量忽略高度与地形起伏，内部保存米或平方米。距离不闭合，面积自动闭合。面积会拒绝重复顶点、自交、经纬度共线等退化形状，以及不大于 0.01 平方米的面积；经度跨度大于 180 度或存在绝对纬度大于 85 度的顶点时也不能完成。距离按相邻点的大圆距离累加，不套用上述面积范围限制。结果只在当前地图中保留，可以逐条删除或全部清空；清空同时取消草稿，结果编号在当前地图内继续递增。

地形会影响取点和图形显示，但测量数值不包含地形起伏：

- 取点：三维优先拾取地形表面，随后仅保留经纬度并丢弃高度。
- 计算：距离与面积只使用经纬度，不沿地形采样。跨山谷测距不会累计上下坡路程，山坡测面积不会计算实际地形表面积。
- 显示：折线、顶点和标签贴地显示，可以随山坡起伏；视觉上贴地不代表按地形计算。

对于相同的经纬度顶点，开启或关闭地形不改变计算结果。但同一个屏幕位置可能拾取到不同的经纬度，所以重新点击测量时，数值可能间接受地形影响。详细说明已同步到设计计划的“3.2 距离与面积测量”。

开始测量后，页面应根据 `measurement.activeType !== null` 暂停自己的地图鼠标交互。边界页通过 Ref 将最新模式交给已注册的回调，不会因为模式改变而重新加载 GeoJSON；已有选中区县保留，悬停样式清除，下钻与返回暂时禁用。

业务拾取使用 `scene.drillPick()`，跳过 `MEASUREMENT_ENTITY_PREFIX` 开头的测量实体，避免结果图形挡住区县。共享边界线仍保持原来的选择语义。

测量时可继续平移、缩放。左键添加顶点，无法拾取地球位置或与上一顶点相距不足 1 厘米时不增加顶点。预览包含鼠标指向的临时点；右键或“完成”按钮仅提交点击确定的顶点。顶点数达标后仍会校验形状，失败时保留草稿供补点或取消。

Esc 或“取消”按钮丢弃草稿；焦点在底图／结果面板中时，Esc 优先收起面板并保留草稿，输入框、选择框、可编辑内容和对话框的键盘事件交由对应界面处理。外部传入 `disabled: true` 同样取消草稿并保留完成结果，便于后续接入航线绘制和保存流程。

## 验证

```powershell
node --test --test-force-exit tests/mapTools.test.mjs
node --test scripts/hangzhou-boundaries.test.mjs
pnpm lint
pnpm build
```

工具专项测试覆盖计算、来源限制、事件恢复、资源清理、StrictMode、双地图和默认 UI。真实浏览器验收记录与待完成项目见[设计与集成计划](../../../docs/地图基础工具设计与集成计划.md#五实施顺序与验收)。
