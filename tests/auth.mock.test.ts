import assert from "node:assert/strict";
import test from "node:test";

import authMocks from "../mock/auth.mock.js";
import type { LoginRequest, LoginResult } from "../src/auth/types.js";
import type { ApiResponse } from "../src/types/api.js";

type AuthMockRequest = {
  body: LoginRequest;
  headers: Record<string, string | undefined>;
};

type AuthMockResponse = (
  request: AuthMockRequest,
) => ApiResponse<LoginResult | null>;

function getResponse(url: string) {
  const mock = authMocks.find((item) => item.url === url);
  assert.ok(mock);

  return mock.response as AuthMockResponse;
}

test("管理员登录后获得全部路由", () => {
  const response = getResponse("/api/auth/login")({
    body: { username: "admin", password: "admin123" },
    headers: {},
  });

  assert.equal(response.code, 0);
  assert.ok(
    response.data?.routes.some((route) => route.name === "SystemManagement"),
  );
});

test("普通用户不获得系统管理路由", () => {
  const response = getResponse("/api/auth/login")({
    body: { username: "viewer", password: "viewer123" },
    headers: {},
  });

  assert.equal(response.code, 0);
  assert.equal(
    response.data?.routes.some((route) => route.name === "SystemManagement"),
    false,
  );
});

test("错误凭证返回登录失败", () => {
  const response = getResponse("/api/auth/login")({
    body: { username: "admin", password: "wrong" },
    headers: {},
  });

  assert.equal(response.code, 10001);
  assert.equal(response.data, null);
});
