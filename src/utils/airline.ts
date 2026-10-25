import type { AirlineWaypoint } from "../pages/system-management/airline-management/types.js";

/**
 * 用 Haversine 算法累加相邻航点的水平大圆距离，单位为米。
 * Mock 保存和页面预览共用此算法；调用前应保证经纬度有效。
 * 只计算已有航段，不包含高度差，也不会自动连接终点和起点。
 */
export function calculateAirlineLength(waypoints: AirlineWaypoint[]): number {
  const earthRadius = 6371008.8;
  const degreesToRadians = Math.PI / 180;
  let length = 0;

  for (let index = 1; index < waypoints.length; index += 1) {
    const previous = waypoints[index - 1];
    const current = waypoints[index];
    const previousLatitude = previous.latitude * degreesToRadians;
    const currentLatitude = current.latitude * degreesToRadians;
    const latitudeDifference = currentLatitude - previousLatitude;
    const longitudeDifference =
      (current.longitude - previous.longitude) * degreesToRadians;
    const haversine =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(previousLatitude) *
        Math.cos(currentLatitude) *
        Math.sin(longitudeDifference / 2) ** 2;
    // 浮点计算可能略超出 [0, 1]，限制范围以免反三角函数产生 NaN。
    const centralAngle =
      2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
    length += earthRadius * centralAngle;
  }

  return length;
}
