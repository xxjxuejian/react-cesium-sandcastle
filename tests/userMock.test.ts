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

test("Mock 新增校验初始密码与唯一用户名，响应不含密码及伪造字段", () => {
  const create = getMock("post", "/api/system-management/users");
  const body = {
    username: "new-mock-user",
    nickname: "模拟用户",
    status: "enabled" as const,
    gender: "unknown" as const,
    role: "viewer" as const,
    password: "test-only-initial-password",
    id: "forged",
  };
  const result = create.response({ url: create.url, body, query: {} }) as {
    code: number;
    data: { id: string; password?: string; role: string };
  };
  assert.equal(result.code, 0);
  assert.notEqual(result.data.id, "forged");
  assert.equal(result.data.password, undefined);
  assert.equal(result.data.role, "viewer");
  const duplicate = create.response({ url: create.url, body, query: {} }) as {
    code: number;
  };
  assert.equal(duplicate.code, 40900);
  const invalid = create.response({
    url: create.url,
    body: { ...body, username: "another-user", password: "short" },
    query: {},
  }) as { code: number };
  assert.equal(invalid.code, 40000);
  const reset = getMock("put", "/api/system-management/users/:id/password");
  assert.deepEqual(
    reset.response({
      url: `/api/system-management/users/${result.data.id}/password`,
      body: { password: body.password },
      query: {},
    }),
    { code: 0, message: "模拟重置成功，不会修改登录账号", data: true },
  );
});

test("Mock 保护最后一个启用管理员，分页参数错误返回明确响应", () => {
  const remove = getMock("delete", "/api/system-management/users/:id");
  const result = remove.response({
    url: "/api/system-management/users/1",
    body: {},
    query: {},
  }) as { code: number };
  assert.equal(result.code, 40900);
  const list = getMock("get", "/api/system-management/users");
  assert.equal(
    (
      list.response({
        url: list.url,
        body: {},
        query: { pageSize: "101" },
      }) as { code: number }
    ).code,
    40000,
  );
});
