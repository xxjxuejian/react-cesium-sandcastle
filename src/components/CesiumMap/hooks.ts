/** 提供 CesiumMap Viewer 的安全访问与场景副作用管理 Hooks。 */
import { useContext, useLayoutEffect, useRef } from "react";
import type { DependencyList } from "react";

import { CesiumContext } from "./context";
import type { CesiumEffect } from "./types";

/**
 * 获取当前 CesiumMap 已就绪的 Viewer。
 *
 * @returns 当前组件树中最近的 Viewer。
 * @throws 在 CesiumMap 外部或 Viewer 未就绪时抛出错误。
 */
export function useCesium() {
  /** 当前 CesiumMap Context 提供的 Viewer。 */
  const viewer = useContext(CesiumContext);

  if (!viewer) {
    throw new Error("useCesium must be used within a ready CesiumMap.");
  }

  return viewer;
}

/**
 * 注册依赖 Viewer 的同步场景副作用，并在更新或卸载时执行清理。
 *
 * @param setup 创建 Cesium 资源并可返回清理函数的回调。
 * @param dependencies 控制副作用重新执行的依赖列表。
 */
export function useCesiumEffect(
  setup: CesiumEffect,
  dependencies: DependencyList,
) {
  /** 当前副作用绑定的 Viewer。 */
  const viewer = useCesium();
  /** 保存最新 setup，避免函数引用变化单独触发场景重建。 */
  const setupRef = useRef(setup);

  useLayoutEffect(() => {
    setupRef.current = setup;
  }, [setup]);

  useLayoutEffect(
    () => setupRef.current(viewer),
    /** 调用方依赖列表有意遵循 useEffect 的依赖语义。 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewer, ...dependencies],
  );
}
