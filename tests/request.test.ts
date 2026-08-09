import assert from "node:assert/strict";
import test from "node:test";
import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosAdapter,
} from "axios";

import request, { isRequestCanceled } from "../src/utils/request.js";

function createResponseAdapter(data: unknown): AxiosAdapter {
  return async (config) => ({
    data,
    status: 200,
    statusText: "OK",
    headers: new AxiosHeaders(),
    config,
  });
}

test("成功响应返回 data", async () => {
  const data = { id: "1" };
  const result = await request.get<unknown, typeof data>("/test", {
    adapter: createResponseAdapter({ code: 0, message: "查询成功", data }),
  });

  assert.deepEqual(result, data);
});

test("非零业务码使用响应消息拒绝请求", async () => {
  await assert.rejects(
    request.get("/test", {
      adapter: createResponseAdapter({
        code: 40401,
        message: "用户不存在",
        data: null,
      }),
    }),
    { name: "Error", message: "用户不存在" },
  );
});

test("Axios 原始错误不会被转换成业务错误", async () => {
  const originalError = new AxiosError("请求超时", "ECONNABORTED");
  const adapter: AxiosAdapter = async () => {
    throw originalError;
  };

  await assert.rejects(
    request.get("/test", { adapter }),
    (error) => error === originalError,
  );
});

test("只把 Axios 取消异常识别为主动取消", () => {
  assert.equal(isRequestCanceled(new CanceledError()), true);
  assert.equal(isRequestCanceled(new Error("网络错误")), false);
});
