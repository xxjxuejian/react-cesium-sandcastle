import { useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useBlocker } from "react-router";
import {
  Button,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Space,
  Tag,
  theme,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { MainLayoutContext } from "@/layouts/MainLayout/context";
import { DEFENSE_RINGS, validateKeyUnit } from "@/utils/keyUnit";
import { KeyUnitMap } from "./KeyUnitMap";
import type {
  DefenseRingDraft,
  DefenseRingType,
  KeyUnitDraft,
  KeyUnitEditorMode,
  KeyUnitFormValues,
  KeyUnitMapAction,
  KeyUnitMapMode,
  KeyUnitRecord,
} from "./types";

/** 列表打开的编辑或只读工作区。 */
interface KeyUnitEditorProps {
  /** create 新增、edit 编辑、view 查看。 */
  mode: KeyUnitEditorMode;
  /** 已加载的完整单位；新增时为 null。 */
  unit: KeyUnitRecord | null;
  /** 保存中锁定输入、地图操作和返回。 */
  submitting: boolean;
  /** 校验通过后统一保存全部数据。 */
  onSave: (values: KeyUnitFormValues) => Promise<void>;
  /** 确认放弃未保存修改后返回列表。 */
  onBack: () => void;
}

/** 单份草稿驱动参数栏和地图，不在地图里再保存一份业务数据。 */
export function KeyUnitEditor({
  mode,
  unit,
  submitting,
  onSave,
  onBack,
}: KeyUnitEditorProps) {
  const { token } = theme.useToken();
  const layout = useContext(MainLayoutContext);
  const setSidebarCollapsed = layout?.setSidebarCollapsed;
  const setCompactContent = layout?.setCompactContent;
  const previousLayout = useRef({
    collapsed: layout?.sidebarCollapsed ?? false,
    compact: layout?.compactContent ?? false,
  });
  const [modalApi, modalContext] = Modal.useModal();
  const readOnly = mode === "view";
  const [initial] = useState<KeyUnitDraft>(() =>
    unit
      ? {
          name: unit.name,
          longitude: unit.longitude,
          latitude: unit.latitude,
          address: unit.address,
          remark: unit.remark,
          rings: structuredClone(unit.rings),
        }
      : {
          // 不把演示半径当作真实单位的默认配置，新增时由用户明确填写。
          name: "",
          longitude: null,
          latitude: null,
          address: "",
          remark: "",
          rings: {
            core: { radius: null, minHeight: 0, maxHeight: null },
            counter: { radius: null, minHeight: 0, maxHeight: null },
            warning: { radius: null, minHeight: 0, maxHeight: null },
          },
        },
  );
  const [draft, setDraft] = useState<KeyUnitDraft>(() =>
    structuredClone(initial),
  );
  const [selected, setSelected] = useState<DefenseRingType>("core");
  const [tab, setTab] = useState<"rings" | "info">(
    mode === "create" ? "info" : "rings",
  );
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [mapMode, setMapMode] = useState<KeyUnitMapMode>("2d");
  const [mapAction, setMapAction] = useState<KeyUnitMapAction>(null);
  const adjustmentStart = useRef<KeyUnitDraft | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [workspaceHeight, setWorkspaceHeight] = useState(650);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  // 侧栏、面包屑和浏览器前进后退也会切换路由，不能只保护“返回列表”。
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !readOnly &&
      (dirty || submitting) &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  const validationError = validateKeyUnit(draft);
  const locked = readOnly || submitting;
  const currentRing = draft.rings[selected];
  const currentDefinition = DEFENSE_RINGS.find(
    (ring) => ring.type === selected,
  )!;
  const maxHeight = Math.max(
    1,
    ...DEFENSE_RINGS.map(({ type }) =>
      Number.isFinite(draft.rings[type].maxHeight)
        ? Math.max(0, draft.rings[type].maxHeight ?? 0)
        : 0,
    ),
  );

  useEffect(() => {
    if (!setSidebarCollapsed || !setCompactContent) return;
    const previous = previousLayout.current;
    setSidebarCollapsed(true);
    setCompactContent(true);
    // 工作区拥有临时布局变化；返回、切换路由或卸载都恢复进入前的状态。
    return () => {
      setSidebarCollapsed(previous.collapsed);
      setCompactContent(previous.compact);
    };
  }, [setSidebarCollapsed, setCompactContent]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () =>
      setWorkspaceHeight(
        Math.max(
          540,
          window.innerHeight - element.getBoundingClientRect().top - 8,
        ),
      );
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if ((!dirty && !submitting) || readOnly) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, readOnly, submitting]);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (submitting) {
      // 保存请求完成前留在工作区，避免离开后无法确认本次保存结果。
      blocker.reset();
      return;
    }
    const dialog = modalApi.confirm({
      title: "放弃未保存的修改？",
      content: "离开当前页面后，本次修改不会保存。",
      okText: "放弃修改",
      cancelText: "继续编辑",
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    });
    // 连续点击不同菜单或组件卸载时，移除旧确认框，避免留下失效操作。
    return () => dialog.destroy();
  }, [blocker, modalApi, submitting]);

  function back() {
    if (submitting) return;
    if (!dirty || readOnly) {
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

  function changeRing(field: keyof DefenseRingDraft, value: number | null) {
    if (locked || mapAction) return;
    setDraft((previous) => ({
      ...previous,
      rings: {
        ...previous.rings,
        [selected]: { ...previous.rings[selected], [field]: value },
      },
    }));
  }

  function startAdjustment(action: KeyUnitMapAction) {
    if (locked || mapAction) return;
    adjustmentStart.current = structuredClone(draft);
    setMapMode("2d");
    setMapAction(action);
  }

  function finishAdjustment(cancel: boolean) {
    if (submitting) return;
    // 取消只回滚本次地图调整，不丢掉调整前已经填写的单位信息。
    if (cancel && adjustmentStart.current) setDraft(adjustmentStart.current);
    adjustmentStart.current = null;
    setMapAction(null);
  }

  async function save() {
    if (locked || mapAction || validateKeyUnit(draft)) return;
    // 共用校验已确认经纬度和三个圈层均是有效数值，再按接口类型提交。
    await onSave(structuredClone(draft) as KeyUnitFormValues);
  }

  const styles = {
    "--ku-border": token.colorBorderSecondary,
    "--ku-bg": token.colorBgContainer,
    "--ku-muted": token.colorTextSecondary,
    "--ku-text": token.colorText,
    "--ku-active": token.colorPrimary,
    "--ku-tint": token.colorPrimaryBg,
    "--ku-danger": token.colorError,
    "--ku-height": `${workspaceHeight}px`,
    color: token.colorText,
  } as CSSProperties;

  return (
    <div className="key-unit-editor" style={styles} ref={containerRef}>
      {modalContext}
      <header className="key-unit-editor-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined aria-hidden />}
          disabled={submitting}
          onClick={back}
        >
          返回列表
        </Button>
        <h1>
          {mode === "create" ? "新增" : readOnly ? "查看" : "编辑"}重点单位
        </h1>
        <span className="key-unit-editor-name" title={draft.name}>
          {draft.name}
        </span>
        <Tag color={dirty && !readOnly ? "orange" : undefined}>
          {readOnly
            ? "只读"
            : dirty
              ? "未保存"
              : mode === "create"
                ? "待填写"
                : "已保存"}
        </Tag>
        <div className="key-unit-header-actions">
          <Button onClick={() => setPanelCollapsed((value) => !value)}>
            {panelCollapsed ? "展开面板" : "收起面板"}
          </Button>
          {!readOnly ? (
            <Button
              aria-label="保存重点单位"
              type="primary"
              loading={submitting}
              disabled={!!validationError || !!mapAction}
              onClick={() => void save()}
            >
              保存重点单位
            </Button>
          ) : null}
        </div>
      </header>
      <div
        className={`key-unit-workspace ${panelCollapsed ? "is-collapsed" : ""}`}
      >
        <section
          className="key-unit-map-column"
          aria-label="重点单位防御范围地图"
        >
          <div className="key-unit-map-header">
            <div>
              <span className="key-unit-secondary">防御范围</span>
              {!readOnly ? (
                <Button
                  size="small"
                  disabled={submitting || !!mapAction}
                  onClick={() => startAdjustment("center")}
                >
                  设置单位位置
                </Button>
              ) : null}
            </div>
            <Segmented
              value={mapMode}
              disabled={submitting || !!mapAction}
              options={[
                { label: "二维编辑", value: "2d" },
                { label: "三维预览", value: "3d" },
              ]}
              onChange={(value) => setMapMode(value as KeyUnitMapMode)}
            />
          </div>
          <div className="key-unit-map-host">
            <KeyUnitMap
              draft={draft}
              selected={selected}
              mode={mapMode}
              action={mapAction}
              readOnly={locked}
              onSelect={(type) => {
                if (!mapAction) {
                  setSelected(type);
                  setTab("rings");
                }
              }}
              onCenterChange={(longitude, latitude) => {
                if (!locked && mapAction === "center")
                  setDraft((previous) => ({
                    ...previous,
                    longitude,
                    latitude,
                  }));
              }}
              onRadiusChange={(radius) => {
                if (!locked && mapAction === "radius")
                  setDraft((previous) => ({
                    ...previous,
                    rings: {
                      ...previous.rings,
                      [selected]: { ...previous.rings[selected], radius },
                    },
                  }));
              }}
            />
          </div>
          <div className="key-unit-map-legend">
            {DEFENSE_RINGS.map(({ type, label, color }) => (
              <button
                type="button"
                key={type}
                aria-pressed={selected === type}
                disabled={!!mapAction}
                onClick={() => {
                  setSelected(type);
                  setTab("rings");
                }}
              >
                <span style={{ background: color }} />
                {label}
              </button>
            ))}
            <small>地面统一按 0 米平面计算</small>
          </div>
          <div className="key-unit-map-instructions" aria-live="polite">
            <span>
              {readOnly
                ? "只读预览，可选择圈层、定位和切换底图。"
                : mapAction === "center"
                  ? "点击地图或拖动中心点，三个圈同步移动；完成后确认本次调整。"
                  : mapAction === "radius"
                    ? `点击地图或拖动边界控制点，调整${currentDefinition.label}半径。`
                    : mapMode === "3d"
                      ? "三维展示各圈上下高度；修改位置与半径请切回二维编辑。"
                      : "选择圈层后可输入半径，或点击“地图调整半径”；完成调整后仍需保存。"}
            </span>
            {mapAction ? (
              <Space>
                <Button
                  size="small"
                  icon={<CheckOutlined aria-hidden />}
                  onClick={() => finishAdjustment(false)}
                >
                  完成调整
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined aria-hidden />}
                  onClick={() => finishAdjustment(true)}
                >
                  取消调整
                </Button>
              </Space>
            ) : null}
          </div>
        </section>
        <aside
          className="key-unit-side"
          hidden={panelCollapsed}
          aria-label="重点单位参数"
        >
          <div
            className="key-unit-tabs"
            role="tablist"
            aria-label="重点单位信息分组"
          >
            <button
              type="button"
              id="key-unit-rings-tab"
              role="tab"
              aria-selected={tab === "rings"}
              aria-controls="key-unit-rings-panel"
              onClick={() => setTab("rings")}
            >
              防御圈
            </button>
            <button
              type="button"
              id="key-unit-info-tab"
              role="tab"
              aria-selected={tab === "info"}
              aria-controls="key-unit-info-panel"
              onClick={() => setTab("info")}
            >
              基本信息
            </button>
          </div>
          <div className="key-unit-side-body">
            <div
              role="tabpanel"
              id="key-unit-rings-panel"
              aria-labelledby="key-unit-rings-tab"
              hidden={tab !== "rings"}
            >
              <div className="key-unit-ring-list">
                {DEFENSE_RINGS.map(({ type, label, color }) => (
                  <button
                    type="button"
                    key={type}
                    aria-pressed={type === selected}
                    disabled={!!mapAction}
                    onClick={() => setSelected(type)}
                  >
                    <span>
                      <i style={{ background: color }} />
                      {label}
                      <small>
                        高度 {draft.rings[type].minHeight ?? "待填写"}～
                        {draft.rings[type].maxHeight ?? "待填写"} 米
                      </small>
                    </span>
                    <span className="key-unit-number">
                      {draft.rings[type].radius ?? "待填写"} 米
                    </span>
                  </button>
                ))}
              </div>
              <h2>{currentDefinition.label}参数</h2>
              <label className="key-unit-field" htmlFor="key-unit-radius">
                <span>半径（米）</span>
                <InputNumber
                  id="key-unit-radius"
                  aria-label={`${currentDefinition.label}半径`}
                  value={currentRing.radius}
                  min={0}
                  step={10}
                  disabled={locked || !!mapAction}
                  onChange={(value) => changeRing("radius", value)}
                />
              </label>
              {!readOnly ? (
                <Button
                  block
                  disabled={
                    submitting ||
                    !!mapAction ||
                    draft.longitude === null ||
                    draft.latitude === null
                  }
                  onClick={() => startAdjustment("radius")}
                >
                  地图调整半径
                </Button>
              ) : null}
              <div className="key-unit-height-fields">
                <label className="key-unit-field" htmlFor="key-unit-min-height">
                  <span>最低高度（米）</span>
                  <InputNumber
                    id="key-unit-min-height"
                    aria-label={`${currentDefinition.label}最低高度`}
                    value={currentRing.minHeight}
                    min={0}
                    step={10}
                    disabled={locked || !!mapAction}
                    onChange={(value) => changeRing("minHeight", value)}
                  />
                </label>
                <label className="key-unit-field" htmlFor="key-unit-max-height">
                  <span>最高高度（米）</span>
                  <InputNumber
                    id="key-unit-max-height"
                    aria-label={`${currentDefinition.label}最高高度`}
                    value={currentRing.maxHeight}
                    min={0}
                    step={10}
                    disabled={locked || !!mapAction}
                    onChange={(value) => changeRing("maxHeight", value)}
                  />
                </label>
              </div>
              <p className="key-unit-secondary">
                高度相对统一零平面，三层空间逐层包含。
              </p>
              <h2>高度范围</h2>
              <svg
                className="key-unit-height-chart"
                viewBox="0 0 260 114"
                role="img"
                aria-label="三个防御圈上下高度的共同刻度示意"
              >
                <line
                  x1="22"
                  x2="250"
                  y1="86"
                  y2="86"
                  stroke={token.colorBorderSecondary}
                />
                <text
                  x="2"
                  y="90"
                  fill={token.colorTextSecondary}
                  fontSize="11"
                >
                  0
                </text>
                {DEFENSE_RINGS.map(({ type, label, color }, index) => {
                  const ring = draft.rings[type];
                  const min = Number.isFinite(ring.minHeight)
                    ? Math.max(0, ring.minHeight ?? 0)
                    : 0;
                  const max = Number.isFinite(ring.maxHeight)
                    ? Math.max(0, ring.maxHeight ?? 0)
                    : 0;
                  const top = 86 - (max / maxHeight) * 64;
                  const bottom = 86 - (min / maxHeight) * 64;
                  const x = 49 + index * 76;
                  return (
                    <g key={type}>
                      <rect
                        x={x}
                        y={Math.min(top, bottom)}
                        width="24"
                        height={Math.max(0, bottom - top)}
                        rx="3"
                        fill={color}
                        opacity={type === selected ? 0.8 : 0.25}
                      />
                      <text
                        x={x + 12}
                        y={Math.max(12, top - 5)}
                        textAnchor="middle"
                        fill={token.colorText}
                        fontSize="11"
                      >
                        {ring.maxHeight ?? "—"}
                      </text>
                      <text
                        x={x + 12}
                        y="107"
                        textAnchor="middle"
                        fill={token.colorTextSecondary}
                        fontSize="11"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div
              role="tabpanel"
              id="key-unit-info-panel"
              aria-labelledby="key-unit-info-tab"
              hidden={tab !== "info"}
            >
              <label className="key-unit-field" htmlFor="key-unit-name">
                <span>单位名称 *</span>
                <Input
                  id="key-unit-name"
                  value={draft.name}
                  placeholder="例如：某市政府"
                  disabled={locked || !!mapAction}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="key-unit-field" htmlFor="key-unit-address">
                <span>位置描述</span>
                <Input
                  id="key-unit-address"
                  value={draft.address}
                  placeholder="地址或地标"
                  disabled={locked || !!mapAction}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      address: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="key-unit-field" htmlFor="key-unit-longitude">
                <span>中心点经度</span>
                <InputNumber
                  id="key-unit-longitude"
                  aria-label="中心点经度"
                  value={draft.longitude}
                  min={-180}
                  max={180}
                  step={0.0001}
                  disabled={locked || !!mapAction}
                  onChange={(value) =>
                    setDraft((previous) => ({ ...previous, longitude: value }))
                  }
                />
              </label>
              <label className="key-unit-field" htmlFor="key-unit-latitude">
                <span>中心点纬度</span>
                <InputNumber
                  id="key-unit-latitude"
                  aria-label="中心点纬度"
                  value={draft.latitude}
                  min={-90}
                  max={90}
                  step={0.0001}
                  disabled={locked || !!mapAction}
                  onChange={(value) =>
                    setDraft((previous) => ({ ...previous, latitude: value }))
                  }
                />
              </label>
              <p className="key-unit-secondary">
                地图选点与坐标输入共用一个中心，移动后三个圈一起移动。
              </p>
              <label className="key-unit-field" htmlFor="key-unit-remark">
                <span>备注</span>
                <Input.TextArea
                  id="key-unit-remark"
                  rows={3}
                  value={draft.remark}
                  disabled={locked || !!mapAction}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      remark: event.target.value,
                    }))
                  }
                />
              </label>
              {unit ? (
                <dl className="key-unit-record-meta">
                  <dt>单位编号</dt>
                  <dd>{unit.id}</dd>
                  <dt>创建时间</dt>
                  <dd>{unit.createdAt}</dd>
                  <dt>更新时间</dt>
                  <dd>{unit.updatedAt}</dd>
                </dl>
              ) : null}
            </div>
            {validationError ? (
              <p className="key-unit-validation" role="alert">
                {validationError}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
