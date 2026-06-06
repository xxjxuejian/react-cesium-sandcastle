// 负责整体布局骨架、响应式状态、把 Header / Sidebar / Content / MobileDrawer 组合起来。

import { Layout } from "antd";
import { Outlet } from "react-router";
import { useState } from "react";

import { MainLayoutHeader } from "./Header/Header";
import { MainLayoutSidebar } from "./Sidebar";
import { MainLayoutContent } from "./Content";
import { MainLayoutMobileDrawer } from "./MobileDrawer";

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
