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
  redirect?: string; // 可选的重定向路径
};

// 使用 AntD 导出的类型定义单个菜单项
// GetProp 是 AntD 5.x 推荐的获取子属性类型的方法
export type MenuItem = Required<MenuProps>["items"][number] & CustomMenuItem;

export const menuConfig: MenuItem[] = [
  {
    key: "/home",
    icon: <HomeOutlined />,
    label: "home",
    component: "home", // 对应 src/pages/dashboard.tsx 或 dashboard/index.tsx
  },
  {
    key: "/getting-started",
    icon: <UserOutlined />,
    label: "getting-started",
    redirect: "/getting-started/hello-world", // 访问 /getting-started 时自动重定向到第一个子菜单
    children: [
      {
        key: "/getting-started/hello-world",
        label: "hello-world",
        component: "getting-started/hello-world",
      },
      {
        key: "/getting-started/resolution-scale",
        label: "resolution-scale",
        component: "getting-started/resolution-scale",
      },
    ],
  },
  {
    key: "/showcases",
    icon: <DashboardOutlined />,
    label: "showcases",
    redirect: "/showcases/google-2d-tiles",
    children: [
      {
        key: "/showcases/google-2d-tiles",
        label: "google-2d-tiles",
        component: "showcases/google-2d-tiles",
      },
    ],
  },
  {
    key: "/animation",
    icon: <SettingOutlined />,
    label: "animation",
    redirect: "/animation/clock",
    children: [
      {
        key: "/animation/clock",
        label: "clock",
        component: "animation/clock",
      },
    ],
  },
];
