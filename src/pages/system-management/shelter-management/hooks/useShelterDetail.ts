import { useCallback, useEffect, useRef, useState } from "react";

import { getShelterDetail } from "../../../../api/shelterManagement.js";
import { isRequestCanceled } from "../../../../utils/request.js";
import type { ShelterRecord } from "../types.js";

/**
 * 管理避难场所详情请求，并保证快速切换记录时只有最新请求可以更新状态。
 */
export function useShelterDetail() {
  const [shelter, setShelter] = useState<ShelterRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  /** 取消当前详情请求并清空详情状态。 */
  const clearDetail = useCallback(() => {
    const controller = controllerRef.current;
    controllerRef.current = null;
    controller?.abort();

    setShelter(null);
    setLoading(false);
    setError(null);
  }, []);

  /** 加载指定避难场所详情，并取消上一次尚未完成的详情请求。 */
  const loadDetail = useCallback(async (id: string): Promise<void> => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;
    setShelter(null);
    setLoading(true);
    setError(null);

    try {
      const result = await getShelterDetail(id, controller.signal);

      if (controller.signal.aborted || controllerRef.current !== controller) {
        return;
      }

      setShelter(result);
    } catch (error) {
      if (
        controller.signal.aborted ||
        controllerRef.current !== controller ||
        isRequestCanceled(error)
      ) {
        return;
      }

      setError(error);
    } finally {
      // 旧请求不能清理新请求的控制器，也不能关闭新请求的 loading。
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      const controller = controllerRef.current;
      controllerRef.current = null;
      controller?.abort();
    };
  }, []);

  return {
    shelter,
    loading,
    error,
    loadDetail,
    clearDetail,
  };
}
