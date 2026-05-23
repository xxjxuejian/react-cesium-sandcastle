// src/router/menu.tsx
import { createElement } from "react";
import {
  DashboardOutlined,
  HomeOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

import type { BackendRouteItem } from "./types";

type MenuItem = Required<MenuProps>["items"][number];

const iconMap = {
  HomeOutlined,
  UserOutlined,
  DashboardOutlined,
  SettingOutlined,
};

// 拼接父级路径和当前路由路径，生成菜单项使用的完整路径。
// 例如 parentPath 为 /showcases、path 为 google-2d-tiles 时，结果是 /showcases/google-2d-tiles。
function joinPath(parentPath: string, path: string) {
  const normalizedParent = parentPath.endsWith("/")
    ? parentPath.slice(0, -1)
    : parentPath;

  return `${normalizedParent}/${path}`.replace(/\/+/g, "/");
}

// 根据后端路由配置生成 Ant Design Menu 需要的 items 数据。
// 只会生成 meta.showInMenu 为 true 的路由，并按 meta.order 从小到大排序。
export function createMenuItems(
  routes: BackendRouteItem[],
  parentPath = "",
): MenuItem[] {
  return routes
    .filter((route) => route.meta?.showInMenu)
    .sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
    .map((route) => {
      // 子路由的 path 是相对路径，需要和父级路径拼成可跳转的完整路径。
      const fullPath = joinPath(parentPath, route.path);

      // 根据 meta.icon 中的图标名称，从本地 iconMap 中取出对应的 React 组件。
      const iconName = route.meta?.icon;
      const Icon = iconName
        ? iconMap[iconName as keyof typeof iconMap]
        : undefined;

      // 递归处理子路由，让多级路由结构转换成多级菜单结构。
      const children = route.children
        ? createMenuItems(route.children, fullPath)
        : undefined;

      return {
        key: fullPath,
        icon: Icon ? createElement(Icon) : undefined,
        label: route.meta?.title,
        children: children?.length ? children : undefined,
      };
    });
}
