import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build, stop } from "esbuild";
import { JSDOM } from "jsdom";

// JSDOM 验证表单和请求流程；真实 WebGL 绘制、鼠标拾取仍需浏览器验收。
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "SVGElement",
  "ShadowRoot",
  "Node",
  "Document",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "MutationObserver",
  "localStorage",
]) {
  Object.defineProperty(globalThis, name, {
    value: name === "window" ? dom.window : dom.window[name],
    configurable: true,
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const getStyle = dom.window.getComputedStyle.bind(dom.window);
dom.window.getComputedStyle = (element) => getStyle(element);
globalThis.getComputedStyle = dom.window.getComputedStyle;
dom.window.matchMedia = (query) => ({
  matches: false,
  media: query,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
});
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
dom.window.ResizeObserver = globalThis.ResizeObserver;
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
globalThis.requestAnimationFrame = (callback) =>
  setTimeout(() => callback(Date.now()), 0);
globalThis.cancelAnimationFrame = clearTimeout;

const temporaryDirectory = resolve("node_modules/.tmp/key-unit-page-tests");
await mkdir(temporaryDirectory, { recursive: true });
const sourceRoot = resolve("src").replaceAll("\\", "/");
const mockRoot = resolve("mock").replaceAll("\\", "/");
const bundlePath = resolve(temporaryDirectory, "page.mjs");
await build({
  stdin: {
    contents: `export { default as KeyUnitManagement } from "${sourceRoot}/pages/system-management/key-unit-management/index.tsx";
      export { default as request } from "${sourceRoot}/utils/request.ts";
      export { default as mocks } from "${mockRoot}/system-management/keyUnit.mock.ts";`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: bundlePath,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  alias: { "@": sourceRoot },
  jsx: "automatic",
  plugins: [
    {
      name: "重点单位地图渲染替身",
      setup(builder) {
        builder.onResolve({ filter: /^\.\/KeyUnitMap$/ }, () => ({
          path: "key-unit-map",
          namespace: "test-map",
        }));
        builder.onLoad({ filter: /.*/, namespace: "test-map" }, () => ({
          contents: `import { createElement, useLayoutEffect } from "react";
          export function KeyUnitMap(props) {
            useLayoutEffect(() => { globalThis.keyUnitMapTestProps = props; });
            return createElement("div", { "data-testid": "key-unit-map" }, "地图渲染替身");
          }`,
          loader: "js",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});

const { createElement, StrictMode } = await import("react");
const { render, screen, fireEvent, waitFor, cleanup, act } =
  await import("@testing-library/react");
const { AxiosHeaders } = await import("axios");
const { Modal } = await import("antd");
const { createMemoryRouter, RouterProvider } = await import("react-router");
const { KeyUnitManagement, request, mocks } = await import(
  pathToFileURL(bundlePath).href
);
after(() => {
  dom.window.close();
  stop();
});
const baseUrl = "/api/system-management/key-units";
let failNextSave = false;
let failNextList = false;
const createdIds = [];
const requests = [];
let pageRouter;

request.defaults.adapter = async (config) => {
  const url = `/api${config.url}`;
  const method = config.method;
  requests.push({ url, method });
  let result;
  if (failNextSave && (method === "post" || method === "put")) {
    failNextSave = false;
    result = { code: 40003, message: "模拟保存失败，请重试", data: null };
  } else if (failNextList && method === "get" && url === baseUrl) {
    failNextList = false;
    result = { code: 50003, message: "模拟列表加载失败", data: null };
  } else {
    const route = mocks.find(
      (item) =>
        item.method === method &&
        item.url === (url === baseUrl ? baseUrl : `${baseUrl}/:id`),
    );
    assert.ok(route);
    result = route.response({
      url,
      body: config.data ? JSON.parse(config.data) : undefined,
      query: Object.fromEntries(
        Object.entries(config.params ?? {})
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      ),
    });
    if (method === "post" && result.code === 0) createdIds.push(result.data.id);
  }
  return {
    data: result,
    status: 200,
    statusText: "OK",
    headers: new AxiosHeaders(),
    config,
  };
};

afterEach(() => {
  cleanup();
  pageRouter?.dispose();
  const remove = mocks.find((item) => item.method === "delete");
  for (const id of createdIds.splice(0))
    remove.response({ url: `${baseUrl}/${id}` });
  requests.length = 0;
  failNextSave = false;
  failNextList = false;
});

async function openList() {
  pageRouter = createMemoryRouter([
    { path: "/", element: createElement(KeyUnitManagement) },
    { path: "/other", element: createElement("p", null, "其他页面") },
  ]);
  const result = render(
    createElement(StrictMode, null, createElement(RouterProvider, { router: pageRouter })),
  );
  await screen.findByText("共 12 个重点单位");
  return result;
}

function change(label, value) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value: String(value) },
  });
}

async function openCreate() {
  await openList();
  fireEvent.click(
    screen.getByRole("button", { name: "新增重点单位", exact: true }),
  );
  await screen.findByRole("heading", { name: "新增重点单位" });
}

async function fillCreate() {
  change("单位名称 *", "页面测试单位");
  change("中心点经度", 120.2);
  change("中心点纬度", 30.25);
  fireEvent.click(screen.getByRole("tab", { name: "防御圈" }));
  for (const [name, radius, height] of [
    ["核心圈", 300, 120],
    ["反制圈", 800, 200],
    ["警戒圈", 1500, 300],
  ]) {
    fireEvent.click(screen.getByRole("button", { name, exact: true }));
    change(`${name}半径`, radius);
    change(`${name}最高高度`, height);
  }
  await waitFor(() =>
    assert.equal(
      screen.getByRole("button", { name: "保存重点单位" }).disabled,
      false,
    ),
  );
}

test("列表支持分页、名称查询、重置和失败后刷新", async () => {
  const { container } = await openList();
  fireEvent.click(container.querySelector(".ant-pagination-item-2"));
  await waitFor(() =>
    assert.equal(
      screen.getAllByRole("button", { name: "编辑", exact: true }).length,
      2,
    ),
  );
  change("单位名称", "市政府");
  fireEvent.click(screen.getByRole("button", { name: "搜索", exact: true }));
  await screen.findByText("共 1 个重点单位");
  fireEvent.click(screen.getByRole("button", { name: "重置", exact: true }));
  await screen.findByText("共 12 个重点单位");
  failNextList = true;
  fireEvent.click(screen.getByRole("button", { name: "刷新", exact: true }));
  await screen.findByText("模拟列表加载失败");
  fireEvent.click(screen.getByRole("button", { name: "刷新", exact: true }));
  await screen.findByText("共 12 个重点单位");
});

test("查看请求完整详情，表单只读且地图回调不能修改数据", async () => {
  await openList();
  fireEvent.click(
    screen.getAllByRole("button", { name: "查看", exact: true })[0],
  );
  await screen.findByRole("heading", { name: "查看重点单位" });
  assert.equal(screen.getByLabelText("核心圈半径").disabled, true);
  assert.equal(screen.queryByRole("button", { name: "保存重点单位" }), null);
  const original = structuredClone(globalThis.keyUnitMapTestProps.draft);
  await act(async () => {
    globalThis.keyUnitMapTestProps.onCenterChange(121, 31);
    globalThis.keyUnitMapTestProps.onRadiusChange(999);
  });
  assert.deepEqual(globalThis.keyUnitMapTestProps.draft, original);
  fireEvent.click(screen.getByText("三维预览", { exact: true }));
  await waitFor(() => assert.equal(globalThis.keyUnitMapTestProps.mode, "3d"));
  assert.ok(
    requests.some(
      (item) => item.method === "get" && item.url.endsWith("/key-unit-012"),
    ),
  );
});

test("新增整体校验三层参数，保存失败保留输入，重试后高度原值写入", async () => {
  await openCreate();
  assert.equal(
    screen.getByRole("button", { name: "保存重点单位" }).disabled,
    true,
  );
  await fillCreate();
  fireEvent.click(screen.getByRole("button", { name: "核心圈", exact: true }));
  change("核心圈最高高度", 250);
  await screen.findByText("核心圈最高高度不能超过反制圈最高高度");
  assert.equal(
    screen.getByRole("button", { name: "保存重点单位" }).disabled,
    true,
  );
  change("核心圈最高高度", 120);
  fireEvent.click(screen.getByRole("button", { name: "收起面板" }));
  fireEvent.click(screen.getByRole("button", { name: "展开面板" }));
  assert.equal(screen.getByLabelText("核心圈半径").value, "300");
  failNextSave = true;
  fireEvent.click(screen.getByRole("button", { name: "保存重点单位" }));
  await screen.findByText("模拟保存失败，请重试");
  assert.equal(screen.getByLabelText("核心圈最高高度").value, "120");
  fireEvent.click(screen.getByRole("button", { name: "保存重点单位" }));
  await screen.findByText("共 13 个重点单位");
  const saved = mocks
    .find((item) => item.method === "get" && item.url.endsWith(":id"))
    .response({ url: `${baseUrl}/${createdIds[0]}` }).data;
  assert.equal(saved.rings.core.minHeight, 0);
  assert.equal(saved.rings.core.maxHeight, 120);
  assert.equal(saved.longitude, 120.2);
  assert.equal(saved.name, "页面测试单位");
});

test("地图调整只修改当前草稿，取消回滚本次操作，三维切换保留数据", async () => {
  await openList();
  fireEvent.click(
    screen.getAllByRole("button", { name: "编辑", exact: true })[0],
  );
  await screen.findByRole("heading", { name: "编辑重点单位" });
  change("核心圈半径", 400);
  const before = structuredClone(globalThis.keyUnitMapTestProps.draft);
  fireEvent.click(
    screen.getByRole("button", { name: "设置单位位置", exact: true }),
  );
  await act(async () => globalThis.keyUnitMapTestProps.onCenterChange(121, 31));
  assert.equal(globalThis.keyUnitMapTestProps.draft.longitude, 121);
  assert.deepEqual(globalThis.keyUnitMapTestProps.draft.rings, before.rings);
  fireEvent.click(
    screen.getByRole("button", { name: "取消调整", exact: true }),
  );
  assert.deepEqual(globalThis.keyUnitMapTestProps.draft, before);
  fireEvent.click(
    screen.getByRole("button", { name: "地图调整半径", exact: true }),
  );
  await act(async () => globalThis.keyUnitMapTestProps.onRadiusChange(500));
  assert.equal(screen.getByLabelText("核心圈半径").value, "500");
  assert.equal(globalThis.keyUnitMapTestProps.draft.rings.counter.radius, 800);
  assert.equal(
    screen.getByRole("button", { name: "保存重点单位" }).disabled,
    true,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "完成调整", exact: true }),
  );
  fireEvent.click(screen.getByText("三维预览", { exact: true }));
  await waitFor(() => assert.equal(globalThis.keyUnitMapTestProps.mode, "3d"));
  assert.equal(globalThis.keyUnitMapTestProps.draft.rings.core.radius, 500);
  assert.equal(
    requests.some((item) => item.method === "put"),
    false,
  );
});

test("有修改时返回确认放弃，确认前不丢失输入", async () => {
  const originalUseModal = Modal.useModal;
  const confirmations = [];
  Modal.useModal = () => [
    { confirm: (options) => confirmations.push(options) },
    null,
  ];
  try {
    await openCreate();
    change("单位名称 *", "尚未保存的单位");
    fireEvent.click(
      screen.getByRole("button", { name: "返回列表", exact: true }),
    );
    assert.equal(confirmations[0].title, "放弃未保存的修改？");
    assert.equal(screen.getByLabelText("单位名称 *").value, "尚未保存的单位");
    await act(async () => confirmations[0].onOk());
    await screen.findByText("共 12 个重点单位");
  } finally {
    cleanup();
    Modal.useModal = originalUseModal;
  }
});

test("切换路由时保护草稿，取消后保留输入，确认后才离开", async () => {
  const originalUseModal = Modal.useModal;
  const confirmations = [];
  // 路由使用真实的内存路由；弹窗回调替身避免 JSDOM 依赖关闭动画和样式。
  const modalApi = {
    confirm(options) {
      confirmations.push(options);
      return { destroy() {} };
    },
  };
  Modal.useModal = () => [modalApi, null];
  try {
    await openCreate();
    change("单位名称 *", "不能被菜单切换丢失的草稿");
    await act(async () => pageRouter.navigate("/other"));
    assert.equal(confirmations.length, 1);
    assert.equal(pageRouter.state.location.pathname, "/");
    await act(async () => confirmations[0].onCancel());
    assert.equal(pageRouter.state.blockers.values().next().value.state, "unblocked");
    assert.equal(screen.getByLabelText("单位名称 *").value, "不能被菜单切换丢失的草稿");

    await act(async () => pageRouter.navigate("/other"));
    assert.equal(confirmations.length, 2);
    await act(async () => confirmations[1].onOk());
    await screen.findByText("其他页面");
    assert.equal(pageRouter.state.location.pathname, "/other");
    assert.equal(requests.some((item) => item.method === "post"), false);
  } finally {
    cleanup();
    Modal.useModal = originalUseModal;
  }
});

test("未修改的新建表单和只读详情可直接切换路由", async () => {
  await openCreate();
  await act(async () => pageRouter.navigate("/other"));
  await screen.findByText("其他页面");
  await act(async () => pageRouter.navigate("/"));
  await screen.findByText("共 12 个重点单位");
  fireEvent.click(screen.getAllByRole("button", { name: "查看", exact: true })[0]);
  await screen.findByRole("heading", { name: "查看重点单位" });
  await act(async () => pageRouter.navigate("/other"));
  await screen.findByText("其他页面");
  assert.equal(screen.queryByText("放弃未保存的修改？"), null);
});
