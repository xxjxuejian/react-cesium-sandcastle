import type {
  UserFormValues,
  UserListResult,
  UserQueryParams,
  UserRecord,
} from "@/pages/system-management/user-management/types";
import request from "@/utils/request";

/** 查询用户分页列表。 */
export function getUserList(params: UserQueryParams): Promise<UserListResult> {
  return request.get<UserListResult, UserListResult>(
    "/system-management/users",
    { params },
  );
}

/** 新增用户。 */
export function createUser(values: UserFormValues): Promise<UserRecord> {
  return request.post<UserRecord, UserRecord>("/system-management/users", values);
}

/** 更新用户。 */
export function updateUser(
  id: string,
  values: UserFormValues,
): Promise<UserRecord> {
  return request.put<UserRecord, UserRecord>(
    `/system-management/users/${id}`,
    values,
  );
}

/** 删除用户。 */
export function deleteUser(id: string): Promise<void> {
  return request.delete<void, void>(`/system-management/users/${id}`);
}
