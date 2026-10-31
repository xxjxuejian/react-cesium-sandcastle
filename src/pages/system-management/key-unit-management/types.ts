/** 三种固定防御圈：core 核心圈、counter 反制圈、warning 警戒圈。 */
export type DefenseRingType = "core" | "counter" | "warning";

/** 一个圆柱状防御范围；全部高度相对统一地面零平面，单位为米。 */
export interface DefenseRing {
  /** 从单位共同中心到边界的水平半径，必须大于 0。 */
  radius: number;
  /** 高度下界，必须大于等于 0，边界计入圈内。 */
  minHeight: number;
  /** 高度上界，必须大于下界，边界计入圈内。 */
  maxHeight: number;
}

/** 每个单位恰好维护三个固定圈层，不保存重复的圆心。 */
export interface DefenseRings {
  /** 最内层核心防御空间。 */
  core: DefenseRing;
  /** 包含核心空间的反制空间。 */
  counter: DefenseRing;
  /** 包含反制空间的最外层警戒空间。 */
  warning: DefenseRing;
}

/** 保存重点单位时提交的全部可编辑字段。 */
export interface KeyUnitFormValues {
  /** 单位名称，去除首尾空白后不能为空，允许同名。 */
  name: string;
  /** 共同中心的 WGS84 经度，单位为度，范围 -180～180。 */
  longitude: number;
  /** 共同中心的 WGS84 纬度，单位为度，范围 -90～90。 */
  latitude: number;
  /** 地址或地标，未填写时使用空字符串。 */
  address: string;
  /** 补充说明，未填写时使用空字符串。 */
  remark: string;
  /** 三个防御空间，半径递增且高度区间逐层包含。 */
  rings: DefenseRings;
}

/** 列表需要的范围摘要，不提前请求备注和创建时间。 */
export interface KeyUnitListItem {
  /** 系统生成的唯一编号，编辑时不能修改。 */
  id: string;
  /** 用于列表展示和搜索的名称。 */
  name: string;
  /** 共同中心经度，单位为度。 */
  longitude: number;
  /** 共同中心纬度，单位为度。 */
  latitude: number;
  /** 位置描述，为空时列表展示经纬度。 */
  address: string;
  /** 列表显示各圈半径和上下高度。 */
  rings: DefenseRings;
  /** 北京时间，格式为 YYYY-MM-DD HH:mm:ss。 */
  updatedAt: string;
}

/** 查看和编辑使用的完整单位记录。 */
export interface KeyUnitRecord extends KeyUnitListItem {
  /** 补充说明，未填写时为空字符串。 */
  remark: string;
  /** 系统维护的首次创建时间，更新时保留。 */
  createdAt: string;
}

/** 名称筛选和分页参数；省略的字段使用接口默认值。 */
export interface KeyUnitQueryParams {
  /** 名称模糊搜索；省略或空白时查询全部。 */
  name?: string;
  /** 页码，从 1 开始，省略时为 1。 */
  page?: number;
  /** 每页 1～100 条，省略时为 10。 */
  pageSize?: number;
}

/** 分页接口返回值。 */
export interface KeyUnitListResult {
  /** 当前页的单位摘要。 */
  list: KeyUnitListItem[];
  /** 按名称筛选后的总数。 */
  total: number;
}

/** 尚未保存的圈层输入；null 表示输入为空，不能当成 0。 */
export interface DefenseRingDraft {
  /** 待填写的半径，单位为米。 */
  radius: number | null;
  /** 待填写的最低高度，单位为米；0 是有效输入。 */
  minHeight: number | null;
  /** 待填写的最高高度，单位为米。 */
  maxHeight: number | null;
}

/** 编辑过程允许清空数值，保存前统一校验。 */
export interface KeyUnitDraft {
  /** 尚未保存的单位名称。 */
  name: string;
  /** 中心经度，null 表示尚未选点。 */
  longitude: number | null;
  /** 中心纬度，null 表示尚未选点。 */
  latitude: number | null;
  /** 地址或地标，可为空。 */
  address: string;
  /** 补充说明，可为空。 */
  remark: string;
  /** 固定三层的输入值；逐项修改不自动调整其他层。 */
  rings: {
    /** 核心圈输入。 */
    core: DefenseRingDraft;
    /** 反制圈输入。 */
    counter: DefenseRingDraft;
    /** 警戒圈输入。 */
    warning: DefenseRingDraft;
  };
}

/** create 新增、edit 编辑、view 只读查看。 */
export type KeyUnitEditorMode = "create" | "edit" | "view";

/** 二维用于范围编辑，三维用于立体预览。 */
export type KeyUnitMapMode = "2d" | "3d";

/** 地图正在进行的操作；null 表示自由浏览。 */
export type KeyUnitMapAction = "center" | "radius" | null;
