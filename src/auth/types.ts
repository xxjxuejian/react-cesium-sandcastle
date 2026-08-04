import type { BackendRouteItem } from "../router/types.js";

export type AuthUser = {
  id: string;
  username: string;
  nickname: string;
  role: string;
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
