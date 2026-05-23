// src/router/types.ts
import type { NonIndexRouteObject, RouteObject } from "react-router";

// 路由附加信息，用于菜单展示、排序、国际化标题等业务逻辑。
export type BackendRouteMeta = {
  // 页面标题，通常作为菜单名称或浏览器标题的兜底文案。
  title: string;

  // 国际化文案 key，存在时可优先用它去读取多语言标题。
  titleKey?: string;

  // 菜单图标名称，例如对应 Ant Design Icons 的某个图标。
  icon?: string;

  // 是否展示在侧边菜单中；不影响路由本身是否可访问。
  showInMenu?: boolean;

  // 菜单或路由排序值，数值越小越靠前。
  order?: number;
};

// 后端返回或本地 mock 的原始路由结构。
// transformRoutes 会把它转换成 React Router 可识别的路由对象。
export type BackendRouteItem = {
  // 路由路径片段。作为子路由时不要以 / 开头，例如 home、getting-started。
  path: string;

  // 路由名称，主要用于标识和调试。
  name: string;

  // 页面组件路径，对应 src/pages/${component}/index.tsx。
  component?: string;

  // 重定向目标，例如 /getting-started/hello-world。
  redirect?: string;

  // 菜单、标题、排序等业务元信息。
  meta?: BackendRouteMeta;

  // 子路由，支持递归嵌套路由。
  children?: BackendRouteItem[];
};

// 应用内部使用的路由对象。
// 这里基于 NonIndexRouteObject，而不是 RouteObject：
// RouteObject 是 IndexRouteObject | NonIndexRouteObject 的联合类型，
// 其中 index 路由不能有 children；动态菜单路由本身都是普通路由，所以用 NonIndexRouteObject 更准确。
export type AppRouteObject = Omit<NonIndexRouteObject, "children"> & {
  // 子路由允许包含普通路由，也允许包含 index 重定向路由。
  children?: RouteObject[];

  // 保留业务元信息，方便菜单、面包屑、权限等功能复用。
  meta?: BackendRouteMeta;
};
