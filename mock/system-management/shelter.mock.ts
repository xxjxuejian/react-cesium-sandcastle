import type {
  ShelterFormValues,
  ShelterListResult,
  ShelterQueryParams,
  ShelterRecord,
} from "../../src/pages/system-management/shelter-management/types.js";
import type { ApiResponse } from "../../src/types/api.js";

/** Mock 请求中的查询参数，分页字段由 URL 查询字符串传入。 */
type ShelterMockQuery = Omit<ShelterQueryParams, "page" | "pageSize"> & {
  page?: string;
  pageSize?: string;
};

/** vite-plugin-mock 传递给路由处理器的请求上下文。 */
interface ShelterMockRequest {
  url: string;
  body: ShelterFormValues;
  query: ShelterMockQuery;
}

/** 避难场所 Mock 路由的最小描述结构。 */
interface ShelterMockMethod {
  url: string;
  method: "get" | "post" | "put" | "delete";
  response: (request: ShelterMockRequest) => unknown;
}

/** 用于初始化开发环境的避难场所样例数据。 */
const initialShelters: ShelterRecord[] = [
  {
    id: "shelter-001",
    name: "滨江区体育中心避难场所",
    facilityType: "stadium",
    shelterUsage: "comprehensive",
    operationStatus: "open",
    capacity: 1200,
    availableCapacity: 860,
    facilities: ["drinkingWater", "toilet", "powerSupply", "parking"],
    address: "滨江区江南大道 88 号",
    location: { longitude: 120.2102, latitude: 30.2074 },
    managementUnit: "滨江区文化和广电旅游体育局",
    contactName: "张明",
    contactPhone: "13800001001",
    description: "可承担短期集中安置和应急物资发放。",
    createdAt: "2026-01-08 09:30:00",
    updatedAt: "2026-06-20 14:10:00",
  },
  {
    id: "shelter-002",
    name: "钱塘实验小学避难场所",
    facilityType: "school",
    shelterUsage: "temporary",
    operationStatus: "open",
    capacity: 800,
    availableCapacity: 550,
    facilities: ["drinkingWater", "foodSupply", "toilet", "communication"],
    address: "钱塘区学林街 66 号",
    location: { longitude: 120.3526, latitude: 30.3094 },
    managementUnit: "钱塘区教育局",
    contactName: "李静",
    contactPhone: "13800001002",
    description: "教学楼一层及风雨操场可用于临时安置。",
    createdAt: "2026-01-15 10:20:00",
    updatedAt: "2026-06-18 09:45:00",
  },
  {
    id: "shelter-003",
    name: "西兴街道社区服务中心避难场所",
    facilityType: "communityCenter",
    shelterUsage: "medicalAid",
    operationStatus: "maintenance",
    capacity: 300,
    availableCapacity: 300,
    facilities: ["medicalAid", "toilet", "powerSupply", "barrierFree"],
    address: "滨江区西兴路 128 号",
    location: { longitude: 120.2198, latitude: 30.1947 },
    managementUnit: "西兴街道办事处",
    contactName: "王磊",
    contactPhone: "13800001003",
    description: "医疗救助区设备维护中，恢复开放后可接收轻伤人员。",
    createdAt: "2026-02-03 14:00:00",
    updatedAt: "2026-07-02 11:30:00",
  },
  {
    id: "shelter-004",
    name: "江畔公园应急避难场所",
    facilityType: "park",
    shelterUsage: "supplyDistribution",
    operationStatus: "open",
    capacity: 500,
    availableCapacity: 420,
    facilities: ["drinkingWater", "foodSupply", "powerSupply", "warehouse"],
    address: "滨江区闻涛路 198 号",
    location: { longitude: 120.2036, latitude: 30.2018 },
    managementUnit: "滨江区综合行政执法局",
    contactName: "陈芳",
    contactPhone: "13800001004",
    description: "公园东侧广场设置物资周转仓和临时发放点。",
    createdAt: "2026-02-18 16:25:00",
    updatedAt: "2026-06-28 15:40:00",
  },
  {
    id: "shelter-005",
    name: "星光大道地下空间避难场所",
    facilityType: "undergroundSpace",
    shelterUsage: "longTerm",
    operationStatus: "full",
    capacity: 600,
    availableCapacity: 0,
    facilities: ["drinkingWater", "foodSupply", "toilet", "powerSupply", "communication"],
    address: "滨江区星光大道 138 号地下二层",
    location: { longitude: 120.2117, latitude: 30.1879, height: -8 },
    managementUnit: "滨江区住建局",
    contactName: "赵勇",
    contactPhone: "13800001005",
    description: "当前满员，禁止继续安排人员进入。",
    createdAt: "2026-03-12 08:50:00",
    updatedAt: "2026-07-08 19:15:00",
  },
  {
    id: "shelter-006",
    name: "浦沿文化礼堂避难场所",
    facilityType: "other",
    shelterUsage: "temporary",
    operationStatus: "closed",
    capacity: 180,
    availableCapacity: 180,
    facilities: ["toilet", "barrierFree", "parking"],
    address: "滨江区浦沿街道东信大道 900 号",
    location: { longitude: 120.1742, latitude: 30.1615 },
    managementUnit: "浦沿街道办事处",
    contactName: "周洁",
    contactPhone: "13800001006",
    description: "因消防改造暂停使用。",
    createdAt: "2026-04-06 13:10:00",
    updatedAt: "2026-06-30 10:00:00",
  },
];

/** 运行时内存数据源，开发服务重启后会恢复为初始数据。 */
let shelters = [...initialShelters];

/** 判断文本字段是否包含指定关键字，空关键字视为匹配。 */
function includesText(source: string, keyword?: string) {
  return (
    !keyword?.trim() ||
    source.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase())
  );
}

/** 生成符合列表审计字段格式的当前时间。 */
function getCurrentTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(/\//g, "-");
}

/** 从 RESTful 资源 URL 中提取最后一段作为记录 ID。 */
function getPathId(url: string) {
  return url.split("/").at(-1) ?? "";
}

export default [
  {
    /** 按 ID 查询避难场所详情。 */
    url: "/api/system-management/shelters/:id",
    method: "get",
    response: ({ url }) => {
      const shelter = shelters.find((item) => item.id === getPathId(url));

      if (!shelter) {
        return {
          code: 40402,
          message: "避难场所不存在",
          data: null,
        } satisfies ApiResponse<null>;
      }

      return {
        code: 0,
        message: "查询避难场所详情成功",
        data: shelter,
      } satisfies ApiResponse<ShelterRecord>;
    },
  },
  {
    /** 查询避难场所列表，并在 Mock 层执行筛选和分页。 */
    url: "/api/system-management/shelters",
    method: "get",
    response: ({ query }) => {
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 10;
      const filteredShelters = shelters.filter(
        (shelter) =>
          includesText(shelter.name, query.name) &&
          includesText(shelter.managementUnit, query.managementUnit) &&
          includesText(shelter.address, query.address) &&
          (!query.facilityType ||
            shelter.facilityType === query.facilityType) &&
          (!query.shelterUsage || shelter.shelterUsage === query.shelterUsage) &&
          (!query.operationStatus ||
            shelter.operationStatus === query.operationStatus),
      );
      const start = (page - 1) * pageSize;

      return {
        code: 0,
        message: "查询避难场所列表成功",
        data: {
          list: filteredShelters.slice(start, start + pageSize),
          total: filteredShelters.length,
        },
      } satisfies ApiResponse<ShelterListResult>;
    },
  },
  {
    /** 创建避难场所，并把新记录插入内存列表顶部。 */
    url: "/api/system-management/shelters",
    method: "post",
    response: ({ body }) => {
      const currentTime = getCurrentTime();
      const shelter: ShelterRecord = {
        id: crypto.randomUUID(),
        ...body,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      shelters = [shelter, ...shelters];
      return {
        code: 0,
        message: "新增避难场所成功",
        data: shelter,
      } satisfies ApiResponse<ShelterRecord>;
    },
  },
  {
    /** 按 ID 更新避难场所，同时刷新更新时间。 */
    url: "/api/system-management/shelters/:id",
    method: "put",
    response: ({ body, url }) => {
      const id = getPathId(url);
      const shelterIndex = shelters.findIndex((shelter) => shelter.id === id);

      if (shelterIndex < 0) {
        return {
          code: 40402,
          message: "避难场所不存在",
          data: null,
        } satisfies ApiResponse<null>;
      }

      const updatedShelter: ShelterRecord = {
        ...shelters[shelterIndex],
        ...body,
        updatedAt: getCurrentTime(),
      };
      shelters = shelters.map((shelter) =>
        shelter.id === id ? updatedShelter : shelter,
      );
      return {
        code: 0,
        message: "更新避难场所成功",
        data: updatedShelter,
      } satisfies ApiResponse<ShelterRecord>;
    },
  },
  {
    /** 按 ID 从内存列表中删除避难场所。 */
    url: "/api/system-management/shelters/:id",
    method: "delete",
    response: ({ url }) => {
      const id = getPathId(url);

      if (!shelters.some((shelter) => shelter.id === id)) {
        return {
          code: 40402,
          message: "避难场所不存在",
          data: null,
        } satisfies ApiResponse<null>;
      }

      shelters = shelters.filter((shelter) => shelter.id !== id);
      return {
        code: 0,
        message: "删除避难场所成功",
        data: true,
      } satisfies ApiResponse<boolean>;
    },
  },
] satisfies ShelterMockMethod[];
