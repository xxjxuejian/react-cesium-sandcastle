import type { ReactNode } from "react";
import { Layout, theme } from "antd";

const { Content } = Layout;
const { useToken } = theme;

/** 常规管理页与地图工作区共用的内容容器属性。 */
type MainLayoutContentProps = {
  /** 需要渲染的路由页面。 */
  children: ReactNode;
  /** 地图工作区压缩外围留白；省略时保留常规管理页内边距。 */
  compact?: boolean;
};

export function MainLayoutContent({
  children,
  compact = false,
}: MainLayoutContentProps) {
  const { token } = useToken();

  return (
    <Content
      className={`min-h-0 flex-1 ${compact ? "p-2" : "p-4"}`}
      style={{ background: token.colorBgLayout }}
    >
      <div
        className={`min-h-full rounded-lg ${compact ? "p-0" : "p-4"}`}
        style={{ background: token.colorBgContainer }}
      >
        {children}
      </div>
    </Content>
  );
}
