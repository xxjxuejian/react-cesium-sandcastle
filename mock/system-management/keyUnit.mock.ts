import type {
  KeyUnitFormValues,
  KeyUnitListItem,
  KeyUnitListResult,
  KeyUnitRecord,
} from "../../src/pages/system-management/key-unit-management/types.js";
import type { ApiResponse } from "../../src/types/api.js";
import { validateKeyUnit } from "../../src/utils/keyUnit.js";

/** Mock 接收的原始请求，不信任请求体中的结构。 */
interface KeyUnitMockRequest {
  /** 包含单位编号的请求地址。 */
  url: string;
  /** 新增和更新的原始请求体，省略时校验失败。 */
  body?: unknown;
  /** HTTP 查询参数；未提供时使用默认分页。 */
  query?: { name?: string; page?: string; pageSize?: string };
}

/** 供开发与生产 Mock 注册的路由。 */
interface KeyUnitMockMethod {
  /** 接口地址，包含 /api 前缀。 */
  url: string;
  /** HTTP 请求方法。 */
  method: "get" | "post" | "put" | "delete";
  /** 返回项目统一业务响应。 */
  response: (request: KeyUnitMockRequest) => unknown;
}

// 固定演示数据用于分页和反复验证，不表示真实重点单位或布防标准。
const names = [
  "市政府",
  "政务服务中心",
  "应急指挥中心",
  "城市运行中心",
  "交通调度中心",
  "供水调度中心",
  "电力调度中心",
  "会展中心",
  "通信保障中心",
  "公共服务中心",
  "行政服务中心",
  "档案中心",
];
const units: KeyUnitRecord[] = names.map((name, index) => ({
  id: `key-unit-${String(index + 1).padStart(3, "0")}`,
  name: `${name}（演示）`,
  longitude: 120.2 + (index % 4) * 0.015,
  latitude: 30.24 + Math.floor(index / 4) * 0.012,
  address: `杭州示例片区 ${index + 1}`,
  remark: "仅用于页面演示，范围不代表实际布防配置。",
  rings: {
    core: { radius: 300, minHeight: 0, maxHeight: 120 },
    counter: { radius: 800, minHeight: 0, maxHeight: 200 },
    warning: { radius: 1500, minHeight: 0, maxHeight: 300 },
  },
  createdAt: `2026-10-${String(index + 1).padStart(2, "0")} 09:00:00`,
  updatedAt: `2026-10-${String(index + 1).padStart(2, "0")} 09:00:00`,
}));

/** 只挑选允许修改的字段，避免请求覆盖系统编号或时间。 */
function buildUnit(
  values: KeyUnitFormValues,
  id: string,
  createdAt: string,
): KeyUnitRecord {
  const rings = values.rings;
  return {
    id,
    createdAt,
    updatedAt: new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
    name: values.name.trim(),
    longitude: values.longitude,
    latitude: values.latitude,
    address: values.address.trim(),
    remark: values.remark.trim(),
    rings: {
      core: {
        radius: rings.core.radius,
        minHeight: rings.core.minHeight,
        maxHeight: rings.core.maxHeight,
      },
      counter: {
        radius: rings.counter.radius,
        minHeight: rings.counter.minHeight,
        maxHeight: rings.counter.maxHeight,
      },
      warning: {
        radius: rings.warning.radius,
        minHeight: rings.warning.minHeight,
        maxHeight: rings.warning.maxHeight,
      },
    },
  };
}

/** 去掉查询字符串后读取编号。 */
function pathId(url: string): string {
  return decodeURIComponent(url.split("?")[0].split("/").at(-1) ?? "");
}

const base = "/api/system-management/key-units";
export default [
  {
    // 详情优先，避免生产 Mock 的地址正则先匹配到列表。
    url: `${base}/:id`,
    method: "get",
    response: ({ url }) => {
      const unit = units.find((item) => item.id === pathId(url));
      if (!unit) return { code: 40404, message: "重点单位不存在", data: null };
      return {
        code: 0,
        message: "查询重点单位详情成功",
        data: structuredClone(unit),
      } satisfies ApiResponse<KeyUnitRecord>;
    },
  },
  {
    url: base,
    method: "get",
    response: ({ query = {} }) => {
      const page = query.page === undefined ? 1 : Number(query.page);
      const pageSize =
        query.pageSize === undefined ? 10 : Number(query.pageSize);
      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        (query.page !== undefined && typeof query.page !== "string")
      )
        return { code: 40004, message: "页码必须是正整数", data: null };
      if (
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100 ||
        (query.pageSize !== undefined && typeof query.pageSize !== "string")
      )
        return {
          code: 40004,
          message: "每页数量必须是 1～100 的整数",
          data: null,
        };
      if (query.name !== undefined && typeof query.name !== "string")
        return { code: 40004, message: "名称查询参数必须是字符串", data: null };
      const keyword = (query.name ?? "").trim().toLowerCase();
      const filtered = units.filter((item) =>
        item.name.toLowerCase().includes(keyword),
      );
      filtered.sort(
        (a, b) =>
          b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
      );
      const list: KeyUnitListItem[] = filtered
        .slice((page - 1) * pageSize, page * pageSize)
        .map((item) => ({
          id: item.id,
          name: item.name,
          longitude: item.longitude,
          latitude: item.latitude,
          address: item.address,
          rings: structuredClone(item.rings),
          updatedAt: item.updatedAt,
        }));
      return {
        code: 0,
        message: "查询重点单位列表成功",
        data: { list, total: filtered.length },
      } satisfies ApiResponse<KeyUnitListResult>;
    },
  },
  {
    url: base,
    method: "post",
    response: ({ body }) => {
      const error = validateKeyUnit(body);
      if (error) return { code: 40004, message: error, data: null };
      // 校验通过后，原始请求才可以按表单类型读取。
      const unit = buildUnit(
        body as KeyUnitFormValues,
        crypto.randomUUID(),
        "",
      );
      unit.createdAt = unit.updatedAt;
      units.unshift(unit);
      return {
        code: 0,
        message: "新增重点单位成功",
        data: structuredClone(unit),
      } satisfies ApiResponse<KeyUnitRecord>;
    },
  },
  {
    url: `${base}/:id`,
    method: "put",
    response: ({ url, body }) => {
      const index = units.findIndex((item) => item.id === pathId(url));
      if (index < 0)
        return { code: 40404, message: "重点单位不存在", data: null };
      const error = validateKeyUnit(body);
      if (error) return { code: 40004, message: error, data: null };
      const previous = units[index];
      units[index] = buildUnit(
        body as KeyUnitFormValues,
        previous.id,
        previous.createdAt,
      );
      return {
        code: 0,
        message: "更新重点单位成功",
        data: structuredClone(units[index]),
      } satisfies ApiResponse<KeyUnitRecord>;
    },
  },
  {
    url: `${base}/:id`,
    method: "delete",
    response: ({ url }) => {
      const index = units.findIndex((item) => item.id === pathId(url));
      if (index < 0)
        return { code: 40404, message: "重点单位不存在", data: null };
      units.splice(index, 1);
      return {
        code: 0,
        message: "删除重点单位成功",
        data: true,
      } satisfies ApiResponse<boolean>;
    },
  },
] satisfies KeyUnitMockMethod[];
