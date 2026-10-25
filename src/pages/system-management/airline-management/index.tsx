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
  createAirline,
  deleteAirline,
  getAirlineDetail,
  getAirlineList,
  updateAirline,
} from "@/api/airlineManagement";
import { isRequestCanceled } from "@/utils/request";
import { AirlineEditor } from "./AirlineEditor";
import type {
  AirlineEditorMode,
  AirlineFormValues,
  AirlineListItem,
  AirlineQueryParams,
  AirlineRecord,
} from "./types";

/** 当前打开的工作区；关闭后回到列表，不需要额外增加路由。 */
interface EditorContext {
  /** create 新增、view 只读查看、edit 编辑已有航线。 */
  mode: AirlineEditorMode;
  /** 新增时为 null；查看和编辑时用于请求完整详情。 */
  id: string | null;
}

/** 航线管理入口：负责列表、接口请求和工作区切换。 */
export default function AirlineManagement() {
  const [messageApi, messageContext] = message.useMessage();
  // 输入框内容和已提交的查询条件分开保存，输入时不会逐字发送请求。
  const [searchName, setSearchName] = useState("");
  const [query, setQuery] = useState<AirlineQueryParams>({
    page: 1,
    pageSize: 10,
  });
  const [airlines, setAirlines] = useState<AirlineListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  // 列表只有摘要；打开查看或编辑工作区后，单独加载完整航线。
  const [editor, setEditor] = useState<EditorContext | null>(null);
  const [detail, setDetail] = useState<AirlineRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  // state 驱动按钮状态，ref 则在同一次渲染前也能拦住重复保存。
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const savingRef = useRef(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState<number>();
  const [tableBodyHeight, setTableBodyHeight] = useState(300);

  useEffect(() => {
    if (editor) return;
    const listContainer = listContainerRef.current;
    const tableArea = tableAreaRef.current;
    if (!listContainer || !tableArea) return;
    const header = tableArea.querySelector<HTMLElement>(".ant-table-header");
    const panel = listContainer.parentElement;
    const content = listContainer.closest("main");

    const updateSizes = () => {
      // 按实际顶部位置和两层底部内边距计算，不写死顶部栏高度。
      const top = listContainer.getBoundingClientRect().top + window.scrollY;
      const panelPadding = panel
        ? parseFloat(getComputedStyle(panel).paddingBottom) || 0
        : 0;
      const contentPadding = content
        ? parseFloat(getComputedStyle(content).paddingBottom) || 0
        : 0;
      setListHeight(
        Math.max(0, window.innerHeight - top - panelPadding - contentPadding),
      );
      // scroll.y 只控制数据区，要扣除表头和边框。
      setTableBodyHeight(
        Math.max(0, tableArea.clientHeight - (header?.offsetHeight ?? 0) - 2),
      );
    };

    // 首次观察会触发测量，窗口缩放、查询区换行后也会重新计算。
    const observer = new ResizeObserver(updateSizes);
    observer.observe(tableArea);
    if (header) observer.observe(header);
    if (content) observer.observe(content);
    window.addEventListener("resize", updateSizes);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSizes);
    };
  }, [editor]);

  useEffect(() => {
    mountedRef.current = true;
    // 写请求无法保证撤销；离开路由后忽略其结果，避免操作已卸载的页面。
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadList() {
      try {
        const result = await getAirlineList(query, controller.signal);
        if (controller.signal.aborted) return;
        const tableBody =
          tableAreaRef.current?.querySelector<HTMLElement>(".ant-table-body");
        if (tableBody) tableBody.scrollTop = 0;
        setAirlines(result.list);
        setTotal(result.total);
        setListError("");
      } catch (error) {
        if (controller.signal.aborted || isRequestCanceled(error)) return;
        setAirlines([]);
        setTotal(0);
        setListError(
          error instanceof Error ? error.message : "加载航线列表失败",
        );
      } finally {
        if (!controller.signal.aborted) setListLoading(false);
      }
    }

    void loadList();
    // 搜索、翻页或离开页面时取消旧请求，旧结果不能覆盖最新列表。
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (!editor?.id) return;
    const controller = new AbortController();
    const id = editor.id;

    async function loadDetail() {
      try {
        const result = await getAirlineDetail(id, controller.signal);
        if (!controller.signal.aborted) setDetail(result);
      } catch (error) {
        if (controller.signal.aborted || isRequestCanceled(error)) return;
        setDetailError(
          error instanceof Error ? error.message : "加载航线详情失败",
        );
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    }

    void loadDetail();
    // 关闭工作区、切换记录或重试时，作废上一次详情请求。
    return () => controller.abort();
  }, [editor]);

  function handleSearch(name: string) {
    setSearchName(name);
    setListLoading(true);
    setQuery({ ...query, name: name.trim(), page: 1 });
  }

  function handleOpen(mode: AirlineEditorMode, id: string | null = null) {
    setDetail(null);
    setDetailError("");
    setDetailLoading(id !== null);
    setEditor({ mode, id });
  }

  /** 重新创建查询对象，使用原筛选条件刷新；新增后回到第 1 页。 */
  function refreshList(page = query.page ?? 1) {
    setListLoading(true);
    setQuery({ ...query, page });
  }

  async function handleSave(values: AirlineFormValues) {
    if (!editor || editor.mode === "view" || savingRef.current) return;
    savingRef.current = true;
    setSubmitting(true);
    try {
      if (editor.mode === "create") {
        await createAirline(values);
      } else if (editor.id) {
        await updateAirline(editor.id, values);
      }
      if (!mountedRef.current) return;
      void messageApi.success("航线保存成功");
      setEditor(null);
      refreshList(editor.mode === "create" ? 1 : undefined);
    } catch (error) {
      if (!mountedRef.current) return;
      void messageApi.error(
        error instanceof Error ? error.message : "保存航线失败",
      );
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }

  async function handleDelete(airline: AirlineListItem) {
    if (deletingId !== null) return;
    setDeletingId(airline.id);
    try {
      await deleteAirline(airline.id);
      if (!mountedRef.current) return;
      void messageApi.success("航线已删除");
      // 删除末页最后一条时回到前一页，避免停在空列表上。
      const page = query.page ?? 1;
      refreshList(airlines.length === 1 && page > 1 ? page - 1 : page);
    } catch (error) {
      if (!mountedRef.current) return;
      void messageApi.error(
        error instanceof Error ? error.message : "删除航线失败",
      );
    } finally {
      if (mountedRef.current) setDeletingId(null);
    }
  }

  const columns: TableProps<AirlineListItem>["columns"] = [
    { title: "航线名称", dataIndex: "name", width: 240 },
    { title: "航点数量", dataIndex: "waypointCount", width: 110 },
    {
      title: "航线长度",
      dataIndex: "length",
      width: 150,
      render: (length: number) => `${length.toFixed(1)} 米`,
    },
    {
      title: "飞行速度",
      dataIndex: "speed",
      width: 130,
      render: (speed: number) => `${speed} 米/秒`,
    },
    { title: "更新时间", dataIndex: "updatedAt", width: 190 },
    {
      title: "操作",
      key: "actions",
      width: 210,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            disabled={deletingId !== null}
            onClick={() => handleOpen("view", record.id)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            disabled={deletingId !== null}
            onClick={() => handleOpen("edit", record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除航线"
            description={`确定删除“${record.name}”吗？`}
            okText="删除"
            cancelText="取消"
            disabled={deletingId !== null || listLoading}
            onConfirm={() => handleDelete(record)}
          >
            <Button
              type="link"
              danger
              size="small"
              disabled={deletingId !== null || listLoading}
              loading={deletingId === record.id}
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
      ref={listContainerRef}
      style={{ height: editor ? undefined : listHeight }}
    >
      {messageContext}
      {editor ? (
        detailLoading ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-6">
            <Spin description="正在加载完整航线" />
            <Button onClick={() => setEditor(null)}>返回列表</Button>
          </div>
        ) : detailError ? (
          <Alert
            type="error"
            showIcon
            title="加载航线详情失败"
            description={detailError}
            action={
              <Space>
                <Button onClick={() => handleOpen(editor.mode, editor.id)}>
                  重试
                </Button>
                <Button onClick={() => setEditor(null)}>返回列表</Button>
              </Space>
            }
          />
        ) : (
          <AirlineEditor
            key={`${editor.mode}-${editor.id ?? "new"}`}
            mode={editor.mode}
            airline={detail}
            submitting={submitting}
            onSave={handleSave}
            onBack={() => setEditor(null)}
          />
        )
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-4">
          <Form
            layout="inline"
            className="shrink-0 gap-y-3"
            onFinish={() => handleSearch(searchName)}
          >
            <Form.Item label="航线名称" htmlFor="airline-search">
              <Input
                id="airline-search"
                allowClear
                placeholder="输入航线名称"
                value={searchName}
                disabled={deletingId !== null}
                onChange={(event) => setSearchName(event.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={deletingId !== null}
                >
                  搜索
                </Button>
                <Button
                  disabled={deletingId !== null}
                  onClick={() => handleSearch("")}
                >
                  重置
                </Button>
                <Button
                  disabled={deletingId !== null}
                  onClick={() => refreshList()}
                  loading={listLoading}
                >
                  刷新
                </Button>
              </Space>
            </Form.Item>
          </Form>
          <div className="flex shrink-0 justify-end">
            <Button
              type="primary"
              icon={<PlusOutlined aria-hidden />}
              disabled={deletingId !== null}
              onClick={() => handleOpen("create")}
            >
              新增航线
            </Button>
          </div>
          {listError ? (
            <Alert
              className="shrink-0"
              type="error"
              showIcon
              title="加载航线列表失败"
              description={listError}
            />
          ) : null}
          <div ref={tableAreaRef} className="min-h-0 flex-1 overflow-hidden">
            <Table<AirlineListItem>
              rowKey="id"
              columns={columns}
              dataSource={airlines}
              loading={listLoading}
              scroll={{ x: 1100, y: tableBodyHeight }}
              locale={{
                emptyText: listError
                  ? "加载失败，请点击刷新重试"
                  : "暂无匹配的航线，可调整搜索条件或新增航线",
              }}
              pagination={false}
            />
          </div>
          {/* 分页放在表格滚动区之外，数据再多也不会把分页推到屏幕下方。 */}
          <Pagination
            className="shrink-0 self-end"
            current={query.page}
            pageSize={query.pageSize}
            total={total}
            showSizeChanger
            disabled={deletingId !== null}
            pageSizeOptions={[5, 10, 20, 50]}
            showTotal={(count) => `共 ${count} 条航线`}
            onChange={(page, pageSize) => {
              setListLoading(true);
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
