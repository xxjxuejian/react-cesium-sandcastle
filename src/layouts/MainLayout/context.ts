import { createContext } from "react";
import type { MainLayoutControls } from "./types";

/** 局部传递布局控制，避免中间父路由的 Outlet 重置上下文；不存放业务或 Viewer。 */
export const MainLayoutContext = createContext<MainLayoutControls | null>(null);
