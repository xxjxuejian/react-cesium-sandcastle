import React, { lazy, Suspense } from "react";

import { createBrowserRouter, Navigate } from "react-router";
import type { RouteObject } from "react-router";

import type { MenuItem } from "@/config/menuConfig";
import { menuConfig } from "@/config/menuConfig";
const NotFound = lazy(() => import("@/pages/error/NotFound"));
const MainLayout = lazy(() => import("@/layouts"));

/**
 * 1. 使用 Vite 的 glob 导入所有页面组件
 * 这会生成一个对象，键是文件路径，值是一个返回 import() 的函数
 * 匹配 src/pages 下的所有 .tsx 文件
 */
const modules = import.meta.glob("../pages/**/*.tsx");

// 辅助函数：根据字符串路径动态转换为组件
const lazyLoad = (componentPath: string) => {
  // 尝试匹配多种可能的路径格式
  // 这里统一约定 componentPath 对应的组件为 src/pages/${componentPath}/index.tsx
  // 如果找不到，则返回一个错误组件
  const fullPath = `../pages/${componentPath}.tsx`;
  const indexPath = `../pages/${componentPath}/index.tsx`;

  const importFn = modules[fullPath] || modules[indexPath];

  if (!importFn) {
    console.error(`未找到组件文件: ${fullPath} 或 ${indexPath}`);
    return <NotFound />;
  }

  // 使用 React.lazy 动态加载
  const Component = lazy(
    importFn as () => Promise<{ default: React.ComponentType }>,
  );

  return (
    <Suspense fallback={<div className="p-4">加载中...</div>}>
      <Component />
    </Suspense>
  );
};

/**
 * 2. 递归生成路由表
 */
const generateRoutes = (items: MenuItem[]): RouteObject[] => {
  const routes: RouteObject[] = [];

  items.forEach((item) => {
    // A. 处理重定向：如果有 redirect 属性，注册一个重定向路由
    // 注意：重定向路由应该放在普通页面路由之前，以确保正确匹配
    // 重定向路由的写法：path对应菜单项的key，element是一个Navigate组件，to属性指向redirect的值
    if (item.redirect) {
      routes.push({
        path: item.key as string,
        element: <Navigate to={item.redirect} replace />,
      });
    }
    // B. 处理普通页面：如果有 component，注册该路由
    if (item.component) {
      routes.push({
        path: item.key as string,
        element: lazyLoad(item.component),
      });
    }
    // C. 递归子级
    if (item.children) {
      routes.push(...generateRoutes(item.children));
    }
  });

  return routes;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      // 访问 / 时重定向到 /home
      { index: true, element: <Navigate to="/home" replace /> },
      ...generateRoutes(menuConfig),
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
