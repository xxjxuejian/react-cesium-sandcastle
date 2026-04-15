import { createBrowserRouter } from "react-router";
import Layout from "@/layouts";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import User from "@/pages/user";
import NotFound from "@/pages/error/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />, // 使用骨架组件作为父级
    children: [
      {
        index: true, // 默认索引路由，即访问 / 时显示 Home
        element: <Home />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "settings",
        element: <div>系统设置页面 (内联组件测试)</div>,
      },
      {
        path: "user",
        element: <User />,
      },
      {
        path: "profile/:id", // 动态路由测试
        element: (
          <div>用户详情 ID: {window.location.pathname.split("/").pop()}</div>
        ),
      },
    ],
  },
  {
    path: "*", // 全局 404
    element: <NotFound />,
  },
]);
