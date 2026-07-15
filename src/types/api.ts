/** 后端接口统一响应结构。 */
export interface ApiResponse<T> {
  /** 业务状态码，0 表示成功。 */
  code: number;
  /** 本次请求的结果说明。 */
  message: string;
  /** 接口返回的业务数据。 */
  data: T;
}
