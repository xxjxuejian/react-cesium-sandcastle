import { useCallback, useEffect, useState } from "react";

import { getShelterList } from "../../../../api/shelterManagement.js";
import { isRequestCanceled } from "../../../../utils/request.js";
import type { ShelterQueryParams, ShelterRecord } from "../types.js";

/** 避难场所列表请求的状态。 */
interface ShelterListState {
  /** 当前页数据。 */
  shelters: ShelterRecord[];
  /** 当前查询条件对应的总记录数。 */
  total: number;
  /** 是否正在加载列表。 */
  loading: boolean;
  /** 最近一次有效请求产生的异常。 */
  error: unknown | null;
}

/**
 * 管理避难场所列表请求，并保证查询条件变化时只有最新响应可以更新状态。
 *
 * @param queryParams 当前列表筛选与分页参数。
 */
export function useShelterList(queryParams: ShelterQueryParams) {
  const [state, setState] = useState<ShelterListState>({
    shelters: [],
    total: 0,
    loading: false,
    error: null,
  });
  const [refreshVersion, setRefreshVersion] = useState(0);

  /** 使用当前查询条件重新加载列表。 */
  const refreshShelters = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchShelters() {
      setState((currentState) => ({
        ...currentState,
        loading: true,
        error: null,
      }));

      try {
        const result = await getShelterList(queryParams, controller.signal);

        if (controller.signal.aborted) return;

        setState({
          shelters: result.list,
          total: result.total,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted || isRequestCanceled(error)) return;

        setState((currentState) => ({
          ...currentState,
          loading: false,
          error,
        }));
      }
    }

    void fetchShelters();

    // 查询变化、主动刷新或组件卸载时，取消已经失效的列表请求。
    return () => controller.abort();
  }, [queryParams, refreshVersion]);

  return {
    ...state,
    refreshShelters,
  };
}
