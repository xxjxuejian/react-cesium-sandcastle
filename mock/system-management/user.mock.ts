import type { ApiResponse } from "../../src/types/api.js";
import type {
  UserRecord,
  UserCreateValues,
  UserFormValues,
} from "../../src/pages/system-management/user-management/types.js";

/** Mock 请求仅演示列表 CRUD，不与 auth.mock 的登录账号关联。 */
interface UserMockRequest {
  /** 当前地址，包含用户编号。 */
  url: string;
  /** 新增、修改或模拟重置的输入，未提供的字段由对应操作校验。 */
  body: Partial<UserCreateValues>;
  /** 文本形式的筛选与分页，省略时使用默认分页。 */
  query: Record<string, string | undefined>;
}
/** Vite Mock 接口定义。 */
interface UserMockMethod {
  /** 匹配地址。 */
  url: string;
  /** HTTP 方法。 */
  method: "get" | "post" | "put" | "delete";
  /** 返回统一响应；业务失败使用非零 code。 */
  response: (request: UserMockRequest) => unknown;
}
const initialUsers: UserRecord[] = [
  {
    id: "1",
    username: "admin",
    nickname: "系统管理员",
    status: "enabled",
    gender: "male",
    department: "平台研发部",
    role: "admin",
    phone: "13800000001",
    email: "admin@example.com",
    createdAt: "2026-01-08 09:30:00",
  },
  {
    id: "2",
    username: "zhangsan",
    nickname: "张三",
    status: "enabled",
    gender: "male",
    department: "运营管理部",
    role: "viewer",
    phone: "13800000002",
    email: "zhangsan@example.com",
    createdAt: "2026-02-14 10:12:00",
  },
  {
    id: "3",
    username: "lisi",
    nickname: "李四",
    status: "disabled",
    gender: "female",
    department: "低空安全部",
    role: "viewer",
    phone: "13800000003",
    email: "lisi@example.com",
    createdAt: "2026-03-02 15:45:00",
  },
  {
    id: "4",
    username: "wangwu",
    nickname: "王五",
    status: "enabled",
    gender: "unknown",
    department: "数据服务部",
    role: "viewer",
    phone: "13800000004",
    email: "wangwu@example.com",
    createdAt: "2026-04-20 11:20:00",
  },
];

let users = initialUsers.map((user) => ({ ...user }));

function fail(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null };
}

function getValues(body: Partial<UserCreateValues>): UserFormValues | null {
  if (
    typeof body.username !== "string" ||
    !body.username.trim() ||
    body.username.trim().length > 64 ||
    typeof body.nickname !== "string" ||
    !body.nickname.trim() ||
    body.nickname.trim().length > 64 ||
    (body.role !== "admin" && body.role !== "viewer") ||
    (body.status !== "enabled" && body.status !== "disabled") ||
    !["male", "female", "unknown"].includes(body.gender ?? "")
  )
    return null;
  for (const field of ["department", "phone", "email"] as const) {
    if (body[field] !== undefined && typeof body[field] !== "string")
      return null;
  }
  const department = body.department?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  if (
    department.length > 100 ||
    (phone && !/^1\d{10}$/.test(phone)) ||
    email.length > 254 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    return null;
  // 显式组装白名单，密码和伪造编号都不会进入返回记录。
  return {
    username: body.username.trim(),
    nickname: body.nickname.trim(),
    role: body.role,
    status: body.status,
    gender: body.gender!,
    department,
    phone,
    email,
  };
}

function validPassword(password: unknown) {
  return (
    typeof password === "string" &&
    password.length >= 15 &&
    password.length <= 128
  );
}

function protectsLastAdmin(user: UserRecord, next?: UserFormValues) {
  return (
    user.role === "admin" &&
    user.status === "enabled" &&
    (next?.role !== "admin" || next.status !== "enabled") &&
    users.filter((item) => item.role === "admin" && item.status === "enabled")
      .length === 1
  );
}

// 详情更具体的重置路径放在通用 /:id 前面，兼容生产 Mock 的路径匹配顺序。
export default [
  {
    url: "/api/system-management/users",
    method: "get",
    response: ({ query }) => {
      const page = Number(query.page ?? 1);
      const pageSize = Number(query.pageSize ?? 10);
      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100 ||
        !Number.isSafeInteger((page - 1) * pageSize)
      )
        return fail(40000, "分页参数不正确");
      if (
        query.status &&
        query.status !== "enabled" &&
        query.status !== "disabled"
      )
        return fail(40000, "筛选状态不正确");
      const filtered = users
        .filter(
          (user) =>
            ["username", "nickname", "department", "phone"].every((field) => {
              const value =
                user[field as "username" | "nickname" | "department" | "phone"];
              return value
                .toLowerCase()
                .includes((query[field] ?? "").trim().toLowerCase());
            }) &&
            (!query.status || query.status === user.status),
        )
        .sort(
          (a, b) =>
            b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
        );
      return {
        code: 0,
        message: "查询用户列表成功",
        data: {
          list: filtered
            .slice((page - 1) * pageSize, page * pageSize)
            .map((user) => ({ ...user })),
          total: filtered.length,
        },
      };
    },
  },
  {
    url: "/api/system-management/users",
    method: "post",
    response: ({ body }) => {
      const values = getValues(body);
      if (!values || !validPassword(body.password))
        return fail(40000, "请填写有效资料及 15～128 个字符的初始密码");
      if (users.some((user) => user.username === values.username))
        return fail(40900, "用户名已存在");
      const user: UserRecord = {
        ...values,
        id: crypto.randomUUID(),
        createdAt: new Intl.DateTimeFormat("sv-SE", {
          timeZone: "Asia/Shanghai",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      };
      users.unshift(user);
      return {
        code: 0,
        message: "模拟新增用户成功，不会创建登录账号",
        data: { ...user },
      };
    },
  },
  {
    url: "/api/system-management/users/:id/password",
    method: "put",
    response: ({ body, url }) => {
      const id = url.split("/").at(-2);
      if (!users.some((user) => user.id === id))
        return fail(40401, "用户不存在");
      if (!validPassword(body.password))
        return fail(40000, "密码长度须为 15～128 个字符");
      // 不保存密码：这里只模拟成功反馈，登录仍由独立的 auth.mock 管理。
      return { code: 0, message: "模拟重置成功，不会修改登录账号", data: true };
    },
  },
  {
    url: "/api/system-management/users/:id",
    method: "put",
    response: ({ body, url }) => {
      const id = url.split("/").at(-1);
      const current = users.find((user) => user.id === id);
      if (!current) return fail(40401, "用户不存在");
      const values = getValues(body);
      if (!values) return fail(40000, "用户资料不正确");
      if (
        users.some(
          (user) => user.id !== id && user.username === values.username,
        )
      )
        return fail(40900, "用户名已存在");
      if (protectsLastAdmin(current, values))
        return fail(40900, "不能删除、停用或降级最后一个启用的管理员");
      const updated = { ...current, ...values };
      users = users.map((user) => (user.id === id ? updated : user));
      return { code: 0, message: "更新用户成功", data: { ...updated } };
    },
  },
  {
    url: "/api/system-management/users/:id",
    method: "delete",
    response: ({ url }) => {
      const id = url.split("/").at(-1);
      const user = users.find((item) => item.id === id);
      if (!user) return fail(40401, "用户不存在");
      if (protectsLastAdmin(user))
        return fail(40900, "不能删除、停用或降级最后一个启用的管理员");
      users = users.filter((item) => item.id !== id);
      return { code: 0, message: "删除用户成功", data: true };
    },
  },
] satisfies UserMockMethod[];
