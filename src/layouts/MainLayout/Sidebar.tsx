// 负责桌面端左侧菜单。这里放 AntD Sider、Menu、菜单点击跳转、当前路由选中态。
import { Layout, Menu } from "antd";
import { useLocation, useNavigate } from "react-router";
import { useMemo } from "react";
import type { MenuProps } from "antd";

import { createMenuItems } from "@/router/menu";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "react-i18next";

const { Sider } = Layout;

type MainLayoutSidebarProps = {
  collapsed: boolean;
};

export function MainLayoutSidebar({ collapsed }: MainLayoutSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const routes = useAuthStore((state) => state.routes);
  const menuItems = useMemo(() => createMenuItems(routes, t), [routes, t]);

  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
  };

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth={80}
      collapsed={collapsed}
      collapsible
      trigger={null}
      className="hidden lg:block"
    >
      <div className="flex h-14 items-center overflow-hidden px-4 text-white">
        <span
          className={[
            "whitespace-nowrap transition-opacity duration-200",
            collapsed ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          Cesium Sandcastle
        </span>
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        inlineCollapsed={collapsed}
        onClick={onMenuClick}
      />
    </Sider>
  );
}

// 注意这里建议用 selectedKeys，不要用 defaultSelectedKeys。
// defaultSelectedKeys 只在首次渲染生效，路由变化后菜单选中态可能不同步。
