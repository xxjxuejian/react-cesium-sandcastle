import type {
  AirlineFormValues,
  AirlineListItem,
  AirlineListResult,
  AirlineRecord,
} from "../../src/pages/system-management/airline-management/types.js";
import type { ApiResponse } from "../../src/types/api.js";
import { calculateAirlineLength } from "../../src/utils/airline.js";

/** URL 查询参数是字符串，与页面传入的数字分页参数分开描述。 */
interface AirlineMockRequest {
  url: string;
  body?: AirlineFormValues;
  query?: { name?: string; page?: string; pageSize?: string };
}

interface AirlineMockMethod {
  url: string;
  method: "get" | "post" | "put" | "delete";
  response: (request: AirlineMockRequest) => unknown;
}

// 使用固定样例，方便刷新后重复验证搜索和分页，不依赖随机数据。
// 12条航线，这里的经纬度作为第一个航点
const sampleRoutes = [
  { name: "滨江沿江巡检航线", longitude: 120.2102, latitude: 30.2074 },
  { name: "钱塘公园巡检航线", longitude: 120.3526, latitude: 30.3094 },
  { name: "西兴街道巡检航线", longitude: 120.2198, latitude: 30.1947 },
  { name: "江畔绿道巡检航线", longitude: 120.2036, latitude: 30.2018 },
  { name: "星光大道巡检航线", longitude: 120.2117, latitude: 30.1879 },
  { name: "浦沿街道巡检航线", longitude: 120.1742, latitude: 30.1615 },
  { name: "奥体中心巡检航线", longitude: 120.2296, latitude: 30.2291 },
  { name: "白马湖巡检航线", longitude: 120.2046, latitude: 30.1526 },
  { name: "湘湖周边巡检航线", longitude: 120.2218, latitude: 30.1346 },
  { name: "闻涛路巡检航线", longitude: 120.1921, latitude: 30.2092 },
  { name: "江南大道巡检航线", longitude: 120.1958, latitude: 30.1941 },
  { name: "高新园区巡检航线", longitude: 120.1835, latitude: 30.1812 },
];

// 12条航线
const initialAirlines: AirlineRecord[] = sampleRoutes.map((route, index) => {
  const waypoints = [
    {
      order: 1,
      longitude: route.longitude,
      latitude: route.latitude,
      altitude: 60,
    },
    {
      order: 2,
      longitude: route.longitude + 0.002,
      latitude: route.latitude + 0.001,
      altitude: 60,
    },
    {
      order: 3,
      longitude: route.longitude + 0.004,
      latitude: route.latitude + 0.0015,
      altitude: 60,
    },
    {
      order: 4,
      longitude: route.longitude + 0.005,
      latitude: route.latitude + 0.003,
      altitude: 60,
    },
    {
      order: 5,
      longitude: route.longitude + 0.007,
      latitude: route.latitude + 0.004,
      altitude: 60,
    },
  ];
  const time = `2026-10-${String(index + 1).padStart(2, "0")} 09:00:00`;

  return {
    id: `airline-${String(index + 1).padStart(3, "0")}`,
    name: route.name,
    waypointCount: waypoints.length,
    length: calculateAirlineLength(waypoints),
    speed: 5,
    remark: "用于航线管理演示，坐标不代表实际可飞行范围。",
    createdAt: time,
    updatedAt: time,
    waypoints,
  };
});

/** 只在当前 Mock 运行期间保存，服务重启或页面重新加载后恢复样例。 */
const airlines = structuredClone(initialAirlines);

/** 返回具体字段或航点的错误，新增和更新执行相同的保存规则。 */
function validateAirline(values?: AirlineFormValues): string {
  // TypeScript 约束调用方；这里仍需检查真实 HTTP 请求中的数据。
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return "请求体必须是航线对象";
  }
  if (typeof values.name !== "string" || !values.name.trim()) {
    return "航线名称不能为空";
  }
  if (
    typeof values.speed !== "number" ||
    !Number.isFinite(values.speed) ||
    values.speed <= 0
  ) {
    return "飞行速度必须是大于 0 的有限数值";
  }
  if (values.remark !== undefined && typeof values.remark !== "string") {
    return "备注必须是字符串";
  }
  if (!Array.isArray(values.waypoints) || values.waypoints.length < 2) {
    return "航线至少包含两个航点";
  }

  for (let index = 0; index < values.waypoints.length; index += 1) {
    const point = values.waypoints[index];
    const label = `第 ${index + 1} 个航点`;
    if (!point || typeof point !== "object" || Array.isArray(point)) {
      return `${label}必须是航点对象`;
    }
    if (
      typeof point.longitude !== "number" ||
      !Number.isFinite(point.longitude) ||
      point.longitude < -180 ||
      point.longitude > 180
    ) {
      return `${label}经度必须在 -180～180 度之间`;
    }
    if (
      typeof point.latitude !== "number" ||
      !Number.isFinite(point.latitude) ||
      point.latitude < -90 ||
      point.latitude > 90
    ) {
      return `${label}纬度必须在 -90～90 度之间`;
    }
    if (
      typeof point.altitude !== "number" ||
      !Number.isFinite(point.altitude) ||
      point.altitude < 0
    ) {
      return `${label}高度必须是大于等于 0 的有限数值`;
    }
    const previous = values.waypoints[index - 1];
    if (
      previous &&
      previous.longitude === point.longitude &&
      previous.latitude === point.latitude &&
      previous.altitude === point.altitude
    ) {
      return `${label}与前一个航点的位置和高度完全相同`;
    }
  }

  return "";
}

/** 明确指定北京时间，避免 Mock 所在机器的时区改变接口结果。 */
function getCurrentTime(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

/** 先去掉查询字符串，详情请求携带查询参数时也能正确找到编号。 */
function getPathId(url: string): string {
  return decodeURIComponent(url.split("?")[0].split("/").at(-1) ?? "");
}

/** 只挑选可编辑字段，避免请求中的编号、长度等覆盖系统结果。 */
function buildAirline(
  values: AirlineFormValues,
  id: string,
  createdAt: string,
  updatedAt: string,
): AirlineRecord {
  const waypoints = values.waypoints.map((point, index) => ({
    order: index + 1,
    longitude: point.longitude,
    latitude: point.latitude,
    altitude: point.altitude,
  }));

  return {
    id,
    name: values.name.trim(),
    speed: values.speed,
    remark: values.remark ?? "",
    waypoints,
    waypointCount: waypoints.length,
    length: calculateAirlineLength(waypoints),
    createdAt,
    updatedAt,
  };
}

export default [
  {
    // 生产 Mock 按 URL 正则匹配，详情必须先于列表注册，避免被列表路径提前匹配。
    url: "/api/system-management/airlines/:id",
    method: "get",
    response: ({ url }) => {
      const airline = airlines.find((item) => item.id === getPathId(url));
      if (!airline) {
        return { code: 40403, message: "航线不存在", data: null };
      }
      // 返回副本，页面编辑未保存的数据时不能直接改动 Mock 内存。
      return {
        code: 0,
        message: "查询航线详情成功",
        data: structuredClone(airline),
      } satisfies ApiResponse<AirlineRecord>;
    },
  },
  {
    url: "/api/system-management/airlines",
    method: "get",
    response: ({ query = {} }) => {
      const page = query.page === undefined ? 1 : Number(query.page);
      const pageSize =
        query.pageSize === undefined ? 10 : Number(query.pageSize);
      if (
        (query.page !== undefined && typeof query.page !== "string") ||
        !Number.isSafeInteger(page) ||
        page < 1
      ) {
        return { code: 40003, message: "页码必须是正整数", data: null };
      }
      if (
        (query.pageSize !== undefined && typeof query.pageSize !== "string") ||
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100
      ) {
        return {
          code: 40003,
          message: "每页数量必须是 1～100 的整数",
          data: null,
        };
      }
      if (query.name !== undefined && typeof query.name !== "string") {
        return {
          code: 40003,
          message: "航线名称查询参数必须是字符串",
          data: null,
        };
      }
      const keyword = (query.name ?? "").trim().toLowerCase();
      // filter 生成新数组，再排序不会改变内存中的原始排列。
      const filtered = airlines.filter((item) =>
        item.name.toLowerCase().includes(keyword),
      );
      filtered.sort(
        (a, b) =>
          b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
      );
      const start = (page - 1) * pageSize;
      const list: AirlineListItem[] = filtered
        .slice(start, start + pageSize)
        .map((item) => ({
          id: item.id,
          name: item.name,
          waypointCount: item.waypointCount,
          length: item.length,
          speed: item.speed,
          updatedAt: item.updatedAt,
        }));

      return {
        code: 0,
        message: "查询航线列表成功",
        data: { list, total: filtered.length },
      } satisfies ApiResponse<AirlineListResult>;
    },
  },
  {
    url: "/api/system-management/airlines",
    method: "post",
    response: ({ body }) => {
      const message = validateAirline(body);
      if (message || !body) {
        return { code: 40003, message, data: null };
      }
      const currentTime = getCurrentTime();
      const airline = buildAirline(
        body,
        crypto.randomUUID(),
        currentTime,
        currentTime,
      );
      airlines.unshift(airline);
      return {
        code: 0,
        message: "新增航线成功",
        data: structuredClone(airline),
      } satisfies ApiResponse<AirlineRecord>;
    },
  },
  {
    url: "/api/system-management/airlines/:id",
    method: "put",
    response: ({ body, url }) => {
      const index = airlines.findIndex((item) => item.id === getPathId(url));
      if (index < 0) {
        return { code: 40403, message: "航线不存在", data: null };
      }
      const message = validateAirline(body);
      if (message || !body) {
        return { code: 40003, message, data: null };
      }
      const previous = airlines[index];
      const airline = buildAirline(
        body,
        previous.id,
        previous.createdAt,
        getCurrentTime(),
      );
      airlines[index] = airline;
      return {
        code: 0,
        message: "更新航线成功",
        data: structuredClone(airline),
      } satisfies ApiResponse<AirlineRecord>;
    },
  },
  {
    url: "/api/system-management/airlines/:id",
    method: "delete",
    response: ({ url }) => {
      const index = airlines.findIndex((item) => item.id === getPathId(url));
      if (index < 0) {
        return { code: 40403, message: "航线不存在", data: null };
      }
      airlines.splice(index, 1);
      return {
        code: 0,
        message: "删除航线成功",
        data: true,
      } satisfies ApiResponse<boolean>;
    },
  },
] satisfies AirlineMockMethod[];
