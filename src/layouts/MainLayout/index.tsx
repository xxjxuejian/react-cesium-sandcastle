// 负责整体布局骨架、响应式状态、把 Header / Sidebar / Content / MobileDrawer 组合起来。

import { Layout } from "antd";
import { Outlet } from "react-router";
import { useState } from "react";

import { MainLayoutHeader } from "./Header";
import { MainLayoutSidebar } from "./Sidebar";
import { MainLayoutContent } from "./Content";
import { MainLayoutMobileDrawer } from "./MobileDrawer";

export default function MainLayout() {
  // 移动端抽屉菜单的打开状态，由顶部菜单按钮和抽屉关闭事件共同控制。
  const [mobileOpen, setMobileOpen] = useState(false);

  // 桌面端侧边栏折叠状态，会同步传给侧边栏和顶部栏的折叠按钮。
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 使用函数式更新，确保连续点击时始终基于最新折叠状态取反。
  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((collapsed) => !collapsed);
  };

  return (
    <Layout className="min-h-screen">
      <MainLayoutSidebar collapsed={sidebarCollapsed} />

      <MainLayoutMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <Layout>
        <MainLayoutHeader
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={() => setMobileOpen(true)}
          onSidebarToggle={toggleSidebarCollapsed}
        />

        <MainLayoutContent>
          <Outlet />
        </MainLayoutContent>
      </Layout>
    </Layout>
  );
}
