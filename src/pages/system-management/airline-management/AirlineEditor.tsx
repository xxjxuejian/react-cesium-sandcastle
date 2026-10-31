import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Tag,
} from "antd";
import { AirlineMap } from "./AirlineMap";
import { calculateAirlineLength } from "@/utils/airline";
import type {
  AirlineEditorMode,
  AirlineFormValues,
  AirlineRecord,
  AirlineWaypoint,
} from "./types";

/** 新增、编辑和查看共用工作区的属性。 */
interface AirlineEditorProps {
  /** create 新增、edit 编辑、view 只读查看。 */
  mode: AirlineEditorMode;
  /** 查看和编辑的完整详情；新增时为 null。 */
  airline: AirlineRecord | null;
  /** 保存期间锁定输入和返回操作，避免重复提交。 */
  submitting: boolean;
  /** 表单校验通过后，一次提交基本信息及全部航点。 */
  onSave: (values: AirlineFormValues) => Promise<void>;
  /** 返回列表；由当前组件先确认是否放弃未保存修改。 */
  onBack: () => void;
}

/** 基本信息、航点编辑和地图预览；表单是未保存航线的唯一数据源。 */
export function AirlineEditor({
  mode,
  airline,
  submitting,
  onSave,
  onBack,
}: AirlineEditorProps) {
  const [form] = Form.useForm<AirlineFormValues>();
  const [modalApi, modalContext] = Modal.useModal();
  const readOnly = mode === "view";
  // 初始值只在打开工作区时读取一次；父组件通过 key 隔离不同记录的编辑状态。
  const [initialValues] = useState<AirlineFormValues>(() => ({
    name: airline?.name ?? "",
    speed: airline?.speed ?? 5,
    remark: airline?.remark ?? "",
    waypoints:
      airline?.waypoints.map((point) => ({
        longitude: point.longitude,
        latitude: point.latitude,
        altitude: point.altitude,
      })) ?? [],
  }));
  const [dirty, setDirty] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [defaultAltitude, setDefaultAltitude] = useState(60);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [focusPoint, setFocusPoint] = useState<AirlineWaypoint | null>(null);
  const waypointListRef = useRef<HTMLDivElement>(null);
  // useWatch 订阅表单中的航点，手动输入或地图操作后，列表统计和路径同步更新。
  const watchedWaypoints = Form.useWatch("waypoints", form) as
    | AirlineWaypoint[]
    | undefined;
  const waypoints = watchedWaypoints ?? initialValues.waypoints;
  const validWaypoints = waypoints.filter(
    (point) =>
      point &&
      Number.isFinite(point.longitude) &&
      Number.isFinite(point.latitude) &&
      point.longitude >= -180 &&
      point.longitude <= 180 &&
      point.latitude >= -90 &&
      point.latitude <= 90,
  );
  // 输入暂时为空或越界时，等待修正后再计算，避免把缺失的航点跨接成一条新航段。
  const length =
    validWaypoints.length === waypoints.length
      ? calculateAirlineLength(waypoints)
      : null;
  const title =
    mode === "create" ? "新增航线" : mode === "edit" ? "编辑航线" : "查看航线";

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  function handleBack() {
    if (submitting) return;
    if (!dirty) {
      onBack();
      return;
    }
    modalApi.confirm({
      title: "放弃未保存的修改？",
      content: "返回列表后，本次修改不会保存。",
      okText: "放弃修改",
      cancelText: "继续编辑",
      onOk: onBack,
    });
  }

  function handleAddPoint(point: AirlineWaypoint) {
    if (readOnly || submitting) return;
    const current = form.getFieldValue("waypoints") as AirlineWaypoint[];
    form.setFieldValue("waypoints", [...current, point]);
    setSelectedIndex(current.length);
    setDirty(true);
  }

  function handleMovePoint(index: number, longitude: number, latitude: number) {
    if (readOnly || submitting) return;
    const current = form.getFieldValue("waypoints") as AirlineWaypoint[];
    form.setFieldValue(
      "waypoints",
      current.map((point, pointIndex) =>
        pointIndex === index ? { ...point, longitude, latitude } : point,
      ),
    );
    setDirty(true);
  }

  function handleSelectPoint(index: number) {
    setSelectedIndex(index);
    waypointListRef.current
      ?.querySelector(`[data-waypoint-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function handleLocatePoint(index: number) {
    const point = waypoints[index];
    if (
      !point ||
      !Number.isFinite(point.longitude) ||
      !Number.isFinite(point.latitude) ||
      Math.abs(point.longitude) > 180 ||
      Math.abs(point.latitude) > 90
    )
      return;
    setSelectedIndex(index);
    // 创建新对象，让重复点击同一航点也能再次触发地图定位。
    setFocusPoint({ ...point });
  }

  function handleBatchAltitude() {
    const current = form.getFieldValue("waypoints") as AirlineWaypoint[];
    form.setFieldValue(
      "waypoints",
      current.map((point) => ({ ...point, altitude: defaultAltitude })),
    );
    setDirty(true);
  }

  async function handleFinish(values: AirlineFormValues) {
    if (readOnly || submitting) return;
    // 表单验证数值范围；这里补充相邻航点的业务规则，最终接口仍会再次校验。
    for (let index = 1; index < values.waypoints.length; index += 1) {
      const previous = values.waypoints[index - 1];
      const point = values.waypoints[index];
      if (
        previous.longitude === point.longitude &&
        previous.latitude === point.latitude &&
        previous.altitude === point.altitude
      ) {
        form.setFields([
          {
            name: ["waypoints", index, "altitude"],
            errors: ["与前一个航点的位置和高度完全相同，请调整或删除。"],
          },
        ]);
        handleSelectPoint(index);
        return;
      }
    }
    setDrawing(false);
    await onSave(values);
  }

  return (
    <>
      {modalContext}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={handleBack} disabled={submitting}>
            返回列表
          </Button>
          <h1 className="m-0 text-xl font-semibold">{title}</h1>
          {readOnly ? (
            <Tag>只读</Tag>
          ) : dirty ? (
            <Tag color="orange">未保存</Tag>
          ) : null}
        </div>
        {!readOnly ? (
          <Button
            type="primary"
            loading={submitting}
            onClick={() => form.submit()}
          >
            保存航线
          </Button>
        ) : null}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[460px_minmax(0,1fr)]">
        <div className="min-w-0">
          <Form<AirlineFormValues>
            form={form}
            initialValues={initialValues}
            layout="vertical"
            disabled={readOnly || submitting}
            onValuesChange={() => setDirty(true)}
            onFinish={handleFinish}
            scrollToFirstError
          >
            <h2 className="mb-4 mt-0 text-base font-semibold">基本信息</h2>
            <Form.Item
              name="name"
              label="航线名称"
              rules={[
                { required: true, whitespace: true, message: "请输入航线名称" },
              ]}
            >
              <Input placeholder="例如：滨江沿江巡检航线" />
            </Form.Item>
            <Form.Item
              name="speed"
              label="飞行速度（米/秒）"
              rules={[
                { required: true, message: "请输入飞行速度" },
                {
                  type: "number",
                  min: Number.MIN_VALUE,
                  message: "飞行速度必须大于 0",
                },
              ]}
            >
              <InputNumber className="w-full" min={0} step={1} />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} placeholder="填写航线用途或补充说明" />
            </Form.Item>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 text-base font-semibold">航点列表</h2>
              <span className="text-sm text-gray-500">
                {waypoints.length} 个航点 ·{" "}
                {length === null ? "坐标待完善" : `${length.toFixed(1)} 米`}
              </span>
            </div>
            <p className="mb-3 mt-0 text-sm text-gray-500">
              地面统一按 0 米平面计算。点击航点行可定位，地图和列表同步更新。
            </p>
            {!readOnly ? (
              <Space className="mb-3" wrap>
                <InputNumber
                  aria-label="新增及批量设置的航点高度（米）"
                  min={0}
                  value={defaultAltitude}
                  onChange={(value) => {
                    if (value !== null && Number.isFinite(value))
                      setDefaultAltitude(value);
                  }}
                />
                <span>米</span>
                <Button
                  disabled={submitting || waypoints.length === 0}
                  onClick={handleBatchAltitude}
                >
                  批量设置高度
                </Button>
              </Space>
            ) : null}
            <Form.List
              name="waypoints"
              rules={[
                {
                  validator: async (
                    _,
                    points: AirlineWaypoint[] | undefined,
                  ) => {
                    if (!points || points.length < 2)
                      throw new Error(
                        "航线至少需要两个航点，请在地图上绘制或手动添加。",
                      );
                  },
                },
              ]}
            >
              {(fields, { add, remove, move }, { errors }) => (
                <>
                  <div
                    ref={waypointListRef}
                    className="max-h-[540px] space-y-3 overflow-y-auto pr-1"
                  >
                    {fields.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无航点，点击地图开始绘制，或手动添加。"
                      />
                    ) : null}
                    {fields.map((field, index) => (
                      <section
                        key={field.key}
                        data-waypoint-index={index}
                        className={`rounded-lg border p-3 ${selectedIndex === index ? "border-blue-500 bg-blue-50/40" : "border-gray-200"}`}
                        onClick={(event) => {
                          if (
                            !(event.target as HTMLElement).closest(
                              "input, button",
                            )
                          )
                            handleLocatePoint(index);
                        }}
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <Button
                            type="text"
                            size="small"
                            disabled={false}
                            onClick={() => handleLocatePoint(index)}
                          >
                            航点 {index + 1}
                            {index === 0
                              ? " · 起点"
                              : index === fields.length - 1
                                ? " · 终点"
                                : ""}
                          </Button>
                          <Space size={0}>
                            {!readOnly ? (
                              <>
                                <Button
                                  size="small"
                                  type="text"
                                  aria-label={`上移航点 ${index + 1}`}
                                  disabled={submitting || index === 0}
                                  onClick={() => {
                                    move(index, index - 1);
                                    setSelectedIndex(index - 1);
                                    setDirty(true);
                                  }}
                                >
                                  上移
                                </Button>
                                <Button
                                  size="small"
                                  type="text"
                                  aria-label={`下移航点 ${index + 1}`}
                                  disabled={
                                    submitting || index === fields.length - 1
                                  }
                                  onClick={() => {
                                    move(index, index + 1);
                                    setSelectedIndex(index + 1);
                                    setDirty(true);
                                  }}
                                >
                                  下移
                                </Button>
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  aria-label={`删除航点 ${index + 1}`}
                                  onClick={() => {
                                    remove(index);
                                    setSelectedIndex(null);
                                    setDirty(true);
                                  }}
                                >
                                  删除
                                </Button>
                              </>
                            ) : null}
                          </Space>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3">
                          <Form.Item
                            className="mb-3"
                            name={[field.name, "longitude"]}
                            label="经度（度）"
                            rules={[
                              { required: true, message: "请输入经度" },
                              {
                                type: "number",
                                min: -180,
                                max: 180,
                                message: "经度范围为 -180～180",
                              },
                            ]}
                          >
                            <InputNumber
                              className="w-full"
                              min={-180}
                              max={180}
                              step={0.0001}
                              aria-label={`航点 ${index + 1} 经度`}
                            />
                          </Form.Item>
                          <Form.Item
                            className="mb-3"
                            name={[field.name, "latitude"]}
                            label="纬度（度）"
                            rules={[
                              { required: true, message: "请输入纬度" },
                              {
                                type: "number",
                                min: -90,
                                max: 90,
                                message: "纬度范围为 -90～90",
                              },
                            ]}
                          >
                            <InputNumber
                              className="w-full"
                              min={-90}
                              max={90}
                              step={0.0001}
                              aria-label={`航点 ${index + 1} 纬度`}
                            />
                          </Form.Item>
                          <Form.Item
                            className="col-span-2 mb-0"
                            name={[field.name, "altitude"]}
                            label="高度（米）"
                            rules={[
                              { required: true, message: "请输入高度" },
                              {
                                type: "number",
                                min: 0,
                                message: "高度不能小于 0",
                              },
                            ]}
                          >
                            <InputNumber
                              className="w-full"
                              min={0}
                              step={10}
                              aria-label={`航点 ${index + 1} 高度`}
                            />
                          </Form.Item>
                        </div>
                      </section>
                    ))}
                  </div>
                  <Form.ErrorList errors={errors} />
                  {!readOnly ? (
                    <Button
                      className="mt-3"
                      block
                      onClick={() => {
                        const last = waypoints.at(-1);
                        add({
                          longitude: last?.longitude ?? 120.2102,
                          latitude: last?.latitude ?? 30.2074,
                          altitude: defaultAltitude,
                        });
                        setSelectedIndex(fields.length);
                        setDirty(true);
                      }}
                    >
                      手动添加航点
                    </Button>
                  ) : null}
                </>
              )}
            </Form.List>
          </Form>
          {airline ? (
            <Descriptions
              className="mt-5"
              column={1}
              size="small"
              items={[
                { key: "id", label: "航线编号", children: airline.id },
                {
                  key: "createdAt",
                  label: "创建时间",
                  children: airline.createdAt,
                },
                {
                  key: "updatedAt",
                  label: "更新时间",
                  children: airline.updatedAt,
                },
              ]}
            />
          ) : null}
        </div>
        <div className="min-w-0 xl:sticky xl:top-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-base font-semibold">航线路径</h2>
            {!readOnly ? (
              <Button
                type={drawing ? "default" : "primary"}
                disabled={submitting}
                onClick={() => setDrawing((current) => !current)}
              >
                {drawing
                  ? "结束绘制"
                  : waypoints.length > 0
                    ? "继续添加航点"
                    : "开始绘制"}
              </Button>
            ) : null}
          </div>
          <AirlineMap
            waypoints={waypoints}
            selectedIndex={selectedIndex}
            focusPoint={focusPoint}
            drawing={drawing && !submitting}
            readOnly={readOnly || submitting}
            defaultAltitude={defaultAltitude}
            onAdd={handleAddPoint}
            onMove={handleMovePoint}
            onSelect={handleSelectPoint}
          />
          <Alert
            className="mt-3"
            type={drawing ? "info" : "warning"}
            showIcon
            title={
              readOnly
                ? "当前为只读预览"
                : drawing
                  ? "依次点击地图添加航点，点击“结束绘制”后仍需保存。"
                  : "可拖动地图航点，或在左侧修改经纬度、高度和顺序。"
            }
            description="地图展示二维水平路径，不自动闭合；地面统一按 0 米平面计算，各航点高度均相对此平面。"
          />
        </div>
      </div>
    </>
  );
}
