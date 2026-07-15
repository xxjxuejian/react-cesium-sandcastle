/** 地理坐标。 */
export interface GeoPoint {
  /** 经度。 */
  longitude: number;
  /** 纬度。 */
  latitude: number;
  /** 高度，单位为米。 */
  height?: number;
}

/** 避难场所形态。 */
export type ShelterFacilityType =
  | "school"
  | "stadium"
  | "park"
  | "communityCenter"
  | "undergroundSpace"
  | "other";

/** 避难场所应急用途。 */
export type ShelterUsage =
  | "temporary"
  | "longTerm"
  | "medicalAid"
  | "supplyDistribution"
  | "comprehensive";

/** 避难场所运营状态。 */
export type ShelterOperationStatus =
  | "open"
  | "full"
  | "maintenance"
  | "closed";

/** 避难场所设施能力。 */
export type ShelterFacility =
  | "drinkingWater"
  | "foodSupply"
  | "medicalAid"
  | "toilet"
  | "powerSupply"
  | "communication"
  | "barrierFree"
  | "parking"
  | "warehouse";

/** 避难场所列表中的单条数据。 */
export interface ShelterRecord {
  /** 避难场所唯一标识。 */
  id: string;
  /** 避难场所名称。 */
  name: string;
  /** 场所形态。 */
  facilityType: ShelterFacilityType;
  /** 应急用途。 */
  shelterUsage: ShelterUsage;
  /** 运营状态。 */
  operationStatus: ShelterOperationStatus;
  /** 总容量。 */
  capacity: number;
  /** 当前可用容量。 */
  availableCapacity: number;
  /** 设施能力。 */
  facilities: ShelterFacility[];
  /** 详细地址。 */
  address: string;
  /** 地图定位坐标。 */
  location: GeoPoint;
  /** 管理单位。 */
  managementUnit: string;
  /** 联系人。 */
  contactName: string;
  /** 联系电话。 */
  contactPhone: string;
  /** 备注说明。 */
  description?: string;
  /** 创建时间。 */
  createdAt: string;
  /** 更新时间。 */
  updatedAt: string;
}

/** 避难场所列表查询参数。 */
export interface ShelterQueryParams {
  /** 避难场所名称，支持模糊搜索。 */
  name?: string;
  /** 场所形态。 */
  facilityType?: ShelterFacilityType;
  /** 应急用途。 */
  shelterUsage?: ShelterUsage;
  /** 运营状态。 */
  operationStatus?: ShelterOperationStatus;
  /** 管理单位，支持模糊搜索。 */
  managementUnit?: string;
  /** 地址，支持模糊搜索。 */
  address?: string;
  /** 当前页码。 */
  page: number;
  /** 每页条数。 */
  pageSize: number;
}

/** 新增或编辑避难场所时提交的表单数据。 */
export interface ShelterFormValues {
  /** 避难场所名称。 */
  name: string;
  /** 场所形态。 */
  facilityType: ShelterFacilityType;
  /** 应急用途。 */
  shelterUsage: ShelterUsage;
  /** 运营状态。 */
  operationStatus: ShelterOperationStatus;
  /** 总容量。 */
  capacity: number;
  /** 当前可用容量。 */
  availableCapacity: number;
  /** 设施能力。 */
  facilities: ShelterFacility[];
  /** 详细地址。 */
  address: string;
  /** 地图定位坐标。 */
  location: GeoPoint;
  /** 管理单位。 */
  managementUnit: string;
  /** 联系人。 */
  contactName: string;
  /** 联系电话。 */
  contactPhone: string;
  /** 备注说明。 */
  description?: string;
}

/** 分页列表响应。 */
export interface ShelterListResult {
  /** 当前页数据。 */
  list: ShelterRecord[];
  /** 筛选后的总条数。 */
  total: number;
}
