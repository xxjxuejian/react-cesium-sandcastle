import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "@/app/App";
import { useAuthStore } from "@/store/auth";

// 按启动顺序完成运行环境初始化、登录状态恢复和 React 应用挂载。
async function bootstrap() {
  // 生产环境启用 Mock 时，先注册 Mock 服务，确保后续会话请求能够被拦截。
  if (import.meta.env.PROD && import.meta.env.VITE_USE_MOCK === "true") {
    const { setupProdMockServer } = await import("./mockProdServer");
    await setupProdMockServer();
  }

  /* 
  restoreSession() 没有被 await，所以会话请求和 React 首次渲染同时进行。
  此时 store 初始状态是 booting，路由会先显示加载页。
  接口完成后，Zustand 更新状态，订阅 store 的路由组件自动重新渲染。
  这样既不会阻塞 React 挂载，也不会闪现登录页或主布局。
  */

  // 启动会话恢复但不阻塞 React 挂载，恢复期间由路由入口展示加载状态。
  void useAuthStore.getState().restoreSession();

  // 将根组件挂载到 index.html 的 root 节点，并在开发环境启用严格模式检查。
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
