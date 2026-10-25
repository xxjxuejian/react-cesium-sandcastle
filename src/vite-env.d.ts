/** Vite 提供的环境变量；本地 Key 保存在不提交 Git 的 .env.local 中。 */
interface ImportMetaEnv {
  /** Cesium ion 的访问令牌；省略时无法使用需要授权的 ion 资源。 */
  readonly VITE_CESIUM_ION_TOKEN?: string;
  /** 天地图服务的访问 Key；省略时天地图示例只显示配置提示。 */
  readonly VITE_TIANDITU_TOKEN?: string;
  /** 是否启用模拟接口；字符串 "true" 表示启用，省略时不启用。 */
  readonly VITE_USE_MOCK?: string;
}

/** 扩展模块元信息，让 TypeScript 能识别 Vite 环境变量。 */
interface ImportMeta {
  /** 当前启动模式加载的环境变量。 */
  readonly env: ImportMetaEnv;
}
