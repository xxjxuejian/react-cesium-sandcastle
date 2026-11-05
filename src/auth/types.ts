import type { BackendRouteItem } from "../router/types.js";

/** 会话接口提供的用户资料，用于页面展示。 */
export type AuthUser = {
  /** 系统生成的用户标识。 */
  id: string;
  /** 登录时输入的用户名。 */
  username: string;
  /** 页眉显示的昵称。 */
  nickname: string;
  /** admin 是管理员，viewer 是普通用户。接口权限由后端校验。 */
  role: "admin" | "viewer";
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResult = {
  accessToken: string;
  user: AuthUser;
  routes: BackendRouteItem[];
};

export type SessionResult = {
  user: AuthUser;
  routes: BackendRouteItem[];
};
