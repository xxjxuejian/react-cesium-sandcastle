import type {
  KeyUnitFormValues,
  KeyUnitListResult,
  KeyUnitQueryParams,
  KeyUnitRecord,
} from "../pages/system-management/key-unit-management/types.js";
import type { ApiResponse } from "../types/api.js";
import request from "../utils/request.js";

/** 名称筛选与分页；signal 用于取消过期的查询。 */
export function getKeyUnitList(
  params?: KeyUnitQueryParams,
  signal?: AbortSignal,
): Promise<KeyUnitListResult> {
  return request.get<ApiResponse<KeyUnitListResult>, KeyUnitListResult>(
    "/system-management/key-units",
    { params, signal },
  );
}

/** 查看和编辑前请求完整记录；不直接修改列表中的摘要。 */
export function getKeyUnitDetail(
  id: string,
  signal?: AbortSignal,
): Promise<KeyUnitRecord> {
  return request.get<ApiResponse<KeyUnitRecord>, KeyUnitRecord>(
    `/system-management/key-units/${encodeURIComponent(id)}`,
    { signal },
  );
}

/** 保存时一次提交单位信息、共同中心与三层防御范围。 */
export function createKeyUnit(
  values: KeyUnitFormValues,
): Promise<KeyUnitRecord> {
  return request.post<ApiResponse<KeyUnitRecord>, KeyUnitRecord>(
    "/system-management/key-units",
    values,
  );
}

/** 整体替换可编辑内容，编号和创建时间由接口保留。 */
export function updateKeyUnit(
  id: string,
  values: KeyUnitFormValues,
): Promise<KeyUnitRecord> {
  return request.put<ApiResponse<KeyUnitRecord>, KeyUnitRecord>(
    `/system-management/key-units/${encodeURIComponent(id)}`,
    values,
  );
}

/** 仅删除重点单位，不操作航线或避难场所。 */
export function deleteKeyUnit(id: string): Promise<boolean> {
  return request.delete<ApiResponse<boolean>, boolean>(
    `/system-management/key-units/${encodeURIComponent(id)}`,
  );
}
