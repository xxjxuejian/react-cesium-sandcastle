import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { MenuFoldOutlined, MenuUnfoldOutlined, MenuOutlined } from "@ant-design/icons";
import { Button, Drawer, Layout, Menu, theme } from "antd";

import { menuConfig } from "@/config/menuConfig";
import type { MenuProps } from "antd";

const { Header, Sider, Content, Footer } = Layout;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 检测窗口宽度，判断移动端
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width >= 768) {
        setDrawerVisible(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
    setDrawerVisible(false);
  };

  const menuContent = (
    <Menu
      theme="light"
      mode="inline"
      defaultSelectedKeys={[location.pathname]}
      items={menuConfig}
      onClick={onMenuClick}
    />
  );

  // 移动端：完全不渲染 Sider，只用 Drawer
  if (isMobile) {
    return (
      <Layout className="min-h-screen">
        <Layout>
          <Header style={{ padding: 0, background: colorBgContainer }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              style={{
                fontSize: "16px",
                width: 64,
                height: 64,
              }}
            />
          </Header>
          <Content
            style={{
              margin: "24px 16px",
              padding: 24,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </Content>

          <Footer style={{ textAlign: "center" }}>
            Ant Design ©{new Date().getFullYear()} Created by Ant UED
          </Footer>
        </Layout>

        <Drawer
          placement="left"
          closable
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={280}
          styles={{
            body: { padding: 0 },
          }}
        >
          <div className="demo-logo-vertical" />
          {menuContent}
        </Drawer>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen">
      {/* 桌面端侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={64}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          if (broken) {
            setCollapsed(true);
          } else {
            setCollapsed(false);
          }
        }}
        onCollapse={(collapsed, type) => {
          if (type === "clickTrigger") {
            setCollapsed(collapsed);
          }
        }}
        theme="light"
      >
        <div className="demo-logo-vertical" />
        {menuContent}
      </Sider>

      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <Button
            type="text"
            icon={
              isMobile ? (
                <MenuOutlined />
              ) : collapsed ? (
                <MenuUnfoldOutlined />
              ) : (
                <MenuFoldOutlined />
              )
            }
            onClick={() =>
              isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed)
            }
            style={{
              fontSize: "16px",
              width: 64,
              height: 64,
            }}
          />
        </Header>
        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>

        <Footer style={{ textAlign: "center" }}>
          Ant Design ©{new Date().getFullYear()} Created by Ant UED
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
