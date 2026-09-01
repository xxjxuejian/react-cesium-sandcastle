/** 声明 CesiumMap 公开 API 使用的 TypeScript 类型。 */
import type { CSSProperties, ReactNode } from "react";
import type { Viewer } from "cesium";

/** 描述一个可在 Viewer 销毁前执行清理的 Cesium 场景副作用。 */
export type CesiumEffect = (viewer: Viewer) => void | (() => void);

/** CesiumMap 组件支持的构造配置、状态插槽和生命周期回调。 */
export type CesiumMapProps = {
  /** Viewer 就绪后渲染的业务场景或覆盖层。 */
  children?: ReactNode;
  /** 应用到地图根容器的类名。 */
  className?: string;
  /** 应用到地图根容器的内联样式。 */
  style?: CSSProperties;
  /** 仅在 Viewer 创建时读取的构造配置。 */
  options?: Viewer.ConstructorOptions;
  /** Viewer 成功创建后的回调。 */
  onReady?: (viewer: Viewer) => void;
  /** Viewer 构造或渲染失败后的回调。 */
  onError?: (error: Error) => void;
  /** Viewer 初始化期间显示的内容。 */
  loadingFallback?: ReactNode;
  /** Viewer 失败时显示的内容或渲染函数。 */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
};
