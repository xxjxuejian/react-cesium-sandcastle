/** 定义 CesiumMap 实例在 React 组件树中的传递上下文。 */
import { createContext } from "react";
import type { Viewer } from "cesium";

/** 保存当前 CesiumMap 创建的 Viewer，未就绪时为 null。 */
export const CesiumContext = createContext<Viewer | null>(null);
