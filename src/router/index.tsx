/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, useMemo } from "react";
import {
  createHashRouter,
  Navigate,
  useLocation,
  useRoutes,
} from "react-router";

import type { BackendRouteItem } from "./types";
import { transformRoutes } from "./transform";
import { useAuthStore } from "@/store/auth";

// 布局和独立页面按需加载，首次进入对应路由时才下载相关代码。
const MainLayout = lazy(() => import("@/layouts"));
const LoginPage = lazy(() => import("@/pages/login"));
const NotFound = lazy(() => import("@/pages/error/NotFound"));

// 会话恢复和懒加载页面共用的全屏等待状态。
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06111f] text-sm tracking-[0.2em] text-[#7e93a8]">
      LOADING SESSION
    </div>
  );
}

// 将父子路由片段拼成标准路径，同时清理重复的斜杠。
function joinPath(parentPath: string, path: string) {
  return `${parentPath}/${path}`.replace(/\/+/g, "/");
}

// 递归检查目标地址是否存在于当前用户拥有的后端路由树中。
// 登录成功后的回跳会先经过此校验，避免进入无权限或已失效的地址。
function hasRoutePath(
  routes: BackendRouteItem[],
  targetPath: string,
  parentPath = "",
): boolean {
  return routes.some((route) => {
    const fullPath = joinPath(parentPath, route.path);

    return (
      fullPath === targetPath ||
      (route.children?.length
        ? hasRoutePath(route.children, targetPath, fullPath)
        : false)
    );
  });
}

// 受保护区域的路由守卫：根据认证状态决定等待、跳转登录或渲染业务页面。
function ProtectedRoutes() {
  const status = useAuthStore((state) => state.status);
  const routes = useAuthStore((state) => state.routes);
  const location = useLocation();

  // routes 来自登录或会话恢复结果；权限路由变化时重新生成 React Router 路由对象。
  const routeObjects = useMemo(
    () => [
      {
        path: "/",
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <MainLayout />
          </Suspense>
        ),
        children: [
          // 访问根地址时进入默认首页。
          { index: true, element: <Navigate to="/home" replace /> },
          // 将后端路由描述转换成实际页面、嵌套路由和重定向。
          ...transformRoutes(routes),
          // 仅兜底受保护区域内无法匹配的地址。
          {
            path: "*",
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <NotFound />
              </Suspense>
            ),
          },
        ],
      },
    ],
    [routes],
  );

  // useRoutes 根据上面的动态路由对象和当前 URL 生成要渲染的路由元素。
  const element = useRoutes(routeObjects);

  // 应用启动时先恢复会话，避免过早跳到登录页造成闪烁。
  if (status === "booting") {
    return <LoadingScreen />;
  }

  if (status === "anonymous") {
    // 记录原访问地址，登录成功后可回到用户最初请求的页面。
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return element;
}

// 登录页自身也承担一道反向守卫：已登录用户不应再次停留在登录页。
function LoginRoute() {
  const status = useAuthStore((state) => state.status);
  const routes = useAuthStore((state) => state.routes);
  const location = useLocation();
  console.log("登录状态发生变化")

  if (status === "booting") {
    return <LoadingScreen />;
  }

  if (status === "authenticated") {
    const locationState = location.state as { from?: string } | null;
    const requestedPath = locationState?.from;
    const pathname = requestedPath?.split(/[?#]/)[0];
    // 原地址仍在当前权限路由树中才允许回跳，否则统一进入首页。
    const target =
      requestedPath && pathname && hasRoutePath(routes, pathname)
        ? requestedPath
        : "/home";

    return <Navigate to={target} replace />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginPage />
    </Suspense>
  );
}

// Hash 路由适合纯静态部署：真实 URL 的路由部分位于 # 后，不依赖服务器回退配置。
// 顶层只声明公开登录入口和受保护入口，具体业务页面在 ProtectedRoutes 内动态生成。
const router = createHashRouter([
  { path: "/login", element: <LoginRoute /> },
  { path: "/*", element: <ProtectedRoutes /> },
]);
console.log("router", router);

export default router;

// zustand中的用户登录状态变化以后，会动态的更新路由表
