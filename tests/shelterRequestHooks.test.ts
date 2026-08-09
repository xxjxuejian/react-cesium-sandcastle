import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { JSDOM } from "jsdom";

import type {
  ShelterQueryParams,
  ShelterRecord,
} from "../src/pages/system-management/shelter-management/types.js";
import { useShelterDetail } from "../src/pages/system-management/shelter-management/hooks/useShelterDetail.js";
import { useShelterList } from "../src/pages/system-management/shelter-management/hooks/useShelterList.js";
import request from "../src/utils/request.js";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.defineProperty(globalThis, "window", { value: dom.window });
Object.defineProperty(globalThis, "document", { value: dom.window.document });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator });
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  value: true,
  writable: true,
  configurable: true,
});

const { act, cleanup, renderHook, waitFor } = await import(
  "@testing-library/react"
);

interface PendingRequest {
  config: InternalAxiosRequestConfig;
  resolveData: (data: unknown) => void;
}

const originalAdapter = request.defaults.adapter;

function createDeferredAdapter(): {
  adapter: AxiosAdapter;
  pendingRequests: PendingRequest[];
} {
  const pendingRequests: PendingRequest[] = [];
  const adapter: AxiosAdapter = (config) =>
    new Promise<AxiosResponse>((resolve) => {
      pendingRequests.push({
        config,
        resolveData(data) {
          resolve({
            data: { code: 0, message: "请求成功", data },
            status: 200,
            statusText: "OK",
            headers: new AxiosHeaders(),
            config,
          });
        },
      });
    });

  return { adapter, pendingRequests };
}

function createShelter(id: string): ShelterRecord {
  return {
    id,
    name: `避难场所 ${id}`,
    facilityType: "school",
    shelterUsage: "temporary",
    operationStatus: "open",
    capacity: 100,
    availableCapacity: 50,
    facilities: [],
    address: "测试地址",
    location: { longitude: 116, latitude: 39 },
    managementUnit: "测试单位",
    contactName: "测试联系人",
    contactPhone: "13800000000",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

afterEach(() => {
  cleanup();
  request.defaults.adapter = originalAdapter;
});

test("列表查询变化时取消旧请求且只保留最新结果", async () => {
  const { adapter, pendingRequests } = createDeferredAdapter();
  request.defaults.adapter = adapter;
  const initialQuery: ShelterQueryParams = { page: 1, pageSize: 5, name: "A" };
  const { result, rerender } = renderHook(
    ({ query }: { query: ShelterQueryParams }) => useShelterList(query),
    { initialProps: { query: initialQuery } },
  );

  await waitFor(() => assert.equal(pendingRequests.length, 1));

  rerender({ query: { ...initialQuery, name: "B" } });
  await waitFor(() => assert.equal(pendingRequests.length, 2));
  assert.equal(pendingRequests[0]?.config.signal?.aborted, true);

  await act(async () => {
    pendingRequests[1]?.resolveData({ list: [createShelter("B")], total: 1 });
  });
  await waitFor(() => assert.equal(result.current.shelters[0]?.id, "B"));

  await act(async () => {
    pendingRequests[0]?.resolveData({ list: [createShelter("A")], total: 1 });
  });
  assert.equal(result.current.shelters[0]?.id, "B");
  assert.equal(result.current.loading, false);
});

test("详情请求采用 latest-wins 且旧请求不能关闭新请求 loading", async () => {
  const { adapter, pendingRequests } = createDeferredAdapter();
  request.defaults.adapter = adapter;
  const { result } = renderHook(() => useShelterDetail());

  let firstRequest: Promise<void> | undefined;
  act(() => {
    firstRequest = result.current.loadDetail("A");
  });
  await waitFor(() => assert.equal(pendingRequests.length, 1));

  let secondRequest: Promise<void> | undefined;
  act(() => {
    secondRequest = result.current.loadDetail("B");
  });
  await waitFor(() => assert.equal(pendingRequests.length, 2));
  assert.equal(pendingRequests[0]?.config.signal?.aborted, true);
  assert.equal(result.current.loading, true);

  await act(async () => {
    pendingRequests[0]?.resolveData(createShelter("A"));
    await firstRequest;
  });
  assert.equal(result.current.loading, true);
  assert.equal(result.current.shelter, null);

  await act(async () => {
    pendingRequests[1]?.resolveData(createShelter("B"));
    await secondRequest;
  });
  await waitFor(() => assert.equal(result.current.shelter?.id, "B"));
  assert.equal(result.current.loading, false);
});

test("清空详情时取消请求并阻止响应回写", async () => {
  const { adapter, pendingRequests } = createDeferredAdapter();
  request.defaults.adapter = adapter;
  const { result } = renderHook(() => useShelterDetail());

  let detailRequest: Promise<void> | undefined;
  act(() => {
    detailRequest = result.current.loadDetail("A");
  });
  await waitFor(() => assert.equal(pendingRequests.length, 1));

  act(() => result.current.clearDetail());
  assert.equal(pendingRequests[0]?.config.signal?.aborted, true);
  assert.equal(result.current.loading, false);

  await act(async () => {
    pendingRequests[0]?.resolveData(createShelter("A"));
    await detailRequest;
  });
  assert.equal(result.current.shelter, null);
  assert.equal(result.current.error, null);
});
