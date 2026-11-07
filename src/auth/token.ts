// 沿用真实接口的凭证键，清理 Mock 后已有真实会话仍可恢复。
const ACCESS_TOKEN_KEY = "app-real-access-token";

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
