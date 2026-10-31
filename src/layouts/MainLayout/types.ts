/** 页面进入地图工作区时使用的布局控制；退出后应恢复进入前的状态。 */
export interface MainLayoutControls {
  /** 当前桌面侧栏是否折叠。 */
  sidebarCollapsed: boolean;
  /** 设置侧栏折叠，不影响移动端抽屉。 */
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** 是否压缩内容区外围留白。 */
  compactContent: boolean;
  /** 设置地图工作区的紧凑布局。 */
  setCompactContent: (compact: boolean) => void;
}
