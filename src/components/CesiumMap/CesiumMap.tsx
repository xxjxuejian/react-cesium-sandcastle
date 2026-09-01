/** 实现 Cesium Viewer 的 React 宿主、生命周期和基础状态展示。 */
import { useEffect, useRef, useState } from "react";
import { Alert, Spin } from "antd";
import { Viewer } from "cesium";

import { CesiumContext } from "./context";
import { DEFAULT_VIEWER_OPTIONS } from "./defaults";
import type { CesiumMapProps } from "./types";

/** 未提供 loadingFallback 时显示的默认加载状态。 */
const DEFAULT_LOADING_FALLBACK = (
  <div className="absolute inset-0 z-10 flex items-center justify-center">
    <Spin size="large" />
  </div>
);

/**
 * 将未知异常统一转换为 Error。
 *
 * @param error Cesium 抛出的未知异常。
 * @returns 可供组件回调和界面展示的 Error。
 */
function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  return new Error("未知的 Cesium 场景错误");
}

/**
 * 渲染项目默认的 Cesium 错误提示。
 *
 * @param error 需要展示的场景错误。
 * @returns 默认错误提示节点。
 */
function renderDefaultError(error: Error) {
  return (
    <div className="absolute left-4 top-4 z-20 max-w-xl">
      <Alert
        showIcon
        type="error"
        title="Cesium 场景运行失败"
        description={error.message}
      />
    </div>
  );
}

/**
 * 根据组件配置渲染自定义或默认错误内容。
 *
 * @param error 当前场景错误。
 * @param fallback 调用方提供的错误内容或渲染函数。
 * @returns 最终显示的错误节点。
 */
function renderErrorFallback(
  error: Error,
  fallback: CesiumMapProps["errorFallback"],
) {
  if (typeof fallback === "function") {
    return fallback(error);
  }

  return fallback === undefined ? renderDefaultError(error) : fallback;
}

/**
 * 创建并托管一个 Cesium Viewer，同时向后代提供已就绪的实例。
 *
 * @param props Viewer 构造配置、状态插槽和生命周期回调。
 * @returns Cesium 地图宿主组件。
 */
export function CesiumMap({
  children,
  className,
  style,
  options,
  onReady,
  onError,
  loadingFallback,
  errorFallback,
}: CesiumMapProps) {
  /** Cesium Viewer 实际挂载的 DOM 容器。 */
  const containerRef = useRef<HTMLDivElement>(null);
  /** 固定首次传入的构造配置，避免普通渲染意外重建 Viewer。 */
  const initialOptionsRef = useRef(options);
  /** 保存最新的 Viewer 就绪回调。 */
  const onReadyRef = useRef(onReady);
  /** 保存最新的 Viewer 错误回调。 */
  const onErrorRef = useRef(onError);
  /** 已创建并允许业务 children 使用的 Viewer。 */
  const [viewer, setViewer] = useState<Viewer | null>(null);
  /** Viewer 构造或场景渲染产生的基础错误。 */
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    /** 当前组件对应的 Cesium 挂载节点。 */
    const container = containerRef.current;

    if (!container) {
      return;
    }

    /** 标记当前生命周期是否仍允许提交异步状态。 */
    let isActive = true;
    /** 当前 Effect 创建并负责销毁的 Viewer。 */
    let currentViewer: Viewer | null = null;
    /** 移除 scene.renderError 监听器的函数。 */
    let removeRenderErrorListener: (() => void) | undefined;
    /** 监听地图容器尺寸变化的观察器。 */
    let resizeObserver: ResizeObserver | undefined;

    /** 将基础错误写入状态并通知最新的 onError 回调。 */
    const reportError = (reason: unknown) => {
      const nextError = normalizeError(reason);

      if (isActive) {
        setError(nextError);
        onErrorRef.current?.(nextError);
      }
    };

    try {
      currentViewer = new Viewer(container, {
        ...DEFAULT_VIEWER_OPTIONS,
        ...initialOptionsRef.current,
      });

      removeRenderErrorListener =
        currentViewer.scene.renderError.addEventListener((_scene, reason) => {
          reportError(reason);
        });

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          if (currentViewer && !currentViewer.isDestroyed()) {
            currentViewer.resize();
            currentViewer.scene.requestRender();
          }
        });
        resizeObserver.observe(container);
      }

      /** 已完成同步构造、等待提交给 React 子树的 Viewer。 */
      const readyViewer = currentViewer;

      queueMicrotask(() => {
        if (isActive && !readyViewer.isDestroyed()) {
          setViewer(readyViewer);
          onReadyRef.current?.(readyViewer);
        }
      });
    } catch (reason) {
      queueMicrotask(() => {
        reportError(reason);
      });
    }

    return () => {
      isActive = false;
      resizeObserver?.disconnect();
      removeRenderErrorListener?.();

      if (currentViewer && !currentViewer.isDestroyed()) {
        currentViewer.destroy();
      }
    };
  }, []);

  /** 合并基础布局样式与调用方提供的容器类名。 */
  const rootClassName = [
    "relative h-full w-full overflow-hidden bg-[#06111f]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} style={style}>
      <div
        ref={containerRef}
        className="absolute inset-0"
        aria-label="Cesium 三维地图"
      />

      {viewer && !error ? (
        <CesiumContext.Provider value={viewer}>
          {children}
        </CesiumContext.Provider>
      ) : null}

      {!viewer && !error
        ? loadingFallback === undefined
          ? DEFAULT_LOADING_FALLBACK
          : loadingFallback
        : null}

      {error ? renderErrorFallback(error, errorFallback) : null}
    </div>
  );
}
