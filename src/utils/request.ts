import type { ApiResponse } from "../types/api.js";
import axios from "axios";

/** 判断请求异常是否由主动取消产生。 */
export function isRequestCanceled(error: unknown): boolean {
  return axios.isCancel(error);
}

const request = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

request.interceptors.request.use((config) => {
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
    return Promise.reject(error);
  },
);

export default request;
