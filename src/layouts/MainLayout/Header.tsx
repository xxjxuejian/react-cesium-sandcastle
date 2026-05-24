// 负责顶部栏。这里放移动端菜单按钮、主题切换按钮、语言切换按钮、用户信息入口等。

import { Button, Layout } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { LanguageSwitch } from "@/components/LanguageSwitch";
const { Header } = Layout;

type MainLayoutHeaderProps = {
  onMenuClick: () => void;
};

export function MainLayoutHeader({ onMenuClick }: MainLayoutHeaderProps) {
  return (
    <Header className="flex h-14 items-center justify-between bg-white px-4 shadow-sm">
      {/* 移动端用来展开侧边栏的按钮 */}
      <Button
        type="text"
        icon={<MenuOutlined />}
        className="lg:hidden"
        onClick={onMenuClick}
      />

      <div className="flex w-full items-center justify-center gap-2">
        {/* 后期放主题切换、语言切换、用户菜单 */}
        <LanguageSwitch />
      </div>
    </Header>
  );
}
