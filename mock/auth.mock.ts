import type { LoginRequest, SessionResult } from "../src/auth/types.js";
import type { BackendRouteItem } from "../src/router/types.js";
import { mockRoutes } from "../src/router/mockRoutes.js";
import type { ApiResponse } from "../src/types/api.js";

type MockUser = SessionResult["user"] & {
  password: string;
  token: string;
  routes: BackendRouteItem[];
};

type AuthMockRequest = {
  body: LoginRequest;
  headers: Record<string, string | undefined>;
};

const users: MockUser[] = [
  {
    id: "1",
    username: "admin",
    password: "admin123",
    nickname: "系统管理员",
    role: "管理员",
    token: "mock-admin-token",
    routes: mockRoutes,
  },
  {
    id: "2",
    username: "viewer",
    password: "viewer123",
    nickname: "访客用户",
    role: "普通用户",
    token: "mock-viewer-token",
    routes: mockRoutes.filter((route) => route.name !== "SystemManagement"),
  },
];

function getUserByToken(headers: AuthMockRequest["headers"]) {
  const authorization = headers.authorization ?? headers.Authorization;
  const token = authorization?.replace("Bearer ", "");

  return users.find((user) => user.token === token);
}

function getSessionResult(user: MockUser): SessionResult {
  return {
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
    },
    routes: user.routes,
  };
}

export default [
  {
    url: "/api/auth/login",
    method: "post",
    response: ({ body }: Pick<AuthMockRequest, "body">) => {
      const user = users.find(
        (item) =>
          item.username === body.username && item.password === body.password,
      );

      if (!user) {
        return {
          code: 10001,
          message: "用户名或密码错误",
          data: null,
        } satisfies ApiResponse<null>;
      }

      return {
        code: 0,
        message: "登录成功",
        data: {
          accessToken: user.token,
          ...getSessionResult(user),
        },
      };
    },
  },
  {
    url: "/api/auth/session",
    method: "get",
    response: ({ headers }: Pick<AuthMockRequest, "headers">) => {
      const user = getUserByToken(headers);

      if (!user) {
        return {
          code: 10002,
          message: "登录状态已失效",
          data: null,
        } satisfies ApiResponse<null>;
      }

      return {
        code: 0,
        message: "获取登录用户成功",
        data: getSessionResult(user),
      } satisfies ApiResponse<SessionResult>;
    },
  },
  {
    url: "/api/auth/logout",
    method: "post",
    response: () => ({
      code: 0,
      message: "退出成功",
      data: true,
    }),
  },
];
