import { create } from "zustand";

import {
  getSession,
  login as loginRequest,
  logout as logoutRequest,
} from "@/api/auth";
import {
  getAccessToken,
  removeAccessToken,
  setAccessToken,
} from "@/auth/token";
import type { AuthUser, LoginRequest } from "@/auth/types";
import type { BackendRouteItem } from "@/router/types";

/* 
当前登录认证处于哪个阶段”，但它不只是简单的“是否登录”。.
booting：正在检查登录状态。页面刚打开时，可能存在 token，但还没确认 token 是否有效。
anonymous：确定未登录，例如没有 token、token 已失效或已经退出。
authenticated：已经登录，并且成功获取了用户信息和路由权限。
*/
type AuthStatus = "booting" | "anonymous" | "authenticated";

// Zustand 不要求把“状态”和“修改状态的方法”分开定义；它们共同组成一个 store。
// 组件既可以订阅 status、user 等状态，也可以取出 login、logout 等 action 调用。
type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  routes: BackendRouteItem[];
  restoreSession: () => Promise<void>;
  login: (values: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
};

// 未登录时需要重复写入的状态集中在这里，供恢复会话失败和退出登录复用。
// `as const` 保留 "anonymous" 的字面量类型，避免它被推断成宽泛的 string。
const anonymousState = {
  status: "anonymous" as const,
  user: null,
  routes: [],
};

/*
 * create<AuthState>() 创建并返回一个 React Hook，也就是 useAuthStore。
 *
 * `set`：Zustand 提供的更新函数。传入对象时默认与旧状态浅合并，
 * 因此 action 只需写出本次要变化的字段，不必手动展开整个 store。
 *
 * React 组件内推荐使用 selector 订阅需要的片段：
 *   const user = useAuthStore((state) => state.user);
 * user 变化时组件会重新渲染，其他无关字段变化不会触发该订阅。
 *
 * React 组件外可使用 store 自带的命令式 API：
 *   useAuthStore.getState().restoreSession();
 * 本项目在 main.tsx 中用这种方式在应用启动时恢复会话。
 */
export const useAuthStore = create<AuthState>((set) => ({
  // booting 表示尚未确认本地 token 是否对应有效会话，路由会暂时显示加载页。
  status: "booting",
  user: null,
  routes: [],

  /* 
  用于应用启动时恢复并校验登录状态，浏览器刷新正是最主要的触发场景。
  刷新后：
  localStorage 中的 token 仍然存在。
  Zustand 内存中的 user、routes 会丢失。
  */
  // Zustand 的 action 可以直接是异步函数；请求完成后再调用 set 更新状态。
  restoreSession: async () => {
    // 没有 token 时无需请求后端，可以直接确认当前为未登录状态。
    if (!getAccessToken()) {
      set(anonymousState);
      return;
    }

    //
    // 而是携带 token 请求 /auth/session，由后端确认会话仍然有效，再恢复用户信息和权限路由。
    // 携带 token 有axios请求拦截器中完成
    try {
      const session = await getSession();
      set({
        status: "authenticated",
        user: session.user,
        routes: session.routes,
      });
    } catch {
      // token 无效或会话请求失败时，清除旧凭证，避免后续请求继续携带它。
      removeAccessToken();
      set(anonymousState);
    }
  },

  login: async (values) => {
    const result = await loginRequest(values);

    // 这里只把 token 持久化到 localStorage；user 和 routes 保存在内存中，
    // 页面刷新后由 restoreSession 根据 token 从后端重新取得，避免保存过期的会话详情。
    setAccessToken(result.accessToken);
    set({
      status: "authenticated",
      user: result.user,
      routes: result.routes,
    });
  },

  logout: async () => {
    try {
      await logoutRequest();
    } catch {
      // 即使 Mock 或后端退出失败，也要清理当前浏览器中的登录状态。
    } finally {
      // finally 保证本地登出一定执行；set 后所有订阅认证状态的组件会自动更新。
      removeAccessToken();
      set(anonymousState);
    }
  },
}));
