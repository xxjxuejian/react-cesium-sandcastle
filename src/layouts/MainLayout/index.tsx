// 负责整体布局骨架、响应式状态、把 Header / Sidebar / Content / MobileDrawer 组合起来。

import { Layout } from "antd";
import { Outlet } from "react-router";
import { useState } from "react";

import { MainLayoutHeader } from "./Header";
import { MainLayoutSidebar } from "./Sidebar";
import { MainLayoutContent } from "./Content";
// import { MainLayoutMobileDrawer } from "./MobileDrawer";

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Layout className="min-h-screen">
      <MainLayoutSidebar />

      {/* <MainLayoutMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      /> */}

      <Layout>
        <MainLayoutHeader onMenuClick={() => setMobileOpen(true)} />

        <MainLayoutContent>
          <Outlet />
        </MainLayoutContent>
      </Layout>
    </Layout>
  );
}
