# 天地图基础测试

入口：案例展示 → 天地图基础测试，路由为 `/showcases/tianditu-basic`。

## 示例目的

直接在 `index.tsx` 中创建 Cesium `Viewer`，不使用项目封装的地图组件、自定义 Hook 或工具栏，便于按顺序学习最基础的接入方式。

1. React 渲染容器 `div`，`useRef` 保存它的引用。
2. `useEffect` 在 DOM 挂载后执行，创建三维地球，关闭默认底图。
3. 使用经度 `120.1551`、纬度 `30.2741`，从杭州上方 `30_000` 米处俯视。
4. 第二个 `useEffect` 默认加载 `vec_w` 矢量底图，再叠加 `cva_w` 中文注记。
5. 点击左上角按钮后，`isImagery` 状态改变，第二个 `useEffect` 先清理旧图层，再加载 `img_w` 影像底图和 `cia_w` 影像注记；再次点击切回矢量图。
6. 切换时保留同一个 Viewer 和当前视角；离开页面时移除错误监听并调用 `viewer.destroy()`，释放地图资源。

两层都使用 `tileMatrixSetID: "w"` 和 `WebMercatorTilingScheme`，请求级别为 1—18。这里的“矢量图”是道路地图样式，实际加载的是图片瓦片，注记也属于图片的一部分。示例使用默认椭球地表，没有加载真实地形或建筑。

## 本地配置

根目录 `.env.local` 中填写 `VITE_TIANDITU_TOKEN`，修改后重启 `pnpm dev`。配置示例见根目录 `.env.example`，实际 Key 不写入源码或文档。

## 路由与计划的关系

当前菜单来自 `src/router/mockRoutes.ts`，`src/router/transform.tsx` 自动发现本目录的 `index.tsx`。已检查 `src/config/menu.ts`，它是未参与当前 React 路由的历史配置，本示例无需修改它。

这是独立学习示例，不代表[地图基础工具设计与集成计划](../../../../docs/地图基础工具设计与集成计划.md)中的底图 Hook、测量工具或工具栏已经实施。

## 验证记录

- ESLint、TypeScript 项目检查和 Vite 生产构建通过，`git diff --check` 通过。
- 浏览器已确认：菜单入口可访问，杭州底图与中文注记正常显示；两层第 10 级瓦片均返回 `200` 和 PNG 图片。
- 切换到其他页面后画布数量从 1 变为 0，重新进入后恢复为 1，没有重复地图；中文和英文菜单切换正常。
- 检查过程中未发现地图错误；控制台存在主布局原有的 Ant Design `Drawer` 弃用提示，构建存在现有依赖和包体积提示，本示例未修改相关模块。
- 底图切换按钮（2026-10-25）：ESLint、TypeScript 检查、生产构建和差异检查通过；浏览器双向切换成功，`img_w`、`cia_w`、`vec_w`、`cva_w` 请求均返回 `200`，切换前后保持同一画布且只有一个地图实例，没有错误提示。
