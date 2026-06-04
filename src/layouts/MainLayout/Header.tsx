// 负责顶部栏。这里放移动端菜单按钮、主题切换按钮、语言切换按钮、用户信息入口等。

import { Button, Layout } from "antd";
import {
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { FullScreen } from "@/components/FullScreen";
const { Header } = Layout;

type MainLayoutHeaderProps = {
  onMenuClick: () => void;
  onSidebarToggle: () => void;
  sidebarCollapsed: boolean;
};

export function MainLayoutHeader({
  onMenuClick,
  onSidebarToggle,
  sidebarCollapsed,
}: MainLayoutHeaderProps) {
  return (
    <Header className="flex h-14 items-center justify-between bg-white px-4 shadow-sm">
      {/* 移动端用来展开侧边栏的按钮 */}
      <Button
        type="text"
        icon={<MenuOutlined />}
        className="lg:hidden"
        onClick={onMenuClick}
      />

      {/* 控制侧边栏展开与折叠的按钮 */}
      <div className="flex items-center gap-2">
        <Button
          type="text"
          icon={
            sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
          }
          className="hidden lg:inline-flex"
          onClick={onSidebarToggle}
        />
      </div>

      <div className="flex w-full items-center justify-center gap-2">
        {/* 后期放主题切换、语言切换、用户菜单 */}
        <LanguageSwitch />
        <FullScreen />
      </div>
    </Header>
  );
}
