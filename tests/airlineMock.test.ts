import assert from "node:assert/strict";
import test from "node:test";

import airlineMocks from "../mock/system-management/airline.mock.js";
import type {
  AirlineFormValues,
  AirlineListResult,
  AirlineRecord,
} from "../src/pages/system-management/airline-management/types.js";
import type { ApiResponse } from "../src/types/api.js";
import { calculateAirlineLength } from "../src/utils/airline.js";

const baseUrl = "/api/system-management/airlines";

function getMock(method: string, path = "") {
  const mock = airlineMocks.find(
    (item) => item.method === method && item.url === `${baseUrl}${path}`,
  );
  assert.ok(mock);
  return mock;
}

function getList(query = {}) {
  return getMock("get").response({
    url: baseUrl,
    query,
  }) as ApiResponse<AirlineListResult>;
}

function getDetail(id: string) {
  return getMock("get", "/:id").response({
    url: `${baseUrl}/${id}?preview=true`,
  }) as ApiResponse<AirlineRecord>;
}

function create(body: AirlineFormValues) {
  return getMock("post").response({
    url: baseUrl,
    body,
  }) as ApiResponse<AirlineRecord>;
}

function remove(id: string) {
  return getMock("delete", "/:id").response({ url: `${baseUrl}/${id}` });
}

function validValues(): AirlineFormValues {
  return {
    name: "  测试航线 Route A  ",
    speed: 5,
    waypoints: [
      { longitude: 120, latitude: 30, altitude: 0 },
      { longitude: 120.01, latitude: 30.01, altitude: 80 },
    ],
  };
}

test("详情路由优先注册，生产 Mock 不会把详情匹配成列表", () => {
  assert.equal(airlineMocks[0].url, `${baseUrl}/:id`);
  assert.equal(airlineMocks[1].url, baseUrl);
});

test("12 条固定样例按更新时间倒序分页，列表只返回摘要", () => {
  const first = getList();
  const second = getList({ page: "2", pageSize: "10" });
  assert.equal(first.code, 0);
  assert.equal(first.data.total, 12);
  assert.equal(first.data.list.length, 10);
  assert.equal(second.data.list.length, 2);
  assert.equal(first.data.list[0].id, "airline-012");
  assert.deepEqual(Object.keys(first.data.list[0]).sort(), [
    "id",
    "length",
    "name",
    "speed",
    "updatedAt",
    "waypointCount",
  ]);
  assert.equal(getList({ page: "3" }).data.total, 12);
  assert.deepEqual(getList({ page: "3" }).data.list, []);
  const detail = getDetail("airline-001").data;
  assert.equal(detail.waypoints.length, 5);
  assert.equal(detail.speed, 5);
  assert.ok(detail.waypoints.every((point) => point.altitude === 60));
});

test("先按名称过滤再分页，空白名称匹配全部", () => {
  const result = getList({ name: "  沿江  ", pageSize: "1" });
  assert.equal(result.data.total, 1);
  assert.equal(result.data.list[0].id, "airline-001");
  assert.equal(getList({ name: "  " }).data.total, 12);
  assert.deepEqual(getList({ name: "不存在的名称" }).data, {
    list: [],
    total: 0,
  });
});

test("非法查询参数返回业务错误", () => {
  for (const query of [
    { page: ["1"] },
    { pageSize: ["10"] },
    { page: "0" },
    { page: "-1" },
    { page: "1.5" },
    { page: "abc" },
    { page: "" },
    { page: "Infinity" },
    { page: "9007199254740992" },
    { pageSize: "0" },
    { pageSize: "101" },
    { pageSize: "1.5" },
    { pageSize: "" },
    { pageSize: "NaN" },
    { name: 123 },
  ]) {
    const result = getList(query);
    assert.equal(result.code, 40003, JSON.stringify(query));
    assert.equal(result.data, null);
  }
});

test("新增后可搜索详情，系统字段和航点序号不能由请求覆盖", () => {
  const input = {
    ...validValues(),
    id: "伪造编号",
    length: -1,
    waypointCount: 999,
    createdAt: "伪造时间",
    updatedAt: "伪造时间",
    shelterId: "不保存场地",
    waypoints: validValues().waypoints.map((point) => ({
      ...point,
      order: 99,
    })),
  };
  const result = create(input);
  assert.equal(result.code, 0);
  const airline = result.data;
  try {
    assert.match(airline.id, /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i);
    assert.equal(airline.name, "测试航线 Route A");
    assert.equal(airline.remark, "");
    assert.equal(airline.waypointCount, 2);
    assert.equal(airline.length, calculateAirlineLength(input.waypoints));
    assert.deepEqual(
      airline.waypoints.map((point) => point.order),
      [1, 2],
    );
    assert.equal("shelterId" in airline, false);
    assert.match(airline.createdAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.equal(airline.createdAt, airline.updatedAt);
    assert.equal(getList({ name: "  route a  " }).data.total, 1);
    assert.deepEqual(getDetail(airline.id).data, airline);
    // 模拟页面修改详情和提交对象，尚未保存时不应污染内存数据。
    airline.waypoints[0].altitude = 999;
    input.waypoints[0].altitude = 888;
    assert.equal(getDetail(airline.id).data.waypoints[0].altitude, 0);
  } finally {
    remove(airline.id);
  }
});

test("更新整体替换航点，保留编号和创建时间，失败更新不改变原记录", () => {
  const airline = create(validValues()).data;
  try {
    const update = getMock("put", "/:id");
    const url = `${baseUrl}/${airline.id}`;
    const invalid = update.response({
      url,
      body: { ...validValues(), speed: 0 },
    });
    assert.equal(invalid.code, 40003);
    assert.deepEqual(getDetail(airline.id).data, airline);

    const values = validValues();
    values.name = "更新后的航线";
    values.speed = 8;
    values.remark = "修改前的备注";
    values.waypoints.push({ longitude: 121, latitude: 31, altitude: 100 });
    const result = update.response({
      url,
      body: values,
    }) as ApiResponse<AirlineRecord>;
    assert.equal(result.code, 0);
    assert.equal(result.data.id, airline.id);
    assert.equal(result.data.createdAt, airline.createdAt);
    assert.ok(result.data.updatedAt >= airline.updatedAt);
    assert.equal(result.data.waypointCount, 3);
    assert.equal(result.data.length, calculateAirlineLength(values.waypoints));
    assert.deepEqual(
      result.data.waypoints.map((point) => point.order),
      [1, 2, 3],
    );

    const replaced = update.response({
      url,
      body: validValues(),
    }) as ApiResponse<AirlineRecord>;
    assert.equal(replaced.data.waypointCount, 2);
    assert.equal(replaced.data.remark, "");
  } finally {
    remove(airline.id);
  }
});

test("删除后详情、更新和再次删除均返回航线不存在", () => {
  const airline = create(validValues()).data;
  const total = getList().data.total;
  assert.deepEqual(remove(airline.id), {
    code: 0,
    message: "删除航线成功",
    data: true,
  });
  assert.equal(getList().data.total, total - 1);
  for (const result of [
    getDetail(airline.id),
    getMock("put", "/:id").response({
      url: `${baseUrl}/${airline.id}`,
      body: validValues(),
    }),
    remove(airline.id),
  ]) {
    assert.deepEqual(result, {
      code: 40403,
      message: "航线不存在",
      data: null,
    });
  }
});

test("缺失或非法字段被拒绝，错误指出字段或航点序号，且不会写入数据", () => {
  const original = validValues();
  const first = original.waypoints[0];
  // 这里故意提交违反 TypeScript 类型的数据，模拟绕过页面直接发送 HTTP 请求。
  const cases = [
    { body: null, error: "请求体" },
    { body: [], error: "请求体" },
    { body: { ...original, name: "  " }, error: "名称" },
    { body: { ...original, name: 1 }, error: "名称" },
    ...[0, -1, Infinity, NaN, "5"].map((speed) => ({
      body: { ...original, speed },
      error: "速度",
    })),
    { body: { ...original, remark: null }, error: "备注" },
    { body: { ...original, waypoints: [first] }, error: "两个航点" },
    { body: { ...original, waypoints: null }, error: "两个航点" },
    { body: { ...original, waypoints: [first, null] }, error: "第 2 个航点" },
    ...[
      { longitude: 181 },
      { longitude: -181 },
      { longitude: "120" },
      { longitude: NaN },
      { latitude: 91 },
      { latitude: -91 },
      { latitude: Infinity },
      { altitude: -1 },
      { altitude: undefined },
      { altitude: Infinity },
    ].map((patch) => ({
      body: { ...original, waypoints: [first, { ...first, ...patch }] },
      error: "第 2 个航点",
    })),
    {
      body: { ...original, waypoints: [first, { ...first }] },
      error: "完全相同",
    },
  ];
  const total = getList().data.total;
  for (const entry of cases) {
    const result = create(entry.body as AirlineFormValues);
    assert.equal(result.code, 40003);
    assert.equal(result.data, null);
    assert.ok(result.message.includes(entry.error), result.message);
  }
  assert.equal(getList().data.total, total);
});

test("允许同名、垂直升降、路径交叉、非相邻重复航点及手动闭合", () => {
  const first = { longitude: 120, latitude: 30, altitude: 0 };
  const second = { longitude: 120.01, latitude: 30.01, altitude: 60 };
  const values = validValues();
  values.waypoints = [
    first,
    { ...first, altitude: 80 },
    second,
    { longitude: 120, latitude: 30.01, altitude: 60 },
    { longitude: 120.01, latitude: 30, altitude: 60 },
    second,
    first,
  ];
  const a = create(values);
  const b = create(values);
  try {
    assert.equal(a.code, 0);
    assert.equal(b.code, 0);
    assert.notEqual(a.data.id, b.data.id);
  } finally {
    if (a.data) remove(a.data.id);
    if (b.data) remove(b.data.id);
  }
});

test("水平长度符合已知球面距离，不计高度差、不自动闭合，支持跨日期变更线", () => {
  const origin = { longitude: 0, latitude: 0, altitude: 0 };
  const east = { longitude: 1, latitude: 0, altitude: 999 };
  const north = { longitude: 1, latitude: 1, altitude: 60 };
  const oneDegree = (6371008.8 * Math.PI) / 180;
  assert.equal(calculateAirlineLength([]), 0);
  assert.equal(calculateAirlineLength([origin]), 0);
  assert.equal(
    calculateAirlineLength([origin, { ...origin, altitude: 80 }]),
    0,
  );
  assert.ok(
    Math.abs(calculateAirlineLength([origin, east, north]) - 2 * oneDegree) <
      0.001,
  );
  assert.ok(
    Math.abs(
      calculateAirlineLength([
        { ...origin, longitude: 179 },
        { ...origin, longitude: -179 },
      ]) -
        2 * oneDegree,
    ) < 0.001,
  );
  assert.ok(
    Math.abs(
      calculateAirlineLength([origin, { ...origin, longitude: 180 }]) -
        Math.PI * 6371008.8,
    ) < 0.001,
  );
});
