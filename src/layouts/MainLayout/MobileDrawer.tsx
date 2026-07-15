// 负责移动端抽屉菜单。和 Sidebar 共用同一套路由菜单数据。

import { Drawer, Menu } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router";
import { useMemo } from "react";
import type { MenuProps } from "antd";

import { mockRoutes } from "@/router/mockRoutes";
import { createMenuItems } from "@/router/menu";
import { useTranslation } from "react-i18next";

const MOBILE_DRAWER_WIDTH = "min(80vw, 220px)";
const SIDEBAR_BACKGROUND = "#001529";

type MainLayoutMobileDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MainLayoutMobileDrawer({
  open,
  onClose,
}: MainLayoutMobileDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const menuItems = useMemo(() => createMenuItems(mockRoutes, t), [t]);

  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
    onClose();
  };

  return (
    <Drawer
      title={<span className="text-white">Cesium Sandcastle</span>}
      placement="left"
      open={open}
      onClose={onClose}
      size={MOBILE_DRAWER_WIDTH}
      closeIcon={<CloseOutlined className="text-white" />}
      className="lg:hidden"
      styles={{
        content: { background: SIDEBAR_BACKGROUND },
        header: {
          background: SIDEBAR_BACKGROUND,
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
        },
        body: {
          padding: 0,
          background: SIDEBAR_BACKGROUND,
        },
      }}
    >
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={onMenuClick}
        style={{ borderInlineEnd: 0 }}
      />
    </Drawer>
  );
}
