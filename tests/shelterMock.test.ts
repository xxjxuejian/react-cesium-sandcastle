import assert from "node:assert/strict";
import test from "node:test";

import shelterMocks from "../mock/system-management/shelter.mock.js";

function getMock(method: string, url: string) {
  const mock = shelterMocks.find(
    (item) => item.method === method && item.url === url,
  );

  assert.ok(mock);
  return mock;
}

test("生产环境下详情 GET 路由优先于列表 GET 路由注册", () => {
  const detailRouteIndex = shelterMocks.findIndex(
    (item) =>
      item.method === "get" &&
      item.url === "/api/system-management/shelters/:id",
  );
  const listRouteIndex = shelterMocks.findIndex(
    (item) =>
      item.method === "get" && item.url === "/api/system-management/shelters",
  );

  assert.ok(detailRouteIndex >= 0);
  assert.ok(listRouteIndex >= 0);
  assert.ok(detailRouteIndex < listRouteIndex);
});

test("避难场所列表返回统一响应", () => {
  const result = getMock(
    "get",
    "/api/system-management/shelters",
  ).response({
    url: "/api/system-management/shelters",
    body: {} as never,
    query: { page: "1", pageSize: "10" },
  }) as {
    code: number;
    message: string;
    data: { list: unknown[] };
  };

  assert.equal(result.code, 0);
  assert.equal(result.message, "查询避难场所列表成功");
  assert.ok(Array.isArray(result.data.list));
});

test("查询不存在的避难场所返回业务错误", () => {
  const result = getMock(
    "get",
    "/api/system-management/shelters/:id",
  ).response({
    url: "/api/system-management/shelters/missing-shelter",
    body: {} as never,
    query: {},
  });

  assert.deepEqual(result, {
    code: 40402,
    message: "避难场所不存在",
    data: null,
  });
});

test("删除避难场所返回 true 和对应消息，重复删除返回业务错误", () => {
  const mock = getMock("delete", "/api/system-management/shelters/:id");
  const success = mock.response({
    url: "/api/system-management/shelters/shelter-006",
    body: {} as never,
    query: {},
  });
  const failure = mock.response({
    url: "/api/system-management/shelters/shelter-006",
    body: {} as never,
    query: {},
  });

  assert.deepEqual(success, {
    code: 0,
    message: "删除避难场所成功",
    data: true,
  });
  assert.deepEqual(failure, {
    code: 40402,
    message: "避难场所不存在",
    data: null,
  });
});
