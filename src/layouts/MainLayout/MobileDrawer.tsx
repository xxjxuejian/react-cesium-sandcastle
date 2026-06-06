// 负责移动端抽屉菜单。和 Sidebar 共用同一套路由菜单数据。

import { Drawer, Menu } from "antd";
import { useLocation, useNavigate } from "react-router";
import type { MenuProps } from "antd";

import { mockRoutes } from "@/router/mockRoutes";
import { createMenuItems } from "@/router/menu";
import { useTranslation } from "react-i18next";

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

  const menuItems = createMenuItems(mockRoutes, t);

  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
    onClose();
  };

  return (
    <Drawer
      title="Cesium Sandcastle"
      placement="left"
      open={open}
      onClose={onClose}
      size={280}
      className="lg:hidden"
    >
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={onMenuClick}
      />
    </Drawer>
  );
}
