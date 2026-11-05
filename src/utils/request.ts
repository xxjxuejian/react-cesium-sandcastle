import type { ApiResponse } from "../types/api.js";
import axios from "axios";
import { getAccessToken } from "../auth/token.js";

/** 判断请求异常是否由主动取消产生。 */
export function isRequestCanceled(error: unknown): boolean {
  return axios.isCancel(error);
}

const request = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

request.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data as ApiResponse<
      typeof response.data
    >;

    if (code !== 0) {
      throw new Error(message);
    }

    return data;
  },
  (error) => {
    // 保留 AxiosError 的状态码和原请求，认证 store 可据此判断是否清理会话。
    if (axios.isAxiosError<ApiResponse<null>>(error) && !isRequestCanceled(error)) {
      const message = error.response?.data?.message;
      if (typeof message === "string" && message) {
        error.message = message;
      } else if (!error.response || error.response.status === 502) {
        error.message = "无法连接后端服务，请确认服务已启动";
      }
    }
    return Promise.reject(error);
  },
);

export default request;
