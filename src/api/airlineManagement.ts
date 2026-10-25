import type {
  AirlineFormValues,
  AirlineListResult,
  AirlineQueryParams,
  AirlineRecord,
} from "../pages/system-management/airline-management/types.js";
import type { ApiResponse } from "../types/api.js";
import request from "../utils/request.js";

/** 查询航线摘要；signal 可在组件卸载或查询条件变化时取消请求。 */
export function getAirlineList(
  params?: AirlineQueryParams,
  signal?: AbortSignal,
): Promise<AirlineListResult> {
  return request.get<ApiResponse<AirlineListResult>, AirlineListResult>(
    "/system-management/airlines",
    { params, signal },
  );
}

/** 查看和编辑共用详情接口；列表接口不包含航点。 */
export function getAirlineDetail(
  id: string,
  signal?: AbortSignal,
): Promise<AirlineRecord> {
  return request.get<ApiResponse<AirlineRecord>, AirlineRecord>(
    `/system-management/airlines/${encodeURIComponent(id)}`,
    { signal },
  );
}

/** 点击保存时一次提交基本信息和全部航点。request 会解包响应中的 data。 */
export function createAirline(
  values: AirlineFormValues,
): Promise<AirlineRecord> {
  return request.post<ApiResponse<AirlineRecord>, AirlineRecord>(
    "/system-management/airlines",
    values,
  );
}

/** 整体替换可编辑字段和航点，不用于逐个航点自动保存。 */
export function updateAirline(
  id: string,
  values: AirlineFormValues,
): Promise<AirlineRecord> {
  return request.put<ApiResponse<AirlineRecord>, AirlineRecord>(
    `/system-management/airlines/${encodeURIComponent(id)}`,
    values,
  );
}

/** 删除航线，成功时返回 true。 */
export function deleteAirline(id: string): Promise<boolean> {
  return request.delete<ApiResponse<boolean>, boolean>(
    `/system-management/airlines/${encodeURIComponent(id)}`,
  );
}
