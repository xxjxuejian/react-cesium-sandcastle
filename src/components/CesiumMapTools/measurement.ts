import { distance } from "@turf/distance";
import { area } from "@turf/area";
import { kinks } from "@turf/kinks";
import type {
  MeasurementError,
  MeasurementPosition,
  MeasurementType,
} from "./types";

/** 公共测量实体的编号前缀；页面拾取时跳过它们，继续寻找下面的业务对象。 */
export const MEASUREMENT_ENTITY_PREFIX = "map-tool-measurement-";

/** 累加相邻顶点的大圆距离，单位米，不包含高度差或首尾闭合边。 */
export function calculateDistance(positions: MeasurementPosition[]): number {
  let total = 0;
  for (let index = 1; index < positions.length; index += 1) {
    total += distance(positions[index - 1], positions[index], {
      units: "meters",
    });
  }
  return total;
}

/** 自动闭合经纬度环，使用球面算法计算平方米，不能直接把经纬度当平面坐标计算。 */
export function calculateArea(positions: MeasurementPosition[]): number {
  if (positions.length < 3) return 0;
  return area({ type: "Polygon", coordinates: [[...positions, positions[0]]] });
}

/** 完成前检查顶点和形状；本版面积工具只处理普通局部区域的简单多边形。 */
export function validateMeasurement(
  type: MeasurementType,
  positions: MeasurementPosition[],
): MeasurementError | null {
  if (positions.length < (type === "distance" ? 2 : 3)) return "tooFewPoints";
  if (
    positions.some(
      ([lon, lat]) =>
        !Number.isFinite(lon) ||
        !Number.isFinite(lat) ||
        Math.abs(lon) > 180 ||
        Math.abs(lat) > 90,
    )
  ) {
    return "invalidShape";
  }
  if (type === "distance")
    return calculateDistance(positions) > 0 ? null : "invalidShape";

  const longitudes = positions.map(([lon]) => lon);
  if (
    Math.max(...longitudes) - Math.min(...longitudes) > 180 ||
    positions.some(([, lat]) => Math.abs(lat) > 85)
  ) {
    return "unsupportedArea";
  }
  if (
    new Set(positions.map(([lon, lat]) => `${lon},${lat}`)).size !==
    positions.length
  )
    return "invalidShape";
  const polygon = {
    type: "Polygon" as const,
    coordinates: [[...positions, positions[0]]],
  };
  if (kinks(polygon).features.length > 0) return "selfIntersection";

  // 先用经纬度环检查退化形状。斜向共线点在球面公式中也可能得到非零值。
  // 以首点为局部原点，减少大经纬度相乘后的精度损失；1e-12 平方度作为零值容差。
  // 此平面值只用于校验，最终结果仍由下方 Turf 球面面积计算得到。
  const [originLon, originLat] = positions[0];
  let planarDoubleArea = 0;
  for (let index = 1; index < positions.length - 1; index += 1) {
    const [lon, lat] = positions[index];
    const [nextLon, nextLat] = positions[index + 1];
    planarDoubleArea +=
      (lon - originLon) * (nextLat - originLat) -
      (nextLon - originLon) * (lat - originLat);
  }
  if (Math.abs(planarDoubleArea) <= 1e-12) return "invalidShape";
  return calculateArea(positions) > 0.01 ? null : "invalidShape";
}

/** 场景标签与工具栏统一使用国际通用单位，保留两位小数；原始值不截断。 */
export function formatMeasurement(
  value: number,
  type: MeasurementType,
): string {
  if (type === "distance")
    return value >= 1000
      ? `${(value / 1000).toFixed(2)} km`
      : `${value.toFixed(2)} m`;
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(2)} km²`
    : `${value.toFixed(2)} m²`;
}
