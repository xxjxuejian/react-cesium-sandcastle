type UserStatus = "enabled" | "disabled";
type UserGender = "male" | "female" | "unknown";

interface UserRecord {
  id: string;
  username: string;
  nickname: string;
  status: UserStatus;
  gender: UserGender;
  department: string;
  role: string;
  phone: string;
  email: string;
  createdAt: string;
}

type UserFormValues = Omit<UserRecord, "id" | "createdAt">;
type UserQueryParams = Partial<
  Pick<UserRecord, "username" | "nickname" | "status" | "department" | "phone">
> & {
  page?: string;
  pageSize?: string;
};

interface UserMockRequest {
  url: string;
  body: UserFormValues;
  query: UserQueryParams;
}

interface UserMockMethod {
  url: string;
  method: "get" | "post" | "put" | "delete";
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

let users = [...initialUsers];

function includesText(source: string, keyword?: string) {
  return (
    !keyword?.trim() ||
    source.toLowerCase().includes(keyword.trim().toLowerCase())
  );
}

function getCreatedAt() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(/\//g, "-");
}

function getPathId(url: string) {
  return url.split("/").at(-1) ?? "";
}

export default [
  {
    url: "/api/system-management/users",
    method: "get",
    response: ({ query }) => {
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 10;
      const filteredUsers = users.filter(
        (user) =>
          includesText(user.username, query.username) &&
          includesText(user.nickname, query.nickname) &&
          includesText(user.department, query.department) &&
          includesText(user.phone, query.phone) &&
          (!query.status || user.status === query.status),
      );
      const start = (page - 1) * pageSize;

      return {
        list: filteredUsers.slice(start, start + pageSize),
        total: filteredUsers.length,
      };
    },
  },
  {
    url: "/api/system-management/users",
    method: "post",
    response: ({ body }) => {
      const user: UserRecord = {
        id: crypto.randomUUID(),
        ...body,
        createdAt: getCreatedAt(),
      };

      users = [user, ...users];
      return user;
    },
  },
  {
    url: "/api/system-management/users/:id",
    method: "put",
    response: ({ body, url }) => {
      const id = getPathId(url);
      const userIndex = users.findIndex((user) => user.id === id);

      if (userIndex < 0) {
        return { message: "用户不存在" };
      }

      const updatedUser = { ...users[userIndex], ...body };
      users = users.map((user) => (user.id === id ? updatedUser : user));
      return updatedUser;
    },
  },
  {
    url: "/api/system-management/users/:id",
    method: "delete",
    response: ({ url }) => {
      const id = getPathId(url);
      users = users.filter((user) => user.id !== id);
      return undefined;
    },
  },
] satisfies UserMockMethod[];
