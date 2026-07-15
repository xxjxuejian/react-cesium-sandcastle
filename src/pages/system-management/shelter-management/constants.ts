import type {
  ShelterFacility,
  ShelterFacilityType,
  ShelterOperationStatus,
  ShelterUsage,
} from "./types";

/** 避难场所形态文本。 */
export const shelterFacilityTypeText = {
  school: "学校",
  stadium: "体育馆",
  park: "公园广场",
  communityCenter: "社区中心",
  undergroundSpace: "地下空间",
  other: "其他",
} satisfies Record<ShelterFacilityType, string>;

/** 避难场所应急用途文本。 */
export const shelterUsageText = {
  temporary: "临时避难",
  longTerm: "长期安置",
  medicalAid: "医疗救助",
  supplyDistribution: "物资发放",
  comprehensive: "综合避难",
} satisfies Record<ShelterUsage, string>;

/** 避难场所运营状态文本。 */
export const shelterOperationStatusText = {
  open: "开放中",
  full: "已满员",
  maintenance: "维护中",
  closed: "已停用",
} satisfies Record<ShelterOperationStatus, string>;

/** 避难场所运营状态标签颜色。 */
export const shelterOperationStatusColor = {
  open: "success",
  full: "error",
  maintenance: "warning",
  closed: "default",
} satisfies Record<ShelterOperationStatus, string>;

/** 避难场所设施能力文本。 */
export const shelterFacilityText = {
  drinkingWater: "饮水",
  foodSupply: "食品",
  medicalAid: "医疗点",
  toilet: "卫生间",
  powerSupply: "供电",
  communication: "通信",
  barrierFree: "无障碍设施",
  parking: "停车场",
  warehouse: "物资仓库",
} satisfies Record<ShelterFacility, string>;

/** 避难场所形态下拉选项。 */
export const shelterFacilityTypeOptions: Array<{
  label: string;
  value: ShelterFacilityType;
}> = [
  { label: shelterFacilityTypeText.school, value: "school" },
  { label: shelterFacilityTypeText.stadium, value: "stadium" },
  { label: shelterFacilityTypeText.park, value: "park" },
  { label: shelterFacilityTypeText.communityCenter, value: "communityCenter" },
  {
    label: shelterFacilityTypeText.undergroundSpace,
    value: "undergroundSpace",
  },
  { label: shelterFacilityTypeText.other, value: "other" },
];

/** 避难场所应急用途下拉选项。 */
export const shelterUsageOptions: Array<{
  label: string;
  value: ShelterUsage;
}> = [
  { label: shelterUsageText.temporary, value: "temporary" },
  { label: shelterUsageText.longTerm, value: "longTerm" },
  { label: shelterUsageText.medicalAid, value: "medicalAid" },
  {
    label: shelterUsageText.supplyDistribution,
    value: "supplyDistribution",
  },
  { label: shelterUsageText.comprehensive, value: "comprehensive" },
];

/** 避难场所运营状态下拉选项。 */
export const shelterOperationStatusOptions: Array<{
  label: string;
  value: ShelterOperationStatus;
}> = [
  { label: shelterOperationStatusText.open, value: "open" },
  { label: shelterOperationStatusText.full, value: "full" },
  { label: shelterOperationStatusText.maintenance, value: "maintenance" },
  { label: shelterOperationStatusText.closed, value: "closed" },
];

/** 避难场所设施能力下拉选项。 */
export const shelterFacilityOptions: Array<{
  label: string;
  value: ShelterFacility;
}> = [
  { label: shelterFacilityText.drinkingWater, value: "drinkingWater" },
  { label: shelterFacilityText.foodSupply, value: "foodSupply" },
  { label: shelterFacilityText.medicalAid, value: "medicalAid" },
  { label: shelterFacilityText.toilet, value: "toilet" },
  { label: shelterFacilityText.powerSupply, value: "powerSupply" },
  { label: shelterFacilityText.communication, value: "communication" },
  { label: shelterFacilityText.barrierFree, value: "barrierFree" },
  { label: shelterFacilityText.parking, value: "parking" },
  { label: shelterFacilityText.warehouse, value: "warehouse" },
];
