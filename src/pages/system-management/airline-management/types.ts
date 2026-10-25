/** 保存航线时提交的航点，数组顺序就是飞行顺序。 */
export interface AirlineWaypoint {
  /** WGS84 经度，单位为度，取值范围为 -180～180。 */
  longitude: number;
  /** WGS84 纬度，单位为度，取值范围为 -90～90。 */
  latitude: number;
  /** 相对本次起飞点的高度，单位为米，必须大于等于 0。 */
  altitude: number;
}

/** 接口返回的航点，序号由服务端从 1 开始生成。 */
export interface AirlineWaypointRecord extends AirlineWaypoint {
  /** 航点序号，从 1 开始；保存时根据航点数组的顺序重新生成。 */
  order: number;
}

/** 新增和编辑使用相同的数据结构，不提交系统计算的字段。 */
export interface AirlineFormValues {
  /** 航线名称，必填；保存时去除首尾空格，允许与其他航线同名。 */
  name: string;
  /** 整条航线的飞行速度，单位为米/秒，必须大于 0。 */
  speed: number;
  /** 航线用途或补充说明；可以不传，省略时保存为空字符串。 */
  remark?: string;
  /** 按飞行顺序排列的完整航点列表，至少两个；编辑保存时整体替换。 */
  waypoints: AirlineWaypoint[];
}

/** 列表仅返回摘要；查看、编辑时再请求完整航点。 */
export interface AirlineListItem {
  /** 系统生成的航线唯一编号，用于查询详情、更新和删除。 */
  id: string;
  /** 航线名称，用于列表展示和执行飞行时选择。 */
  name: string;
  /** 系统根据航点列表统计的数量，用户不能直接修改。 */
  waypointCount: number;
  /** 系统计算的水平路径长度，单位为米，不包含高度差，也不自动闭合。 */
  length: number;
  /** 整条航线的飞行速度，单位为米/秒。 */
  speed: number;
  /** 系统维护的最近保存时间，使用北京时间，格式为 YYYY-MM-DD HH:mm:ss。 */
  updatedAt: string;
}

/** 完整航线，在列表摘要上补充详情字段。 */
export interface AirlineRecord extends AirlineListItem {
  /** 航线用途或补充说明；未填写时返回空字符串。 */
  remark: string;
  /** 系统维护的首次创建时间，格式同 updatedAt；更新航线时保留原值。 */
  createdAt: string;
  /** 包含序号的完整航点列表，供查看、编辑及地图路径展示使用。 */
  waypoints: AirlineWaypointRecord[];
}

/** 航线列表的名称筛选和分页参数，各字段均可省略。 */
export interface AirlineQueryParams {
  /** 航线名称，去除首尾空格后忽略大小写模糊搜索；省略或留空时不筛选。 */
  name?: string;
  /** 当前页码，必须是正整数；省略时默认第 1 页。 */
  page?: number;
  /** 每页条数，必须是 1～100 的整数；省略时默认每页 10 条。 */
  pageSize?: number;
}

/** 航线分页查询结果，包含当前页摘要及筛选后的总条数。 */
export interface AirlineListResult {
  /** 当前页的航线摘要，不包含航点和备注；无匹配结果或超出末页时为空数组。 */
  list: AirlineListItem[];
  /** 筛选后的总条数，不是当前页的条数。 */
  total: number;
}

/** 工作区模式：create 新增、edit 编辑已有航线、view 只读查看。 */
export type AirlineEditorMode = "create" | "edit" | "view";
