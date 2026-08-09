import { useEffect, useRef, useState } from "react";
import { Alert, Button, message, Space, Typography } from "antd";

import {
  createShelter,
  deleteShelter,
  getShelterDetail,
  getShelterList,
  updateShelter,
} from "@/api/shelterManagement";
import { isRequestCanceled } from "@/utils/request";
import { ShelterDetailModal } from "../components/ShelterDetailModal";
import { ShelterForm } from "../components/ShelterForm";
import { ShelterTable } from "../components/ShelterTable";
import type {
  ShelterFormValues,
  ShelterQueryParams,
  ShelterRecord,
} from "../types";

const defaultQueryParams: ShelterQueryParams = {
  page: 1,
  pageSize: 5,
};

interface ListRaceSimulation {
  /** 当前是第几轮模拟，用于区分多次点击产生的模拟任务。 */
  runId: number;
  /** 当前模拟的是先发出的慢请求 A，还是后发出的快请求 B。 */
  requestName: "请求 A" | "请求 B";
  /** 人为增加的响应等待时间。 */
  delayMs: number;
}

/**
 * 给响应增加一段可取消的等待时间，用来稳定复现“先请求、后返回”的情况。
 *
 * @param delayMs 需要等待的毫秒数。
 * @param signal 与列表请求共用的取消信号；请求取消时，等待也会立即结束。
 */
function waitForResponse(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, delayMs);

    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("列表请求已取消", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * 不使用自定义 Hook 的避难所管理页面示例。
 *
 * 这里仍使用 React 内置 Hook；列表、详情请求及竞态处理全部直接写在页面组件中。
 * 文件名不是 index.tsx，因此不会被项目的页面模块扫描规则收集。
 */
export default function ShelterManagementWithoutCustomHooks() {
  // 列表查询条件。搜索、重置和翻页最终都会修改这个 state。
  const [queryParams, setQueryParams] =
    useState<ShelterQueryParams>(defaultQueryParams);
  // 当前表格展示的避难所数据。
  const [shelters, setShelters] = useState<ShelterRecord[]>([]);
  // 满足当前查询条件的数据总数，供分页组件计算页数。
  const [total, setTotal] = useState(0);
  // 列表请求是否正在进行，传给表格显示 loading。
  const [listLoading, setListLoading] = useState(false);
  // 当查询参数没有变化但需要重新加载时，递增该值来触发列表 useEffect。
  const [refreshVersion, setRefreshVersion] = useState(0);
  // 当前列表竞态模拟的请求信息；null 表示没有执行模拟。
  const [listRaceSimulation, setListRaceSimulation] =
    useState<ListRaceSimulation | null>(null);
  // 页面上展示的竞态处理步骤日志。
  const [listRaceLogs, setListRaceLogs] = useState<string[]>([]);

  // 新增/编辑抽屉是否打开。
  const [modalOpen, setModalOpen] = useState(false);
  // 表单当前是新增模式还是编辑模式。
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  // 编辑时选中的记录；新增时为 null。
  const [curShelter, setCurShelter] = useState<ShelterRecord | null>(null);
  // 新增/编辑提交状态，防止保存过程中重复提交。
  const [submitting, setSubmitting] = useState(false);

  // 详情弹窗是否打开。
  const [detailOpen, setDetailOpen] = useState(false);
  // 详情接口是否正在请求。
  const [detailLoading, setDetailLoading] = useState(false);
  // 详情接口返回的数据；开始新请求时先清空，避免短暂展示旧详情。
  const [detailShelter, setDetailShelter] =
    useState<ShelterRecord | null>(null);

  // 保存当前详情请求的控制器；快速切换记录时用它取消上一次请求。
  const detailControllerRef = useRef<AbortController | null>(null);
  // 保存“300ms 后发出请求 B”的定时器编号，便于重复模拟或卸载时清理。
  const simulationTimerRef = useRef<number | null>(null);
  // 保存模拟轮次编号。修改 ref 不会触发重新渲染，适合保存这种临时标识。
  const simulationRunIdRef = useRef(0);
  // 记录已经完成的模拟轮次，避免后续普通搜索继续使用模拟延迟。
  const completedSimulationRunIdRef = useRef<number | null>(null);
  // 标记组件是否仍挂载，防止卸载后继续写入竞态演示日志。
  const pageMountedRef = useRef(false);

  /**
   * 仅在组件挂载时执行一次。
   *
   * 返回的 cleanup 会在组件卸载时执行：标记页面已卸载，并清除尚未触发的
   * 请求 B 定时器。空依赖数组表示它不随普通重新渲染重复执行。
   */
  useEffect(() => {
    pageMountedRef.current = true;

    return () => {
      pageMountedRef.current = false;

      if (simulationTimerRef.current !== null) {
        window.clearTimeout(simulationTimerRef.current);
      }
    };
  }, []);

  /**
   * 加载列表并处理列表请求竞态。
   *
   * queryParams、refreshVersion 或 listRaceSimulation 变化时会重新执行。
   * React 会先运行上一次 effect 的 cleanup，取消旧请求，再启动这次请求，
   * 所以较晚返回的旧响应无法覆盖新响应。
   */
  useEffect(() => {
    // 每次 effect 都创建独立的控制器，当前控制器只负责当前这一次请求。
    const controller = new AbortController();
    // 已完成的模拟不再生效，后续搜索和翻页按普通请求执行。
    const activeSimulation =
      listRaceSimulation?.runId !== completedSimulationRunIdRef.current
        ? listRaceSimulation
        : null;

    async function loadShelterList() {
        setListLoading(true);

      if (activeSimulation) {
        setListRaceLogs((logs) => [
          ...logs,
          `${activeSimulation.requestName} 开始，模拟 ${activeSimulation.delayMs}ms 后返回`,
        ]);
      }

      try {
        // 将 signal 传入 Axios；controller.abort() 会真正取消该 HTTP 请求。
        const listPromise = getShelterList(queryParams, controller.signal);

        // 请求和模拟延迟同时开始；普通列表请求不会增加额外延迟。
        const [result] = await Promise.all([
          listPromise,
          waitForResponse(activeSimulation?.delayMs ?? 0, controller.signal),
        ]);

        // 查询条件已变化或组件已卸载时，不允许旧响应覆盖新数据。
        if (controller.signal.aborted) return;

        setShelters(result.list);
        setTotal(result.total);
        setListLoading(false);

        if (activeSimulation) {
          // B 成功后记录本轮已完成，后续普通请求不会继续添加模拟延迟。
          completedSimulationRunIdRef.current = activeSimulation.runId;
          setListRaceLogs((logs) => [
            ...logs,
            `${activeSimulation.requestName} 成功更新列表`,
          ]);
        }
      } catch (error) {
        // 主动取消属于正常竞态处理流程，不提示“加载失败”。
        if (controller.signal.aborted || isRequestCanceled(error)) {
          if (activeSimulation && pageMountedRef.current) {
            setListRaceLogs((logs) => [
              ...logs,
              `${activeSimulation.requestName} 被取消，不能更新列表`,
            ]);
          }
          return;
        }

        setListLoading(false);
        message.error("加载避难场所列表失败");
      }
    }

    void loadShelterList();

    // 下一次 effect 执行前或组件卸载时，取消上一次列表请求。
    return () => controller.abort();
  }, [listRaceSimulation, queryParams, refreshVersion]);

  /**
   * 详情请求由点击事件发起，不是由依赖变化驱动，因此单独在组件卸载时清理。
   */
  useEffect(() => {
    return () => {
      // 页面卸载后，不允许尚未结束的详情请求更新页面状态。
      detailControllerRef.current?.abort();
      detailControllerRef.current = null;
    };
  }, []);

  /** 在查询条件不变时，主动触发一次列表刷新。 */
  function refreshShelters() {
    setRefreshVersion((version) => version + 1);
  }

  /**
   * 先发出耗时 3 秒的请求 A，300ms 后再发出只耗时 500ms 的请求 B。
   * B 改变 state 后会触发 effect cleanup，从而取消仍在等待的 A。
   */
  function simulateListRace() {
    // 每次点击使用新的 runId，保证新旧两轮模拟可以被区分。
    simulationRunIdRef.current += 1;
    const runId = simulationRunIdRef.current;

    if (simulationTimerRef.current !== null) {
      // 连续点击按钮时，先取消上一轮尚未发出的请求 B。
      window.clearTimeout(simulationTimerRef.current);
    }

    setListRaceLogs([]);
    // state 改变后触发列表 useEffect，先发出耗时更长的请求 A。
    setListRaceSimulation({
      runId,
      requestName: "请求 A",
      delayMs: 3000,
    });

    // 300ms 后把模拟状态切换为 B；effect cleanup 会在此时取消请求 A。
    simulationTimerRef.current = window.setTimeout(() => {
      setListRaceSimulation({
        runId,
        requestName: "请求 B",
        delayMs: 500,
      });
      simulationTimerRef.current = null;
    }, 300);
  }

  /** 合并搜索表单值，并将页码重置到第一页。 */
  function handleQuery(values: Partial<ShelterQueryParams>) {
    setQueryParams((currentQuery) => ({
      ...currentQuery,
      ...values,
      page: 1,
    }));
  }

  /** 恢复默认查询条件；queryParams 变化后会自动重新请求列表。 */
  function handleResetQuery() {
    setQueryParams(defaultQueryParams);
  }

  /** 更新当前页和每页条数，由分页组件调用。 */
  function handlePageChange(page: number, pageSize: number) {
    setQueryParams((currentQuery) => ({
      ...currentQuery,
      page,
      pageSize,
    }));
  }

  /** 打开新增抽屉，并清除之前选中的编辑记录。 */
  function handleCreate() {
    setCurShelter(null);
    setModalMode("create");
    setModalOpen(true);
  }

  /** 保存当前行作为编辑数据，并打开编辑抽屉。 */
  function handleEdit(shelter: ShelterRecord) {
    setCurShelter(shelter);
    setModalMode("edit");
    setModalOpen(true);
  }

  /**
   * 删除指定记录。
   * 如果当前页只剩最后一条数据，则删除后返回上一页；否则刷新当前页。
   */
  async function handleDelete(shelter: ShelterRecord) {
    try {
      await deleteShelter(shelter.id);

      const nextPage =
        shelters.length === 1 && queryParams.page > 1
          ? queryParams.page - 1
          : queryParams.page;

      message.success("删除成功");
      if (nextPage !== queryParams.page) {
        setQueryParams((currentQuery) => ({
          ...currentQuery,
          page: nextPage,
        }));
      } else {
        refreshShelters();
      }
    } catch {
      message.error("删除避难场所失败");
    }
  }

  /** 根据表单模式调用新增或编辑接口，成功后关闭抽屉并刷新列表。 */
  async function handleSubmit(values: ShelterFormValues) {
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        await createShelter(values);
        message.success("添加成功");
      } else if (curShelter) {
        await updateShelter(curShelter.id, values);
        message.success("修改成功");
      }

      handleModalClose();
      if (modalMode === "create" && queryParams.page !== 1) {
        setQueryParams((currentQuery) => ({ ...currentQuery, page: 1 }));
      } else {
        refreshShelters();
      }
    } catch {
      message.error("保存避难场所失败");
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * 加载指定记录的详情。
   * 快速点击不同记录时，只允许最后一次请求更新详情弹窗。
   */
  async function handleDetail(shelter: ShelterRecord) {
    // 快速点击不同记录时，先取消前一个详情请求。
    detailControllerRef.current?.abort();

    const controller = new AbortController();
    detailControllerRef.current = controller;

    setDetailOpen(true);
    setDetailShelter(null);
    setDetailLoading(true);

    try {
      const result = await getShelterDetail(shelter.id, controller.signal);

      // 除了判断是否取消，还要确认它仍是“当前请求”。
      if (
        controller.signal.aborted ||
        detailControllerRef.current !== controller
      ) {
        return;
      }

      setDetailShelter(result);
    } catch (error) {
      if (
        controller.signal.aborted ||
        detailControllerRef.current !== controller ||
        isRequestCanceled(error)
      ) {
        return;
      }

      setDetailOpen(false);
      message.error("加载避难场所详情失败");
    } finally {
      // 旧请求结束时，不能关闭新请求的 loading。
      if (detailControllerRef.current === controller) {
        detailControllerRef.current = null;
        setDetailLoading(false);
      }
    }
  }

  /** 关闭详情弹窗，同时取消尚未完成的详情请求并清理详情状态。 */
  function handleDetailClose() {
    detailControllerRef.current?.abort();
    detailControllerRef.current = null;
    setDetailOpen(false);
    setDetailShelter(null);
    setDetailLoading(false);
  }

  /** 关闭新增/编辑抽屉，并清除当前编辑记录。 */
  function handleModalClose() {
    setModalOpen(false);
    setCurShelter(null);
  }

  return (
    <>
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="列表请求竞态演示"
        description={
          <Space direction="vertical">
            <Typography.Text>
              点击后会先发出慢请求 A，再发出快请求 B。B 开始前会取消 A，
              因此最终只有 B 可以更新列表。
            </Typography.Text>
            <Button onClick={simulateListRace}>模拟连续请求</Button>
            {listRaceLogs.map((log, index) => (
              <Typography.Text code key={`${index}-${log}`}>
                {index + 1}. {log}
              </Typography.Text>
            ))}
          </Space>
        }
      />

      <ShelterTable
        shelters={shelters}
        loading={listLoading}
        total={total}
        queryParams={queryParams}
        onQuery={handleQuery}
        onResetQuery={handleResetQuery}
        onPageChange={handlePageChange}
        onCreate={handleCreate}
        onDetail={handleDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ShelterForm
        open={modalOpen}
        mode={modalMode}
        confirmLoading={submitting}
        initialShelter={curShelter}
        onCancel={handleModalClose}
        onSubmit={handleSubmit}
      />

      <ShelterDetailModal
        open={detailOpen}
        loading={detailLoading}
        shelter={detailShelter}
        onCancel={handleDetailClose}
      />
    </>
  );
}
