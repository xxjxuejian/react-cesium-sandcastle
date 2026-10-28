import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build, stop } from "esbuild";
import { JSDOM } from "jsdom";

// 使用真实 React、Cesium 图层集合与实体，只替换依赖画布输入的事件处理器。
// 这里验证资源归属和交互流程，真实 WebGL、在线瓦片与拾取仍需浏览器验收。
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
for (const name of [
  "window",
  "document",
  "navigator",
  "localStorage",
  "HTMLElement",
  "Element",
  "SVGElement",
  "ShadowRoot",
  "Node",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "MutationObserver",
]) {
  Object.defineProperty(globalThis, name, {
    value: name === "window" ? dom.window : dom.window[name],
    configurable: true,
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalGetComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.getComputedStyle = (element) => originalGetComputedStyle(element);
dom.window.getComputedStyle = globalThis.getComputedStyle;
dom.window.matchMedia = (media) => ({
  matches: false,
  media,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
});
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
dom.window.ResizeObserver = globalThis.ResizeObserver;

const temporaryDirectory = resolve("node_modules/.tmp/map-tools-tests");
await mkdir(temporaryDirectory, { recursive: true });
const sourceRoot = resolve("src").replaceAll("\\", "/");
const entry = `export { CesiumContext } from "${sourceRoot}/components/CesiumMap/context.ts";
export { useBasemap } from "${sourceRoot}/components/CesiumMapTools/useBasemap.ts";
export { useMapMeasurement } from "${sourceRoot}/components/CesiumMapTools/useMapMeasurement.ts";
export { MapToolbar } from "${sourceRoot}/components/CesiumMapTools/MapToolbar.tsx";
export * from "${sourceRoot}/components/CesiumMapTools/measurement.ts";
export { ScreenSpaceEventHandler } from "cesium";`;

async function loadTools(withKey) {
  const outfile = resolve(
    temporaryDirectory,
    withKey ? "with-key.mjs" : "without-key.mjs",
  );
  await build({
    stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    jsx: "automatic",
    define: {
      "import.meta.env.VITE_TIANDITU_TOKEN": withKey
        ? '"test-key"'
        : "undefined",
    },
    plugins: [
      {
        name: "画布输入替身",
        setup(builder) {
          builder.onResolve({ filter: /^cesium$/ }, (args) =>
            args.namespace === "test-cesium"
              ? { path: "cesium", external: true }
              : { path: "cesium", namespace: "test-cesium" },
          );
          builder.onLoad({ filter: /.*/, namespace: "test-cesium" }, () => ({
            resolveDir: process.cwd(),
            loader: "js",
            contents: `export * from "cesium";
            export class ScreenSpaceEventHandler {
              static instances = [];
              actions = new Map(); destroyed = false;
              constructor() { ScreenSpaceEventHandler.instances.push(this); }
              setInputAction(callback, type) { this.actions.set(type, callback); }
              getInputAction(type) { return this.actions.get(type); }
              removeInputAction(type) { this.actions.delete(type); }
              destroy() { this.destroyed = true; this.actions.clear(); }
            }`,
          }));
        },
      },
    ],
  });
  return import(pathToFileURL(outfile).href);
}

const withoutKey = await loadTools(false);
const withKey = await loadTools(true);
const { createElement, StrictMode } = await import("react");
const { act, cleanup, renderHook, render, screen, fireEvent } =
  await import("@testing-library/react");
const {
  Cartesian3,
  DataSourceCollection,
  Ellipsoid,
  Entity,
  ImageryLayerCollection,
  JulianDate,
  SceneMode,
  ScreenSpaceEventType,
} = await import("cesium");
// 使用已有的翻译初始化，检查默认工具栏显示的真实中文提示。
await build({
  stdin: {
    contents: `import "${sourceRoot}/i18n/index.ts";`,
    resolveDir: process.cwd(),
  },
  outfile: resolve(temporaryDirectory, "i18n.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
await import(pathToFileURL(resolve(temporaryDirectory, "i18n.mjs")).href);
await (await import("i18next")).default.changeLanguage("zh-CN");

function createViewer(tools) {
  const canvas = document.createElement("canvas");
  document.body.append(canvas);
  const viewer = {
    destroyed: false,
    dataSources: new DataSourceCollection(),
    imageryLayers: new ImageryLayerCollection(),
    scene: {
      canvas,
      mode: SceneMode.SCENE3D,
      requestRender() {},
      globe: {
        ellipsoid: Ellipsoid.WGS84,
        pick: (position) =>
          position.x < 0
            ? undefined
            : Cartesian3.fromDegrees(position.x, position.y, 300),
      },
    },
    camera: {
      cancelFlight() {},
      getPickRay: (position) => position,
      pickEllipsoid: (position) =>
        position.x < 0
          ? undefined
          : Cartesian3.fromDegrees(position.x, position.y),
    },
    screenSpaceEventHandler: new tools.ScreenSpaceEventHandler(),
    isDestroyed() {
      return this.destroyed;
    },
  };
  return viewer;
}

function wrapperFor(viewer, tools, strict = false) {
  return function Wrapper({ children }) {
    const provider = createElement(
      tools.CesiumContext.Provider,
      { value: viewer },
      children,
    );
    return strict ? createElement(StrictMode, null, provider) : provider;
  };
}

function activeHandler(tools) {
  return tools.ScreenSpaceEventHandler.instances.findLast(
    (handler) =>
      !handler.destroyed &&
      handler.actions.has(ScreenSpaceEventType.LEFT_CLICK),
  );
}

function addPoints(tools, positions) {
  for (const [x, y] of positions) {
    act(() =>
      activeHandler(tools).getInputAction(ScreenSpaceEventType.LEFT_CLICK)({
        position: { x, y },
      }),
    );
  }
}

afterEach(() => cleanup());
after(() => {
  dom.window.close();
  stop();
});

test("水平距离、面积与单位格式符合参考值，不修改输入顶点", () => {
  const positions = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const original = structuredClone(positions);
  assert.ok(
    Math.abs(
      withKey.calculateDistance([
        [0, 0],
        [1, 0],
      ]) - 111195.08,
    ) < 0.1,
  );
  assert.ok(Math.abs(withKey.calculateArea(positions) - 12363718145) < 10);
  assert.deepEqual(positions, original);
  assert.equal(withKey.formatMeasurement(1500, "distance"), "1.50 km");
  assert.equal(withKey.formatMeasurement(2_000_000, "area"), "2.00 km²");
});

test("完成前拒绝顶点不足、重复、自交、退化和超出范围的多边形", () => {
  const validate = withKey.validateMeasurement;
  assert.equal(validate("distance", [[0, 0]]), "tooFewPoints");
  assert.equal(
    validate("distance", [
      [0, 0],
      [0, 0],
    ]),
    "invalidShape",
  );
  assert.equal(
    validate("area", [
      [0, 0],
      [1, 1],
      [0, 1],
      [1, 0],
    ]),
    "selfIntersection",
  );
  assert.equal(
    validate("area", [
      [0, 0],
      [1, 0],
      [2, 0],
    ]),
    "invalidShape",
  );
  assert.equal(
    validate("area", [
      [0, 0],
      [1, 1],
      [0, 0],
    ]),
    "invalidShape",
  );
  assert.equal(
    validate("area", [
      [179, 0],
      [-179, 0],
      [179, 1],
    ]),
    "unsupportedArea",
  );
  assert.equal(
    validate("distance", [
      [NaN, 0],
      [1, 0],
    ]),
    "invalidShape",
  );
  assert.equal(
    validate("area", [
      [0, 0],
      [1, 0],
      [1, 1],
    ]),
    null,
  );
});

test("面积拒绝斜向共线顶点，正常的非共线多边形仍可完成", () => {
  // 球面面积公式可能给经纬度共线点算出非零面积，不能单靠数值判断形状有效。
  const points = [
    [120, 30],
    [120.01, 30.01],
    [120.02, 30.02],
  ];
  assert.ok(withKey.calculateArea(points) > 0.01);
  assert.equal(withKey.validateMeasurement("area", points), "invalidShape");
  assert.equal(
    withKey.validateMeasurement("area", [...points].reverse()),
    "invalidShape",
  );
  assert.equal(
    withKey.validateMeasurement("area", [
      [120, 30],
      [120.01, 30.01],
      [120.02, 30.021],
    ]),
    null,
  );
});

test("未配置 Key 时仍默认 OSM，并从逻辑层阻止天地图和 OSM 影像", async () => {
  const viewer = createViewer(withoutKey);
  const { result, unmount } = renderHook(withoutKey.useBasemap, {
    wrapper: wrapperFor(viewer, withoutKey),
  });
  assert.equal(result.current.source, "osm");
  assert.equal(result.current.hasTiandituKey, false);
  act(() => {
    result.current.setSource("tianditu");
    result.current.setType("imagery");
  });
  assert.equal(result.current.source, "osm");
  assert.equal(result.current.type, "vector");
  assert.equal(viewer.imageryLayers.length, 1);
  unmount();
  assert.equal(viewer.imageryLayers.length, 0);
});

test("有 Key 仍默认 OSM，成组切换天地图并保留业务影像层，错误可重试", () => {
  const viewer = createViewer(withKey);
  const { result, unmount } = renderHook(withKey.useBasemap, {
    wrapper: wrapperFor(viewer, withKey),
  });
  const businessLayer = viewer.imageryLayers.addImageryProvider(
    viewer.imageryLayers.get(0).imageryProvider,
  );
  assert.equal(result.current.source, "osm");
  act(() => result.current.setSource("tianditu"));
  assert.equal(viewer.imageryLayers.length, 3);
  assert.match(
    viewer.imageryLayers.get(0).imageryProvider.url,
    /\/vec_w\/wmts/,
  );
  assert.match(
    viewer.imageryLayers.get(1).imageryProvider.url,
    /\/cva_w\/wmts/,
  );
  act(() => result.current.setType("imagery"));
  assert.match(
    viewer.imageryLayers.get(0).imageryProvider.url,
    /\/img_w\/wmts/,
  );
  assert.match(
    viewer.imageryLayers.get(1).imageryProvider.url,
    /\/cia_w\/wmts/,
  );
  act(() =>
    viewer.imageryLayers.get(0).imageryProvider.errorEvent.raiseEvent({}),
  );
  assert.equal(result.current.hasError, true);
  act(() => result.current.retry());
  assert.equal(result.current.hasError, false);
  act(() => result.current.setSource("osm"));
  assert.equal(result.current.type, "vector");
  assert.equal(viewer.imageryLayers.get(1), businessLayer);
  unmount();
  assert.equal(viewer.imageryLayers.length, 1);
});

test("测量支持二维、三维取点、多组结果及逐条删除，清空不影响业务实体", async () => {
  const viewer = createViewer(withKey);
  const businessSource = await viewer.dataSources.add(
    new (await import("cesium")).CustomDataSource("business"),
  );
  const businessEntity = businessSource.entities.add(new Entity());
  const { result, unmount } = renderHook(() => withKey.useMapMeasurement(), {
    wrapper: wrapperFor(viewer, withKey),
  });
  await act(async () => {});
  act(() => result.current.start("distance"));
  addPoints(withKey, [
    [120, 30],
    [120, 30],
    [-1, 30],
    [120.01, 30],
  ]);
  assert.equal(result.current.pointCount, 2);
  act(() =>
    activeHandler(withKey).getInputAction(ScreenSpaceEventType.RIGHT_CLICK)(),
  );
  assert.equal(result.current.activeType, null);
  assert.equal(result.current.results.length, 1);
  assert.ok(result.current.results[0].value > 900);
  viewer.scene.mode = SceneMode.SCENE2D;
  act(() => result.current.start("area"));
  addPoints(withKey, [
    [120, 30],
    [120.01, 30],
    [120.01, 30.01],
  ]);
  act(() => result.current.finish());
  assert.equal(result.current.results.length, 2);
  assert.ok(result.current.results[1].value > 500_000);
  act(() => result.current.removeResult(1));
  assert.deepEqual(
    result.current.results.map((item) => item.id),
    [2],
  );
  act(() => result.current.clearResults());
  assert.equal(result.current.results.length, 0);
  assert.equal(
    businessSource.entities.getById(businessEntity.id),
    businessEntity,
  );
  unmount();
  assert.equal(viewer.dataSources.length, 1);
});

test("退化面积不能保存，草稿与已有结果保留，补充有效顶点后可以完成", async () => {
  const viewer = createViewer(withKey);
  const { result } = renderHook(() => withKey.useMapMeasurement(), {
    wrapper: wrapperFor(viewer, withKey),
  });
  await act(async () => {});
  act(() => result.current.start("distance"));
  addPoints(withKey, [
    [120, 30],
    [120.01, 30],
  ]);
  act(() => result.current.finish());

  act(() => result.current.start("area"));
  addPoints(withKey, [
    [120, 30],
    [120.01, 30.01],
    [120.02, 30.02],
  ]);
  const handler = activeHandler(withKey);
  assert.equal(result.current.canFinish, true);
  act(() => result.current.finish());
  assert.equal(result.current.error, "invalidShape");
  assert.equal(result.current.activeType, "area");
  assert.equal(result.current.pointCount, 3);
  assert.equal(result.current.results.length, 1);
  assert.equal(handler.destroyed, false);

  addPoints(withKey, [[120, 30.02]]);
  assert.equal(result.current.error, null);
  act(() => result.current.finish());
  assert.equal(result.current.activeType, null);
  assert.equal(result.current.results.length, 2);
  assert.equal(result.current.results[1].type, "area");
  assert.equal(handler.destroyed, true);
});

test("取消、Esc、外部禁用与卸载恢复事件、光标及双击动作", async () => {
  const viewer = createViewer(withKey);
  const previousDoubleClick = () => {};
  viewer.screenSpaceEventHandler.setInputAction(
    previousDoubleClick,
    ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
  );
  viewer.scene.canvas.style.cursor = "pointer";
  const { result, rerender, unmount } = renderHook(
    ({ disabled }) => withKey.useMapMeasurement({ disabled }),
    { initialProps: { disabled: false }, wrapper: wrapperFor(viewer, withKey) },
  );
  await act(async () => {});
  act(() => result.current.start("distance"));
  const firstHandler = activeHandler(withKey);
  assert.equal(viewer.scene.canvas.style.cursor, "crosshair");
  act(() => result.current.finish());
  assert.equal(result.current.error, "tooFewPoints");
  act(() =>
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  assert.equal(firstHandler.destroyed, true);
  assert.equal(result.current.activeType, null);
  assert.equal(viewer.scene.canvas.style.cursor, "pointer");
  assert.equal(
    viewer.screenSpaceEventHandler.getInputAction(
      ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    ),
    previousDoubleClick,
  );
  act(() => result.current.start("area"));
  rerender({ disabled: true });
  assert.equal(result.current.activeType, null);
  act(() => result.current.start("distance"));
  assert.equal(result.current.activeType, null);
  rerender({ disabled: false });
  act(() => result.current.start("distance"));
  const lastHandler = activeHandler(withKey);
  unmount();
  assert.equal(lastHandler.destroyed, true);
  assert.equal(viewer.scene.canvas.style.cursor, "pointer");
  assert.equal(viewer.dataSources.length, 0);
});

test("StrictMode、异步添加后卸载和双地图不会遗留或互相清理资源", async () => {
  const firstViewer = createViewer(withKey);
  const secondViewer = createViewer(withKey);
  const first = renderHook(
    () => {
      withKey.useBasemap();
      return withKey.useMapMeasurement();
    },
    { wrapper: wrapperFor(firstViewer, withKey, true) },
  );
  const second = renderHook(() => withKey.useMapMeasurement(), {
    wrapper: wrapperFor(secondViewer, withKey),
  });
  await act(async () => {});
  assert.equal(firstViewer.dataSources.length, 1);
  assert.equal(firstViewer.imageryLayers.length, 1);
  first.unmount();
  assert.equal(firstViewer.dataSources.length, 0);
  assert.equal(firstViewer.imageryLayers.length, 0);
  assert.equal(secondViewer.dataSources.length, 1);
  second.unmount();
  const pendingViewer = createViewer(withKey);
  const pending = renderHook(() => withKey.useMapMeasurement(), {
    wrapper: wrapperFor(pendingViewer, withKey),
  });
  pending.unmount();
  await act(async () => {});
  assert.equal(pendingViewer.dataSources.length, 0);
});

test("默认工具栏可完成测量、展示与删除结果，并提示缺少 Key", async () => {
  const viewer = createViewer(withoutKey);
  function Tools() {
    return createElement(withoutKey.MapToolbar, {
      basemap: withoutKey.useBasemap(),
      measurement: withoutKey.useMapMeasurement(),
    });
  }
  render(createElement(Tools), { wrapper: wrapperFor(viewer, withoutKey) });
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /底\s*图/, exact: true }));
  assert.equal(
    screen.getByRole("radio", { name: "天地图", exact: true }).disabled,
    true,
  );
  assert.equal(
    screen.getByRole("radio", { name: "影像图", exact: true }).disabled,
    true,
  );
  assert.ok(screen.getByText("天地图暂未启用，请先配置访问 Key。"));
  fireEvent.click(screen.getByRole("button", { name: /测\s*距/, exact: true }));
  addPoints(withoutKey, [
    [120, 30],
    [120.01, 30],
  ]);
  fireEvent.click(screen.getByRole("button", { name: /完\s*成/, exact: true }));
  fireEvent.click(screen.getByRole("button", { name: /测量结果/ }));
  assert.ok(screen.getByRole("button", { name: "删除测量结果 1" }));
  fireEvent.click(screen.getByRole("button", { name: "删除测量结果 1" }));
  assert.ok(screen.getByText("暂无测量结果"));
});

test("浏览面板互斥、Esc 归还焦点，并且浏览底图不会丢失测量草稿", async () => {
  const viewer = createViewer(withoutKey);
  function Tools() {
    return createElement(withoutKey.MapToolbar, {
      basemap: withoutKey.useBasemap(),
      measurement: withoutKey.useMapMeasurement(),
    });
  }
  render(createElement(Tools), { wrapper: wrapperFor(viewer, withoutKey) });
  await act(async () => {});
  const distanceButton = screen.getByRole("button", {
    name: "测距",
    exact: true,
  });
  fireEvent.click(distanceButton);
  addPoints(withoutKey, [
    [120, 30],
    [120.01, 30],
  ]);
  assert.equal(distanceButton.getAttribute("aria-pressed"), "true");
  const handler = activeHandler(withoutKey);

  const basemapButton = screen.getByRole("button", {
    name: "底图",
    exact: true,
  });
  fireEvent.click(basemapButton);
  assert.equal(screen.queryByRole("region", { name: "当前测量" }), null);
  assert.ok(screen.getByRole("region", { name: "底图" }));
  assert.equal(handler.destroyed, false);
  fireEvent.keyDown(screen.getByRole("radio", { name: "OSM" }), {
    key: "Escape",
  });
  assert.equal(document.activeElement, basemapButton);
  assert.ok(screen.getByRole("region", { name: "当前测量" }));
  assert.ok(screen.getByText("2 个顶点"));
  assert.equal(handler.destroyed, false);

  fireEvent.click(screen.getByRole("button", { name: /测量结果/ }));
  fireEvent.click(basemapButton);
  assert.equal(screen.queryByRole("region", { name: "测量结果" }), null);
  fireEvent.pointerDown(document.body);
  assert.equal(basemapButton.getAttribute("aria-expanded"), "false");
  assert.ok(screen.getByRole("region", { name: "当前测量" }));
  fireEvent.click(screen.getByRole("button", { name: "完成", exact: true }));
  assert.equal(handler.destroyed, true);
  fireEvent.click(screen.getByRole("button", { name: /测量结果/ }));
  assert.ok(screen.getByRole("button", { name: "删除测量结果 1" }));
  fireEvent.click(screen.getByRole("button", { name: "清空测量" }));
  assert.ok(screen.getByText("暂无测量结果"));
});

test("再次点击当前工具取消草稿；仅启用底图时不显示测量入口", async () => {
  const viewer = createViewer(withoutKey);
  function Tools({ tools }) {
    return createElement(withoutKey.MapToolbar, {
      basemap: withoutKey.useBasemap(),
      measurement: withoutKey.useMapMeasurement(),
      tools,
    });
  }
  const { rerender } = render(createElement(Tools), {
    wrapper: wrapperFor(viewer, withoutKey),
  });
  await act(async () => {});
  const distanceButton = screen.getByRole("button", {
    name: "测距",
    exact: true,
  });
  fireEvent.click(distanceButton);
  addPoints(withoutKey, [[120, 30]]);
  const handler = activeHandler(withoutKey);
  fireEvent.click(distanceButton);
  assert.equal(handler.destroyed, true);
  assert.equal(distanceButton.getAttribute("aria-pressed"), "false");
  assert.equal(screen.queryByRole("region", { name: "当前测量" }), null);
  rerender(createElement(Tools, { tools: ["basemap"] }));
  assert.ok(screen.getByRole("button", { name: "底图", exact: true }));
  assert.equal(
    screen.queryByRole("button", { name: "测距", exact: true }),
    null,
  );
  assert.equal(screen.queryByRole("button", { name: /测量结果/ }), null);
});
