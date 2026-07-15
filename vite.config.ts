import { type ConfigEnv, type UserConfig, defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { viteMockServe } from "vite-plugin-mock";

// https://vite.dev/config/
export default defineConfig(({ command, mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, process.cwd());
  const enableMock = env.VITE_USE_MOCK === "true";

  return {
    base: process.env.VITE_BASE_PATH ?? "/",
    plugins: [
      react(),
      viteMockServe({
        mockPath: "mock",
        enable: command === "serve" && enableMock,
        watchFiles: true,
        logger: true,
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      // 配置代理,只有在开发模式，dev下才生效。
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
