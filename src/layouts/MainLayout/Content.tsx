// 负责页面内容区域。这里放统一 padding、背景色、滚动区域、内容容器。
import type { ReactNode } from "react";
import { Layout } from "antd";

const { Content } = Layout;

type MainLayoutContentProps = {
  children: ReactNode;
};

export function MainLayoutContent({ children }: MainLayoutContentProps) {
  return (
    <Content className="min-h-0 flex-1 bg-slate-50 p-4">
      <div className="min-h-full rounded-lg bg-red-100 p-4">{children}</div>
    </Content>
  );
}
