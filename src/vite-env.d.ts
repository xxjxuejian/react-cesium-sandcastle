/** Vite 提供的环境变量；本地 Key 保存在不提交 Git 的 .env.local 中。 */
interface ImportMetaEnv {
  /** Cesium ion 的访问令牌；省略时无法使用需要授权的 ion 资源。 */
  readonly VITE_CESIUM_ION_TOKEN?: string;
  /** 天地图服务的访问 Key；省略时公共工具仅启用 OSM，天地图示例显示配置提示。 */
  readonly VITE_TIANDITU_TOKEN?: string;
  /** 开发代理目标，省略时使用 http://127.0.0.1:3000。 */
  readonly VITE_API_PROXY_TARGET?: string;
}

/** 扩展模块元信息，让 TypeScript 能识别 Vite 环境变量。 */
interface ImportMeta {
  /** 当前启动模式加载的环境变量。 */
  readonly env: ImportMetaEnv;
}
