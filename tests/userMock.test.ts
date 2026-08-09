import assert from "node:assert/strict";
import test from "node:test";

import userMocks from "../mock/system-management/user.mock.js";

function getMock(method: string, url: string) {
  const mock = userMocks.find(
    (item) => item.method === method && item.url === url,
  );

  assert.ok(mock);
  return mock;
}

test("用户列表返回统一响应", () => {
  const result = getMock("get", "/api/system-management/users").response({
    url: "/api/system-management/users",
    body: {} as never,
    query: { page: "1", pageSize: "10" },
  }) as {
    code: number;
    message: string;
    data: { list: unknown[] };
  };

  assert.equal(result.code, 0);
  assert.equal(result.message, "查询用户列表成功");
  assert.ok(Array.isArray(result.data.list));
});

test("删除用户返回 true 和对应消息，重复删除返回业务错误", () => {
  const mock = getMock("delete", "/api/system-management/users/:id");
  const success = mock.response({
    url: "/api/system-management/users/4",
    body: {} as never,
    query: {},
  });
  const failure = mock.response({
    url: "/api/system-management/users/4",
    body: {} as never,
    query: {},
  });

  assert.deepEqual(success, {
    code: 0,
    message: "删除用户成功",
    data: true,
  });
  assert.deepEqual(failure, {
    code: 40401,
    message: "用户不存在",
    data: null,
  });
});
