// 独立的存储键避免切换模式时把模拟凭证发给真实后端。
export const usesMockApi =
  import.meta.env?.MODE !== "backend" && import.meta.env?.VITE_USE_MOCK === "true";
const ACCESS_TOKEN_KEY = usesMockApi ? "app-mock-access-token" : "app-real-access-token";

export function getAccessToken() {
  // Node.js 中的接口测试也会经过请求拦截器，此时没有浏览器存储。
  return globalThis.localStorage?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function removeAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
