import type {
  UserFormValues,
  UserCreateValues,
  UserListResult,
  UserQueryParams,
  UserRecord,
} from "@/pages/system-management/user-management/types";
import type { ApiResponse } from "@/types/api";
import request from "@/utils/request";

/** 查询用户分页列表。 */
export function getUserList(
  params: UserQueryParams,
  signal?: AbortSignal,
): Promise<UserListResult> {
  return request.get<ApiResponse<UserListResult>, UserListResult>(
    "/system-management/users",
    { params, signal },
  );
}

/** 新增用户。 */
export function createUser(values: UserCreateValues): Promise<UserRecord> {
  return request.post<ApiResponse<UserRecord>, UserRecord>(
    "/system-management/users",
    values,
  );
}

/** 管理员重置密码；后端会同时撤销该账号的全部会话。 */
export function resetUserPassword(
  id: string,
  password: string,
): Promise<boolean> {
  return request.put<ApiResponse<boolean>, boolean>(
    `/system-management/users/${id}/password`,
    { password },
  );
}

/** 更新用户。 */
export function updateUser(
  id: string,
  values: UserFormValues,
): Promise<UserRecord> {
  return request.put<ApiResponse<UserRecord>, UserRecord>(
    `/system-management/users/${id}`,
    values,
  );
}

/** 删除用户。 */
export function deleteUser(id: string): Promise<boolean> {
  return request.delete<ApiResponse<boolean>, boolean>(
    `/system-management/users/${id}`,
  );
}
