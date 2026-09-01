/** 使用 CesiumMap 基础能力展示最小三维地球场景。 */
import { useMemo } from "react";
import { Cartesian3, Terrain } from "cesium";
import type { Viewer } from "cesium";

import { CesiumMap, useCesiumEffect } from "@/components/CesiumMap";

/** 配置 Hello World 页面专属的初始相机飞行动画。 */
function HelloWorldScene() {
  useCesiumEffect((viewer) => {
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(121.4737, 31.2304, 2_000_000),
    });

    return () => {
      viewer.camera.cancelFlight();
    };
  }, []);

  return null;
}

/** 渲染带 Cesium World Terrain 的 Hello World 示例页面。 */
export default function CesiumWidgetPage() {
  /** 当前页面首次创建 Viewer 时使用的 World Terrain 配置。 */
  const viewerOptions = useMemo<Viewer.ConstructorOptions>(
    () => ({
      terrain: Terrain.fromWorldTerrain(),
    }),
    [],
  );

  return (
    <section className="relative h-[calc(100vh-7.5rem)] min-h-[28rem] overflow-hidden rounded-md bg-[#06111f]">
      <CesiumMap className="h-full w-full" options={viewerOptions}>
        <HelloWorldScene />
      </CesiumMap>
    </section>
  );
}
