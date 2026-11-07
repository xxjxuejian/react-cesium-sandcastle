/** 前端输入上限与后端接口保持一致；后端仍独立校验，不能依赖页面限制。 */
export const maxAirlineNameLength = 100;
/** 备注最多 2000 个字符，省略时保存为空字符串。 */
export const maxAirlineRemarkLength = 2000;
/** 每条航线最多 1000 个航点；手动添加、地图添加和保存校验共用。 */
export const maxAirlineWaypoints = 1000;
