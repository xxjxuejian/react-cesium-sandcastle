import {
  UserOutlined,
  DashboardOutlined,
  SettingOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd"; // 引入 AntD 的 MenuProps

//在菜单里加一些额外的字段（比如 role: 'admin'），而 AntD 的类型不识别这些字段，使用类型交叉（Intersection Types）
// 1. 先定义你自己的扩展字段
type CustomMenuItem = {
  component?: string; // 例如 'dashboard'
  children?: MenuItem[];
};

// 使用 AntD 导出的类型定义单个菜单项
// GetProp 是 AntD 5.x 推荐的获取子属性类型的方法
export type MenuItem = Required<MenuProps>["items"][number] & CustomMenuItem;

export const menuConfig: MenuItem[] = [
  {
    key: "/",
    icon: <HomeOutlined />,
    label: "首页",
    component: "home", // 对应 src/pages/dashboard.tsx 或 dashboard/index.tsx
  },
  {
    key: "/user",
    icon: <UserOutlined />,
    label: "用户管理",
    component: "user",
  },
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: "仪表盘",
    component: "dashboard",
  },
  {
    key: "/settings",
    icon: <SettingOutlined />,
    label: "系统设置",
    component: "settings",
  },
];
