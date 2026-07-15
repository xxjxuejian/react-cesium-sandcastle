import type {
  ShelterFormValues,
  ShelterListResult,
  ShelterQueryParams,
  ShelterRecord,
} from "../pages/system-management/shelter-management/types.js";
import type { ApiResponse } from "../types/api.js";
import request from "../utils/request.js";

/**
 * 查询避难场所分页列表。
 *
 * @param params 列表筛选与分页参数。
 * @param signal 用于在查询条件变化或组件卸载时取消请求。
 */
export function getShelterList(
  params: ShelterQueryParams,
  signal?: AbortSignal,
): Promise<ShelterListResult> {
  return request.get<ApiResponse<ShelterListResult>, ShelterListResult>(
    "/system-management/shelters",
    { params, signal },
  );
}

/**
 * 查询避难场所详情。
 *
 * @param id 避难场所唯一标识。
 * @param signal 用于切换记录、关闭弹窗或组件卸载时取消请求。
 */
export function getShelterDetail(
  id: string,
  signal?: AbortSignal,
): Promise<ShelterRecord> {
  return request.get<ApiResponse<ShelterRecord>, ShelterRecord>(
    `/system-management/shelters/${id}`,
    { signal },
  );
}

/** 新增避难场所。 */
export function createShelter(
  values: ShelterFormValues,
): Promise<ShelterRecord> {
  return request.post<ApiResponse<ShelterRecord>, ShelterRecord>(
    "/system-management/shelters",
    values,
  );
}

/** 更新避难场所。 */
export function updateShelter(
  id: string,
  values: ShelterFormValues,
): Promise<ShelterRecord> {
  return request.put<ApiResponse<ShelterRecord>, ShelterRecord>(
    `/system-management/shelters/${id}`,
    values,
  );
}

/** 删除避难场所。 */
export function deleteShelter(id: string): Promise<boolean> {
  return request.delete<ApiResponse<boolean>, boolean>(
    `/system-management/shelters/${id}`,
  );
}
