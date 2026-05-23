import React from "react";

import { Layout, Menu, theme } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router";
import { createMenuItems } from "@/router/menu";
import { mockRoutes } from "@/router/mockRoutes";
import type { MenuProps } from "antd";

const { Header, Content, Sider } = Layout;

const items = createMenuItems(mockRoutes);

const App: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const navigate = useNavigate();

  const onMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        onBreakpoint={(broken) => {
          console.log(broken);
        }}
        onCollapse={(collapsed, type) => {
          console.log(collapsed, type);
        }}
      >
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[location.pathname]}
          items={items}
          onClick={onMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: "24px 16px 0" }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
