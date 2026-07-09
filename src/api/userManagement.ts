import type {
  UserFormValues,
  UserListResult,
  UserQueryParams,
  UserRecord,
} from "@/pages/system-management/user-management/types";

const mockUsers: UserRecord[] = [
  {
    id: "1",
    username: "admin",
    nickname: "系统管理员",
    status: "enabled",
    gender: "male",
    department: "平台研发部",
    role: "超级管理员",
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
    role: "运营专员",
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
    role: "安全审核员",
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
    role: "数据分析员",
    phone: "13800000004",
    email: "wangwu@example.com",
    createdAt: "2026-04-20 11:20:00",
  },
];

let userStore = [...mockUsers];

function delay<T>(data: T) {
  return new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(data), 200);
  });
}

function includesText(source: string, keyword?: string) {
  if (!keyword?.trim()) return true;

  return source.toLowerCase().includes(keyword.trim().toLowerCase());
}

function getCreatedAt() {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return formatter.format(new Date()).replace(/\//g, "-");
}

/** 查询用户分页列表。 */
export async function getUserList(
  params: UserQueryParams,
): Promise<UserListResult> {
  const filteredUsers = userStore.filter((user) => {
    return (
      includesText(user.username, params.username) &&
      includesText(user.nickname, params.nickname) &&
      includesText(user.department, params.department) &&
      includesText(user.phone, params.phone) &&
      (!params.status || user.status === params.status)
    );
  });

  const start = (params.page - 1) * params.pageSize;
  const list = filteredUsers.slice(start, start + params.pageSize);

  return delay({
    list,
    total: filteredUsers.length,
  });
}

/** 新增用户。 */
export async function createUser(values: UserFormValues): Promise<UserRecord> {
  const user: UserRecord = {
    id: crypto.randomUUID(),
    ...values,
    createdAt: getCreatedAt(),
  };

  userStore = [user, ...userStore];

  return delay(user);
}

/** 更新用户。 */
export async function updateUser(
  id: string,
  values: UserFormValues,
): Promise<UserRecord> {
  let updatedUser: UserRecord | null = null;

  userStore = userStore.map((user) => {
    if (user.id !== id) return user;

    updatedUser = {
      ...user,
      ...values,
    };

    return updatedUser;
  });

  if (!updatedUser) {
    throw new Error("用户不存在");
  }

  return delay(updatedUser);
}

/** 删除用户。 */
export async function deleteUser(id: string): Promise<void> {
  userStore = userStore.filter((user) => user.id !== id);

  return delay(undefined);
}
