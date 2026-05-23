import { lazy, Suspense } from "react";
import { Navigate, Outlet } from "react-router";

import { pageModules } from "./routeModules";
import type { AppRouteObject, BackendRouteItem } from "./types";
import type { PageModule } from "./routeModules";

const NotFound = lazy(() => import("@/pages/error/NotFound"));
function getPageImport(component?: string) {
  if (!component) return null;

  const modulePath = `../pages/${component}/index.tsx`;

  return pageModules[modulePath];
}

function lazyLoad(component?: string) {
  const importFn = getPageImport(component);

  if (!importFn) {
    return <NotFound />;
  }

  const Component = lazy(importFn as () => Promise<PageModule>);

  return (
    <Suspense fallback={<div className="p-4">加载中...</div>}>
      <Component />
    </Suspense>
  );
}

// 有 children 的父路由，element 里必须能渲染 <Outlet />。
// Navigate 不能直接作为父路由 element，否则子路由没地方显示。
export function transformRoutes(routes: BackendRouteItem[]): AppRouteObject[] {
  return routes
    .slice()
    .sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
    .map((route) => {
      const appRoute: AppRouteObject = {
        path: route.path,
        meta: route.meta,
      };

      // 1. 先处理 children
      if (route.children?.length) {
        appRoute.children = transformRoutes(route.children);
      }

      // 2. 再处理 element
      if (route.component) {
        // 有页面组件
        appRoute.element = lazyLoad(route.component);
      } else if (route.children?.length) {
        // 没组件但有子路由
        appRoute.element = <Outlet />;
      }

      // 3. 最后处理 redirect
      if (route.redirect) {
        appRoute.children = [
          {
            index: true,
            element: <Navigate to={route.redirect} replace />,
          },
          ...(appRoute.children ?? []),
        ];
      }

      return appRoute;
    });
}
