import type { ReactNode } from "react";
import { Layout, theme } from "antd";

const { Content } = Layout;
const { useToken } = theme;

type MainLayoutContentProps = {
  children: ReactNode;
};

export function MainLayoutContent({ children }: MainLayoutContentProps) {
  const { token } = useToken();

  return (
    <Content
      className="min-h-0 flex-1 p-4"
      style={{ background: token.colorBgLayout }}
    >
      <div
        className="min-h-full rounded-lg p-4"
        style={{ background: token.colorBgContainer }}
      >
        {children}
      </div>
    </Content>
  );
}
