/** 用户状态。 */
export type UserStatus = "enabled" | "disabled";

/** 用户性别。 */
export type UserGender = "male" | "female" | "unknown";

/** 用户列表中的单条用户数据。 */
export interface UserRecord {
  /** 用户唯一标识。 */
  id: string;
  /** 用户名，通常用于登录。 */
  username: string;
  /** 用户昵称，用于页面展示。 */
  nickname: string;
  /** 用户状态。 */
  status: UserStatus;
  /** 用户性别。 */
  gender: UserGender;
  /** 所属部门。 */
  department: string;
  /** 用户角色。 */
  role: string;
  /** 手机号码。 */
  phone: string;
  /** 邮箱地址。 */
  email: string;
  /** 创建时间。 */
  createdAt: string;
}

/** 用户列表查询参数。 */
export interface UserQueryParams {
  /** 用户名，支持模糊搜索。 */
  username?: string;
  /** 昵称，支持模糊搜索。 */
  nickname?: string;
  /** 用户状态。 */
  status?: UserStatus;
  /** 部门，支持模糊搜索。 */
  department?: string;
  /** 手机号码，支持模糊搜索。 */
  phone?: string;
  /** 当前页码。 */
  page: number;
  /** 每页条数。 */
  pageSize: number;
}

/** 新增或编辑用户时提交的表单数据。 */
export interface UserFormValues {
  /** 用户名。 */
  username: string;
  /** 用户昵称。 */
  nickname: string;
  /** 用户状态。 */
  status: UserStatus;
  /** 用户性别。 */
  gender: UserGender;
  /** 所属部门。 */
  department: string;
  /** 用户角色。 */
  role: string;
  /** 手机号码。 */
  phone: string;
  /** 邮箱地址。 */
  email: string;
}

/** 分页列表响应。 */
export interface UserListResult {
  /** 当前页数据。 */
  list: UserRecord[];
  /** 筛选后的总条数。 */
  total: number;
}
