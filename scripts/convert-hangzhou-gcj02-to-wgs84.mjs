import { readFileSync, writeFileSync } from "node:fs";
import { deriveHangzhouBoundaries } from "./hangzhou-boundaries.mjs";

const districtSource = new URL(
  "../public/geojson/rawData/hangzhou.geojson",
  import.meta.url,
);
const provinceSource = new URL(
  "../public/geojson/rawData/zhejiang.geojson",
  import.meta.url,
);
const destination = new URL(
  "../public/geojson/hangzhou.wgs84.geojson",
  import.meta.url,
);
const boundaryDestination = new URL(
  "../public/geojson/hangzhou.boundaries.wgs84.geojson",
  import.meta.url,
);

const PI = Math.PI;
const AXIS = 6378245.0;
const ECCENTRICITY_SQUARED = 0.006693421622965943;

function latitudeOffset(x, y) {
  let result =
    -100 +
    2 * x +
    3 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  result += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  result += ((20 * Math.sin(y * PI) + 40 * Math.sin((y * PI) / 3)) * 2) / 3;
  result +=
    ((160 * Math.sin((y * PI) / 12) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
  return result;
}

function longitudeOffset(x, y) {
  let result =
    300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  result += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  result += ((20 * Math.sin(x * PI) + 40 * Math.sin((x * PI) / 3)) * 2) / 3;
  result +=
    ((150 * Math.sin((x * PI) / 12) + 300 * Math.sin((x * PI) / 30)) * 2) / 3;
  return result;
}

function wgs84ToGcj02([longitude, latitude]) {
  const offsetLatitude = latitudeOffset(longitude - 105, latitude - 35);
  const offsetLongitude = longitudeOffset(longitude - 105, latitude - 35);
  const radians = (latitude / 180) * PI;
  const sine = Math.sin(radians);
  const magic = 1 - ECCENTRICITY_SQUARED * sine * sine;
  const latitudeDelta =
    (offsetLatitude * 180) /
    (((AXIS * (1 - ECCENTRICITY_SQUARED)) / (magic * Math.sqrt(magic))) * PI);
  const longitudeDelta =
    (offsetLongitude * 180) /
    ((AXIS / Math.sqrt(magic)) * Math.cos(radians) * PI);
  return [longitude + longitudeDelta, latitude + latitudeDelta];
}

function gcj02ToWgs84(position) {
  let [longitude, latitude] = position;
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const [forwardLongitude, forwardLatitude] = wgs84ToGcj02([
      longitude,
      latitude,
    ]);
    const longitudeError = forwardLongitude - position[0];
    const latitudeError = forwardLatitude - position[1];
    longitude -= longitudeError;
    latitude -= latitudeError;
    if (Math.max(Math.abs(longitudeError), Math.abs(latitudeError)) < 1e-10) {
      break;
    }
  }
  return [
    Number(longitude.toFixed(8)),
    Number(latitude.toFixed(8)),
    ...position.slice(2),
  ];
}

function convertCoordinates(coordinates) {
  if (typeof coordinates[0] === "number") {
    return gcj02ToWgs84(coordinates);
  }
  return coordinates.map(convertCoordinates);
}

/** 转换前校验原始坐标；缺失或损坏的数据不能悄悄进入项目产物。 */
function assertPosition(position, description) {
  if (
    !Array.isArray(position) ||
    position.length < 2 ||
    !Number.isFinite(position[0]) ||
    !Number.isFinite(position[1]) ||
    Math.abs(position[0]) > 180 ||
    Math.abs(position[1]) > 90
  ) {
    throw new Error(`${description} 不是有效的经纬度坐标`);
  }
}

/** 项目统一使用 MultiPolygon，保留原始几何的多面、内环和顶点顺序。 */
function normalizeGeometry(geometry, name) {
  if (geometry?.type !== "Polygon" && geometry?.type !== "MultiPolygon") {
    throw new Error(`${name} 的几何类型必须是 Polygon 或 MultiPolygon`);
  }

  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(polygons) || polygons.length === 0) {
    throw new Error(`${name} 缺少多边形坐标`);
  }

  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      throw new Error(`${name} 缺少多边形环线`);
    }
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) {
        throw new Error(`${name} 的环线至少需要四个坐标点`);
      }
      for (const position of ring) assertPosition(position, `${name} 的边界`);
      const first = ring[0];
      const last = ring.at(-1);
      if (first[0] !== last[0] || first[1] !== last[1]) {
        throw new Error(`${name} 的环线没有闭合`);
      }
    }
  }

  return { type: "MultiPolygon", coordinates: convertCoordinates(polygons) };
}

function readFeatures(source) {
  const original = JSON.parse(readFileSync(source, "utf8"));
  if (
    original.type !== "FeatureCollection" ||
    !Array.isArray(original.features)
  ) {
    throw new Error(`${source.pathname} 不是 FeatureCollection`);
  }
  return original.features;
}

const cityMatches = readFeatures(provinceSource).filter(
  (feature) => feature.properties?.adcode === 330100,
);
if (cityMatches.length !== 1) {
  throw new Error(
    `浙江原始数据中应恰有一个杭州市要素，实际为 ${cityMatches.length} 个`,
  );
}
const districtFeatures = readFeatures(districtSource);
if (districtFeatures.length !== 13) {
  throw new Error(
    `杭州原始数据中应有 13 个区县，实际为 ${districtFeatures.length} 个`,
  );
}

const adcodes = new Set();
const features = [...cityMatches, ...districtFeatures].map((feature) => {
  const properties = feature.properties;
  const { adcode, name, level } = properties ?? {};
  const parentAdcode =
    properties?.parentAdcode ?? properties?.parent?.adcode ?? null;
  const sourceLabelPoint = properties?.centroid ?? properties?.center;

  if (feature.type !== "Feature" || !Number.isSafeInteger(adcode)) {
    throw new Error("区县 Feature 缺少有效的行政编码");
  }
  if (adcodes.has(adcode)) {
    throw new Error(`行政编码重复：${adcode}`);
  }
  if (typeof name !== "string" || !name.trim()) {
    throw new Error(`${adcode} 缺少区县名称`);
  }
  if (level !== "city" && level !== "district") {
    throw new Error(`${name} 的行政层级无效：${level}`);
  }
  if (level === "city" && (adcode !== 330100 || parentAdcode !== 330000)) {
    throw new Error(`${name} 不是预期的杭州市要素`);
  }
  if (level === "district" && parentAdcode !== 330100) {
    throw new Error(`${name} 不属于杭州市`);
  }
  if (parentAdcode !== null && !Number.isSafeInteger(parentAdcode)) {
    throw new Error(`${name} 的上级行政编码无效`);
  }
  if (level === "district" && parentAdcode === null) {
    throw new Error(`${name} 缺少上级行政编码`);
  }
  assertPosition(sourceLabelPoint, `${name} 的标签位置`);
  adcodes.add(adcode);

  return {
    type: "Feature",
    id: `region-${adcode}`,
    properties: {
      adcode,
      name,
      level,
      parentAdcode,
      labelPoint: gcj02ToWgs84(sourceLabelPoint).slice(0, 2),
    },
    geometry: normalizeGeometry(feature.geometry, name),
  };
});

const geojson = { type: "FeatureCollection", features };
const boundaries = deriveHangzhouBoundaries(features);

writeFileSync(destination, `${JSON.stringify(geojson, null, 2)}\n`, "utf8");
writeFileSync(
  boundaryDestination,
  `${JSON.stringify(boundaries, null, 2)}\n`,
  "utf8",
);
console.log(
  `已转换 1 个市级要素和 ${districtFeatures.length} 个区县：${destination.pathname}`,
);
console.log(
  `已派生 1 条全市外缘和 ${boundaries.features.length - 1} 组内部区界：${boundaryDestination.pathname}`,
);
