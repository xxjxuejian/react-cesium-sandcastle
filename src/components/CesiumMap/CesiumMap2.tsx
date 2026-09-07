import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Viewer } from "cesium";

import { CesiumContext } from "./context";
import { DEFAULT_VIEWER_OPTIONS } from "./defaults";

type CesiumMap2Props = {
  children?: ReactNode;
  className?: string;
  options?: Viewer.ConstructorOptions;
};

/** 一个只负责创建和销毁 Cesium Viewer 的简单地图组件。 */
export function CesiumMap2({
  children,
  className = "",
  options,
}: CesiumMap2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cesiumViewer = new Viewer(containerRef.current, {
      ...DEFAULT_VIEWER_OPTIONS,
      ...options,
    });

    setViewer(cesiumViewer);

    return () => {
      cesiumViewer.destroy();
    };
  }, [options]);

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />

      {viewer ? (
        <CesiumContext.Provider value={viewer}>
          {children}
        </CesiumContext.Provider>
      ) : null}
    </div>
  );
}
