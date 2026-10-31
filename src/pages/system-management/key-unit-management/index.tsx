import { useEffect, useRef, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Form,
  Input,
  message,
  Pagination,
  Popconfirm,
  Space,
  Spin,
  Table,
} from "antd";
import type { TableProps } from "antd";
import {
  createKeyUnit,
  deleteKeyUnit,
  getKeyUnitDetail,
  getKeyUnitList,
  updateKeyUnit,
} from "@/api/keyUnitManagement";
import { isRequestCanceled } from "@/utils/request";
import { DEFENSE_RINGS } from "@/utils/keyUnit";
import { KeyUnitEditor } from "./KeyUnitEditor";
import type {
  KeyUnitEditorMode,
  KeyUnitFormValues,
  KeyUnitListItem,
  KeyUnitQueryParams,
  KeyUnitRecord,
} from "./types";
import "./key-unit-management.css";

/** 当前工作区，列表和详情在同一路由内切换。 */
interface EditorContext {
  /** 新增、编辑或只读查看。 */
  mode: KeyUnitEditorMode;
  /** 已有记录的编号；新增时为 null。 */
  id: string | null;
}

/** 重点单位入口：列表、请求、分页以及工作区切换。 */
export default function KeyUnitManagement() {
  const [messageApi, messageContext] = message.useMessage();
  const [searchName, setSearchName] = useState("");
  const [query, setQuery] = useState<KeyUnitQueryParams>({
    page: 1,
    pageSize: 10,
  });
  const [units, setUnits] = useState<KeyUnitListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [editor, setEditor] = useState<EditorContext | null>(null);
  const [detail, setDetail] = useState<KeyUnitRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState<number>();
  const [tableHeight, setTableHeight] = useState(300);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (editor) return;
    const container = containerRef.current;
    const table = tableRef.current;
    if (!container || !table) return;
    const header = table.querySelector<HTMLElement>(".ant-table-header");
    const content = container.closest("main");
    const panel = container.parentElement;
    function measure() {
      if (!container || !table) return;
      const bottomPadding =
        (panel ? parseFloat(getComputedStyle(panel).paddingBottom) || 0 : 0) +
        (content
          ? parseFloat(getComputedStyle(content).paddingBottom) || 0
          : 0);
      setListHeight(
        Math.max(
          0,
          window.innerHeight -
            container.getBoundingClientRect().top -
            bottomPadding,
        ),
      );
      setTableHeight(
        Math.max(0, table.clientHeight - (header?.offsetHeight ?? 0) - 2),
      );
    }
    // 只让数据区滚动，查询、新增操作、表头和分页都留在视口内。
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    if (header) observer.observe(header);
    if (content) observer.observe(content);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [editor]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const result = await getKeyUnitList(query, controller.signal);
        if (controller.signal.aborted) return;
        setUnits(result.list);
        setTotal(result.total);
        setListError("");
        const body =
          tableRef.current?.querySelector<HTMLElement>(".ant-table-body");
        if (body) body.scrollTop = 0;
      } catch (error) {
        if (controller.signal.aborted || isRequestCanceled(error)) return;
        setUnits([]);
        setTotal(0);
        setListError(
          error instanceof Error ? error.message : "加载重点单位列表失败",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    // 名称查询、分页或卸载时，旧请求不能覆盖最新结果。
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (!editor?.id) return;
    const controller = new AbortController();
    const id = editor.id;
    async function load() {
      try {
        const unit = await getKeyUnitDetail(id, controller.signal);
        if (!controller.signal.aborted) setDetail(unit);
      } catch (error) {
        if (controller.signal.aborted || isRequestCanceled(error)) return;
        setDetailError(
          error instanceof Error ? error.message : "加载重点单位详情失败",
        );
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [editor]);

  function openEditor(mode: KeyUnitEditorMode, id: string | null = null) {
    setDetail(null);
    setDetailError("");
    setDetailLoading(id !== null);
    setEditor({ mode, id });
  }

  function refresh(page = query.page ?? 1) {
    setLoading(true);
    setQuery({ ...query, page });
  }

  function search(name: string) {
    setSearchName(name);
    setLoading(true);
    setQuery({ ...query, name: name.trim(), page: 1 });
  }

  async function save(values: KeyUnitFormValues) {
    if (!editor || editor.mode === "view" || savingRef.current) return;
    savingRef.current = true;
    setSubmitting(true);
    try {
      if (editor.mode === "create") await createKeyUnit(values);
      else if (editor.id) await updateKeyUnit(editor.id, values);
      if (!mountedRef.current) return;
      void messageApi.success("重点单位保存成功");
      setEditor(null);
      refresh(editor.mode === "create" ? 1 : undefined);
    } catch (error) {
      if (mountedRef.current)
        void messageApi.error(
          error instanceof Error ? error.message : "保存重点单位失败",
        );
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }

  async function remove(unit: KeyUnitListItem) {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeletingId(unit.id);
    try {
      await deleteKeyUnit(unit.id);
      if (!mountedRef.current) return;
      void messageApi.success("重点单位已删除");
      const page = query.page ?? 1;
      refresh(units.length === 1 && page > 1 ? page - 1 : page);
    } catch (error) {
      if (mountedRef.current)
        void messageApi.error(
          error instanceof Error ? error.message : "删除重点单位失败",
        );
    } finally {
      deletingRef.current = false;
      if (mountedRef.current) setDeletingId(null);
    }
  }

  const columns: TableProps<KeyUnitListItem>["columns"] = [
    { title: "单位名称", dataIndex: "name", width: 200 },
    {
      title: "位置描述",
      width: 200,
      render: (_, unit) =>
        unit.address ||
        `${unit.longitude.toFixed(5)}, ${unit.latitude.toFixed(5)}`,
    },
    ...DEFENSE_RINGS.map(({ type, label }) => ({
      title: label,
      key: type,
      width: 150,
      render: (_: unknown, unit: KeyUnitListItem) => (
        <div>
          <div>半径 {unit.rings[type].radius} 米</div>
          <small className="key-unit-secondary">
            高度 {unit.rings[type].minHeight}～{unit.rings[type].maxHeight} 米
          </small>
        </div>
      ),
    })),
    { title: "更新时间", dataIndex: "updatedAt", width: 190 },
    {
      title: "操作",
      key: "actions",
      width: 210,
      fixed: "right",
      render: (_, unit) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            disabled={deletingId !== null}
            onClick={() => openEditor("view", unit.id)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            disabled={deletingId !== null}
            onClick={() => openEditor("edit", unit.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除重点单位"
            description={`确定删除“${unit.name}”吗？`}
            okText="删除"
            cancelText="取消"
            disabled={deletingId !== null || loading}
            onConfirm={() => remove(unit)}
          >
            <Button
              type="link"
              danger
              size="small"
              disabled={deletingId !== null || loading}
              loading={deletingId === unit.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div
      className="key-unit-page"
      ref={containerRef}
      style={{ height: editor ? undefined : listHeight }}
    >
      {messageContext}
      {editor ? (
        detailLoading ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-6">
            <Spin description="正在加载重点单位" />
            <Button onClick={() => setEditor(null)}>返回列表</Button>
          </div>
        ) : detailError ? (
          <Alert
            type="error"
            showIcon
            title="加载重点单位详情失败"
            description={detailError}
            action={
              <Space>
                <Button onClick={() => openEditor(editor.mode, editor.id)}>
                  重试
                </Button>
                <Button onClick={() => setEditor(null)}>返回列表</Button>
              </Space>
            }
          />
        ) : (
          <KeyUnitEditor
            key={`${editor.mode}-${editor.id ?? "new"}`}
            mode={editor.mode}
            unit={detail}
            submitting={submitting}
            onSave={save}
            onBack={() => setEditor(null)}
          />
        )
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-4">
          <Form
            layout="inline"
            className="shrink-0 gap-y-3"
            onFinish={() => search(searchName)}
          >
            <Form.Item label="单位名称" htmlFor="key-unit-search">
              <Input
                id="key-unit-search"
                allowClear
                placeholder="请输入单位名称"
                value={searchName}
                disabled={deletingId !== null}
                onChange={(event) => setSearchName(event.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  aria-label="搜索"
                  type="primary"
                  htmlType="submit"
                  disabled={deletingId !== null}
                >
                  搜索
                </Button>
                <Button
                  aria-label="重置"
                  disabled={deletingId !== null}
                  onClick={() => search("")}
                >
                  重置
                </Button>
                <Button
                  aria-label="刷新"
                  disabled={deletingId !== null}
                  loading={loading}
                  onClick={() => refresh()}
                >
                  刷新
                </Button>
              </Space>
            </Form.Item>
          </Form>
          <div className="flex shrink-0 items-center justify-between gap-3">
            <span className="key-unit-secondary text-xs">
              地面统一按 0 米平面计算
            </span>
            <Button
              type="primary"
              icon={<PlusOutlined aria-hidden />}
              disabled={deletingId !== null}
              onClick={() => openEditor("create")}
            >
              新增重点单位
            </Button>
          </div>
          {listError ? (
            <Alert
              type="error"
              showIcon
              className="shrink-0"
              title="加载重点单位列表失败"
              description={listError}
            />
          ) : null}
          <div ref={tableRef} className="min-h-0 flex-1 overflow-hidden">
            <Table<KeyUnitListItem>
              rowKey="id"
              columns={columns}
              dataSource={units}
              loading={loading}
              pagination={false}
              scroll={{ x: 1250, y: tableHeight }}
              locale={{
                emptyText: listError
                  ? "加载失败，请点击刷新重试"
                  : "暂无匹配的重点单位，可调整搜索条件或新增",
              }}
            />
          </div>
          <Pagination
            className="shrink-0 self-end"
            current={query.page}
            pageSize={query.pageSize}
            total={total}
            disabled={deletingId !== null}
            showSizeChanger
            pageSizeOptions={[5, 10, 20, 50]}
            showTotal={(count) => `共 ${count} 个重点单位`}
            onChange={(page, pageSize) => {
              setLoading(true);
              setQuery({
                ...query,
                page: pageSize === query.pageSize ? page : 1,
                pageSize,
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
