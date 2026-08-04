import type { LoginRequest, LoginResult, SessionResult } from "@/auth/types";
import type { ApiResponse } from "@/types/api";
import request from "@/utils/request";

/** 使用账号凭证登录并获取认证信息。
 * 类型解释：
 * 1 - Promise<SessionResult>： 返回的结果是一个Promise，
 * Promise 的 resolve 的数据类型是LoginResult 类型
 *
 * 2 - ApiResponse<LoginResult>：后端原始响应类型，描述后端实际返回的数据结构：
 *
 * 3 - LoginResult：表示经过 Axios 响应拦截器处理后，request.post() 最终返回的数据类型。
 * 由于响应拦截器中执行了return data;
 * 因此调用方直接得到：{
   accessToken: string;
   user: AuthUser;
   routes: BackendRouteItem[];
   没有code,message,data:{}
 }
 */
export function login(values: LoginRequest): Promise<LoginResult> {
  return request.post<ApiResponse<LoginResult>, LoginResult>(
    "/auth/login",
    values,
  );
}

/** 获取当前登录用户的会话信息。 */
export function getSession(): Promise<SessionResult> {
  return request.get<ApiResponse<SessionResult>, SessionResult>(
    "/auth/session",
  );
}

/** 退出当前登录会话。 */
export function logout(): Promise<boolean> {
  return request.post<ApiResponse<boolean>, boolean>("/auth/logout");
}
