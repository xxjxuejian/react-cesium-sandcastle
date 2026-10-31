import type {
  DefenseRingType,
  KeyUnitFormValues,
} from "../pages/system-management/key-unit-management/types.js";

/** 固定圈层的名称和颜色，同时用于表格、表单、地图和校验提示。 */
interface DefenseRingDefinition {
  /** 接口中的固定类型。 */
  type: DefenseRingType;
  /** 用户看到的中文名称。 */
  label: string;
  /** 地图和图例的识别颜色，不代表实时告警。 */
  color: string;
}

export const DEFENSE_RINGS: DefenseRingDefinition[] = [
  { type: "core", label: "核心圈", color: "#EF4444" },
  { type: "counter", label: "反制圈", color: "#F59E0B" },
  { type: "warning", label: "警戒圈", color: "#06B6D4" },
];

/** 验证地图可以使用的经纬度；输入为空时不会被转换成 0。 */
export function hasValidKeyUnitCenter(
  longitude: unknown,
  latitude: unknown,
): boolean {
  return (
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180 &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90
  );
}

/**
 * 表单和 Mock 共用的业务校验，返回第一条可修正的错误；空字符串表示通过。
 * 参数使用 unknown，因为接口还需要防止非对象、缺失字段等真实请求错误。
 */
export function validateKeyUnit(input: unknown): string {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return "请求体必须是重点单位对象";
  const values = input as Record<string, unknown>;
  if (typeof values.name !== "string" || !values.name.trim())
    return "请输入单位名称";
  if (!hasValidKeyUnitCenter(values.longitude, values.latitude))
    return "请设置有效的单位中心点：经度 -180～180，纬度 -90～90";
  if (typeof values.address !== "string" || typeof values.remark !== "string")
    return "位置描述和备注必须是字符串，可留空";
  if (
    !values.rings ||
    typeof values.rings !== "object" ||
    Array.isArray(values.rings)
  )
    return "请完整设置核心圈、反制圈和警戒圈";
  const rings = values.rings as Record<string, unknown>;
  if (Object.keys(rings).length !== 3)
    return "仅允许核心圈、反制圈和警戒圈各一个";
  for (const { type, label } of DEFENSE_RINGS) {
    const item = rings[type];
    if (!item || typeof item !== "object" || Array.isArray(item))
      return `请设置${label}`;
    const ring = item as Record<string, unknown>;
    if (
      typeof ring.radius !== "number" ||
      !Number.isFinite(ring.radius) ||
      ring.radius <= 0
    )
      return `${label}半径必须是大于 0 的有限数值`;
    if (
      typeof ring.minHeight !== "number" ||
      !Number.isFinite(ring.minHeight) ||
      ring.minHeight < 0
    )
      return `${label}最低高度必须是大于等于 0 的有限数值`;
    if (
      typeof ring.maxHeight !== "number" ||
      !Number.isFinite(ring.maxHeight) ||
      ring.maxHeight <= ring.minHeight
    )
      return `${label}最高高度必须大于最低高度`;
  }
  // 前面已经逐项检查了结构和数值，后面只比较三层之间的关系。
  const checked = (input as KeyUnitFormValues).rings;
  for (let index = 0; index < DEFENSE_RINGS.length - 1; index += 1) {
    const inner = DEFENSE_RINGS[index];
    const outer = DEFENSE_RINGS[index + 1];
    if (checked[inner.type].radius >= checked[outer.type].radius)
      return `${inner.label}半径必须小于${outer.label}半径`;
    if (checked[inner.type].minHeight < checked[outer.type].minHeight)
      return `${inner.label}最低高度不能低于${outer.label}最低高度`;
    if (checked[inner.type].maxHeight > checked[outer.type].maxHeight)
      return `${inner.label}最高高度不能超过${outer.label}最高高度`;
  }
  return "";
}
