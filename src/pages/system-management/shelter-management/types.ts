/** 场所定位使用的 WGS84 地理坐标。 */
export interface GeoPoint {
  /** 经度，单位度，范围 -180～180，必须为有限数值。 */
  longitude: number;
  /** 纬度，单位度，范围 -90～90，必须为有限数值。 */
  latitude: number;
  /** 高度，单位米；省略表示未填写，后端保存为 NULL 并在响应中省略。 */
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
  /** 总容量，单位人，非负安全整数。 */
  capacity: number;
  /** 当前可用容量，单位人，非负安全整数且不大于总容量。 */
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
  /** 可选备注，最多 2000 个字符；未填写时响应省略。 */
  description?: string;
  /** 后端生成的创建时间，北京时间 YYYY-MM-DD HH:mm:ss，编辑时保留。 */
  createdAt: string;
  /** 后端生成的更新时间，北京时间 YYYY-MM-DD HH:mm:ss。 */
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
  /** 当前页码，从 1 开始。 */
  page: number;
  /** 每页条数，1～100。 */
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
  /** 总容量，单位人，非负安全整数。 */
  capacity: number;
  /** 当前可用容量，单位人，非负安全整数且不大于总容量。 */
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
  /** 可选备注，最多 2000 个字符；省略或空白表示清空。 */
  description?: string;
}

/** 分页列表响应。 */
export interface ShelterListResult {
  /** 当前页数据。 */
  list: ShelterRecord[];
  /** 筛选后的总条数。 */
  total: number;
}
