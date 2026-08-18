import { defineConfig, loadEnv, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { viteMockServe } from "vite-plugin-mock";
import { viteStaticCopy } from "vite-plugin-static-copy";

// Cesium npm 包中需要在运行时按 URL 加载的静态资源根目录。
// viteStaticCopy 的相对 src 会从 Vite root（本项目默认就是仓库根目录）解析；
// 当前配置改用基于 vite.config.ts 所在目录计算的绝对路径，避免启动命令位置影响查找结果。
const cesiumSourcePath = "node_modules/cesium/Build/Cesium";
// src 既可以是相对路径，也可以是绝对路径；Windows 下的 glob 路径需要统一使用 `/`，
// 因此在 path.resolve() 得到绝对路径后还要调用 Vite 的 normalizePath()。
const cesiumBuildPath = normalizePath(
  path.resolve(__dirname, cesiumSourcePath),
);
// 复制资源时需要剥离的源路径层级数，避免把 node_modules/cesium/Build/Cesium 一并输出。
const cesiumSourceBaseSegmentCount = cesiumSourcePath.split("/").length;
// viteStaticCopy 的 dest 是相对于 build.outDir 的文件系统路径，不是浏览器 URL。
// 本项目未修改 build.outDir（默认是 dist），因此该值最终对应 dist/cesiumStatic/。
// base 只改变浏览器访问它的 URL 前缀，不会在 dist 中额外创建仓库名称目录。
const cesiumStaticDirectory = "cesiumStatic";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // 读取当前 mode 对应的 .env 文件，只加载 VITE_ 前缀的变量。
  const env = loadEnv(mode, process.cwd());
  // Mock 服务需显式开启，并且只在 Vite 开发服务中注册。
  const enableMock = env.VITE_USE_MOCK === "true";
  // 环境文件和 CI/CD 均提供完整路径，未配置时使用相对基础路径。
  const basePath = env.VITE_BASE_PATH ?? "./";

  return {
    // 应用的公共 URL 基础路径：Vite 会据此改写入口脚本、CSS、静态 import 和动态分包 URL。
    // 它不会物理改变 dist 的目录结构，也不会自动设置 React Router 的 basename；
    // 当前项目使用 Hash Router，`#` 后面的前端路由与 Pages 项目子路径彼此独立。
    base: basePath,
    // 定义编译期常量，Cesium 使用它定位 Workers、Assets 等运行时静态资源。
    define: {
      CESIUM_BASE_URL: JSON.stringify(`${basePath}${cesiumStaticDirectory}/`),
    },
    plugins: [
      react(),
      // 将 Cesium 不能直接打包进 JavaScript 的运行时资源复制到公共目录。
      // 每个 src 是规范化的绝对文件系统路径；dest 使用相对路径，指向 dist/cesiumStatic/。
      // pnpm dev 时插件直接从源文件提供这些资源，pnpm build 时才实际复制到 build.outDir。
      viteStaticCopy({
        targets: [
          {
            src: `${cesiumBuildPath}/Workers`,
            dest: cesiumStaticDirectory,
            rename: { stripBase: cesiumSourceBaseSegmentCount },
          },
          {
            src: `${cesiumBuildPath}/ThirdParty`,
            dest: cesiumStaticDirectory,
            rename: { stripBase: cesiumSourceBaseSegmentCount },
          },
          {
            src: `${cesiumBuildPath}/Assets`,
            dest: cesiumStaticDirectory,
            rename: { stripBase: cesiumSourceBaseSegmentCount },
          },
          {
            src: `${cesiumBuildPath}/Widgets`,
            dest: cesiumStaticDirectory,
            rename: { stripBase: cesiumSourceBaseSegmentCount },
          },
        ],
      }),
      // 本地开发时按环境变量决定是否启用 mock 接口。
      viteMockServe({
        mockPath: "mock",
        enable: command === "serve" && enableMock,
        watchFiles: true,
        logger: true,
      }),
    ],
    resolve: {
      alias: {
        // 统一使用 @ 指向 src，减少业务代码中的多层相对路径。
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      // 开发服务器代理，仅在 pnpm dev 时生效。
      proxy: {
        "/api": {
          target: "https://sandcastle.cesium.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
