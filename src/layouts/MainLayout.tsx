// src/layouts/MainLayout.tsx
import { NavLink, Outlet } from "react-router";

const MainLayout = () => {
  return (
    <div className="layout-container">
      {/* 左侧侧边栏 */}
      <aside className="sidebar">
        <div className="sidebar-logo">Admin Panel</div>
        <nav className="nav-menu">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            end
          >
            首页
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            仪表盘
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            系统设置
          </NavLink>
          <NavLink
            to="/profile/123"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            个人中心
          </NavLink>
        </nav>
      </aside>

      {/* 右侧主内容区域 */}
      <main className="main-content">
        {/* Outlet 是子路由页面的占位符 */}
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
