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

const temporaryDirectory = resolve("node_modules/.tmp/airline-page-tests");
await mkdir(temporaryDirectory, { recursive: true });
const sourceRoot = resolve("src").replaceAll("\\", "/");
const mockRoot = resolve("mock").replaceAll("\\", "/");
const bundlePath = resolve(temporaryDirectory, "page.mjs");
await build({
  stdin: {
    contents: `export { default as AirlineManagement } from "${sourceRoot}/pages/system-management/airline-management/index.tsx";
      export { default as request } from "${sourceRoot}/utils/request.ts";
      export { default as mocks } from "${mockRoot}/system-management/airline.mock.ts";`,
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
      name: "航线地图渲染替身",
      setup(builder) {
        builder.onResolve({ filter: /^\.\/AirlineMap$/ }, () => ({
          path: "airline-map",
          namespace: "test-map",
        }));
        builder.onLoad({ filter: /.*/, namespace: "test-map" }, () => ({
          contents: `import { createElement, useLayoutEffect } from "react";
          export function AirlineMap(props) {
            useLayoutEffect(() => { globalThis.airlineMapTestProps = props; });
            return createElement("div", { "data-testid": "airline-map" }, "地图渲染替身");
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
const { AirlineManagement, request, mocks } = await import(
  pathToFileURL(bundlePath).href
);
after(() => {
  dom.window.close();
  stop();
});
const baseUrl = "/api/system-management/airlines";
let failNextSave = false;
let failNextList = false;
const createdIds = [];
const requests = [];

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
  const remove = mocks.find((item) => item.method === "delete");
  for (const id of createdIds.splice(0))
    remove.response({ url: `${baseUrl}/${id}` });
  requests.length = 0;
  failNextSave = false;
  failNextList = false;
});

async function openList() {
  const result = render(
    createElement(StrictMode, null, createElement(AirlineManagement)),
  );
  await screen.findByText("共 12 条航线");
  return result;
}

async function openCreate() {
  await openList();
  fireEvent.click(
    screen.getByRole("button", { name: "新增航线", exact: true }),
  );
  await screen.findByRole("heading", { name: "新增航线" });
  fireEvent.change(screen.getByLabelText("航线名称"), {
    target: { value: "页面测试航线" },
  });
}

async function addPoints(points) {
  for (const point of points)
    await act(async () => globalThis.airlineMapTestProps.onAdd(point));
}

const first = { longitude: 120, latitude: 30, altitude: 60 };
const second = { longitude: 120.01, latitude: 30.01, altitude: 80 };

test("列表支持搜索、重置和分页，列表失败后可以刷新重试", async () => {
  const { container } = await openList();
  const nextPage = container.querySelector(".ant-pagination-item-2");
  assert.ok(nextPage);
  fireEvent.click(nextPage);
  await waitFor(() =>
    assert.equal(
      container.querySelectorAll("tbody tr[data-row-key]").length,
      2,
    ),
  );
  fireEvent.change(screen.getByPlaceholderText("输入航线名称"), {
    target: { value: "沿江" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^搜\s*索$/ }));
  await screen.findByText("共 1 条航线");
  assert.ok(screen.getByText("滨江沿江巡检航线"));
  fireEvent.click(screen.getByRole("button", { name: /^重\s*置$/ }));
  await screen.findByText("共 12 条航线");
  failNextList = true;
  fireEvent.click(screen.getByRole("button", { name: /刷\s*新/ }));
  await screen.findByText("模拟列表加载失败");
  fireEvent.click(screen.getByRole("button", { name: /刷\s*新/ }));
  await screen.findByText("共 12 条航线");
});

test("查看时请求完整详情，字段只读且不允许从地图回调增加航点", async () => {
  await openList();
  assert.equal(
    requests.some((item) => item.url.includes("airline-")),
    false,
  );
  fireEvent.click(
    screen.getAllByRole("button", { name: "查看", exact: true })[0],
  );
  await screen.findByRole("heading", { name: "查看航线" });
  assert.equal(screen.getByLabelText("航线名称").disabled, true);
  assert.equal(screen.queryByRole("button", { name: "保存航线" }), null);
  assert.equal(screen.queryByRole("button", { name: "开始绘制" }), null);
  assert.equal(globalThis.airlineMapTestProps.waypoints.length, 5);
  await addPoints([first]);
  assert.equal(globalThis.airlineMapTestProps.waypoints.length, 5);
});

test("绘制结束不保存，航点批量改高度、拖动回写、排序后统一保存", async () => {
  await openCreate();
  fireEvent.click(screen.getByRole("button", { name: "开始绘制" }));
  assert.equal(globalThis.airlineMapTestProps.drawing, true);
  await addPoints([first, second]);
  fireEvent.click(screen.getByRole("button", { name: "结束绘制" }));
  assert.equal(
    requests.some((item) => item.method === "post"),
    false,
  );
  const batch = screen.getByRole("spinbutton", {
    name: "新增及批量设置的航点高度（米）",
  });
  fireEvent.change(batch, { target: { value: "100" } });
  fireEvent.blur(batch);
  fireEvent.click(screen.getByRole("button", { name: "批量设置高度" }));
  await waitFor(() =>
    assert.deepEqual(
      globalThis.airlineMapTestProps.waypoints.map((point) => point.altitude),
      [100, 100],
    ),
  );
  await act(async () => globalThis.airlineMapTestProps.onMove(0, 121, 31));
  assert.equal(
    Number(screen.getByRole("spinbutton", { name: "航点 1 经度" }).value),
    121,
  );
  fireEvent.click(screen.getByRole("button", { name: "上移航点 2" }));
  await waitFor(() =>
    assert.equal(
      globalThis.airlineMapTestProps.waypoints[0].longitude,
      second.longitude,
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "保存航线" }));
  await screen.findAllByRole("table");
  await screen.findByText("页面测试航线");
  const detail = mocks
    .find((item) => item.method === "get" && item.url.endsWith(":id"))
    .response({ url: `${baseUrl}/${createdIds[0]}` });
  assert.deepEqual(
    detail.data.waypoints.map((point) => point.order),
    [1, 2],
  );
  assert.deepEqual(
    detail.data.waypoints.map((point) => point.altitude),
    [100, 100],
  );
});

test("重复航点在页面阻止提交，保存失败后保留输入并允许重试", async () => {
  await openCreate();
  await addPoints([first, first]);
  fireEvent.click(screen.getByRole("button", { name: "保存航线" }));
  await screen.findByText("与前一个航点的位置和高度完全相同，请调整或删除。");
  assert.equal(
    requests.some((item) => item.method === "post"),
    false,
  );
  await act(async () =>
    globalThis.airlineMapTestProps.onMove(1, 120.02, 30.02),
  );
  failNextSave = true;
  fireEvent.click(screen.getByRole("button", { name: "保存航线" }));
  await screen.findByText("模拟保存失败，请重试");
  assert.equal(screen.getByLabelText("航线名称").value, "页面测试航线");
  assert.equal(globalThis.airlineMapTestProps.waypoints.length, 2);
  fireEvent.click(screen.getByRole("button", { name: "保存航线" }));
  await screen.findAllByRole("table");
});

test("编辑已有航线时使用详情初始化，并通过更新接口保存全部航点", async () => {
  await openCreate();
  await addPoints([first, second]);
  fireEvent.click(screen.getByRole("button", { name: "保存航线" }));
  await screen.findByText("页面测试航线");
  fireEvent.click(
    screen.getAllByRole("button", { name: "编辑", exact: true })[0],
  );
  await screen.findByRole("heading", { name: "编辑航线" });
  assert.equal(screen.getByLabelText("航线名称").value, "页面测试航线");
  assert.equal(globalThis.airlineMapTestProps.waypoints.length, 2);
  fireEvent.change(screen.getByLabelText("航线名称"), {
    target: { value: "页面测试航线已更新" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存航线" }));
  await screen.findByText("页面测试航线已更新");
  assert.equal(requests.filter((item) => item.method === "put").length, 1);
});

test("返回列表前提示未保存修改，可以继续编辑或确认放弃", async () => {
  // 只验证页面的确认分支；弹窗动画及焦点管理交给真实浏览器验收。
  const originalUseModal = Modal.useModal;
  const confirmations = [];
  Modal.useModal = () => [
    { confirm: (options) => confirmations.push(options) },
    null,
  ];
  try {
    await openCreate();
    fireEvent.click(screen.getByRole("button", { name: "返回列表" }));
    assert.equal(confirmations[0].title, "放弃未保存的修改？");
    assert.equal(confirmations[0].cancelText, "继续编辑");
    assert.equal(screen.getByLabelText("航线名称").value, "页面测试航线");
    fireEvent.click(screen.getByRole("button", { name: "返回列表" }));
    await act(async () => confirmations[1].onOk());
    await screen.findAllByRole("table");
  } finally {
    cleanup();
    Modal.useModal = originalUseModal;
  }
});
