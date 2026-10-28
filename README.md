# React + TypeScript + Vite

## CesiumJS 本地配置

项目使用原生 CesiumJS，并由 Vite 在开发和构建阶段提供 `Workers`、`ThirdParty`、`Assets`、`Widgets` 静态资源。

本地开发要求 Node.js 22 或更高版本、pnpm 10。安装依赖后，在项目根目录创建不会提交到 Git 的 `.env.local`：

```dotenv
VITE_CESIUM_ION_TOKEN=your_cesium_ion_token
```

然后启动项目：

```powershell
pnpm.cmd dev
```

登录后访问 `/#/getting-started/hello-world`，可检查 Cesium ion 全球影像和 World Terrain 是否正常加载。

`VITE_` 环境变量会进入浏览器产物，因此 Cesium ion Token 并不是真正的服务端密钥。开发和生产应使用不同 Token；生产 Token 只授予场景所需的 `assets:read` 权限，并在 Cesium ion 后台限制允许访问的资产和 GitHub Pages URL。

## GitHub Pages 配置

仓库的 Pages 工作流要求存在名为 `VITE_CESIUM_ION_TOKEN` 的 Actions Secret。工作流会在构建前检查该值，并通过现有 `VITE_BASE_PATH` 让 Cesium 静态资源从仓库子路径加载。

如需在 GitHub Pages 使用天地图，还需要配置可选的 `VITE_TIANDITU_TOKEN`：

1. 打开 GitHub 仓库，进入 **Settings → Secrets and variables → Actions**，选择 **Secrets → New repository secret**。
2. 名称填写 `VITE_TIANDITU_TOKEN`，值填写天地图 Key，保存为仓库级 Secret。不要将实际 Key 写入仓库文件。
3. 将包含当前工作流配置的代码推送到 `main`。工作流会将该 Secret 作为构建环境变量，完成后自动部署 Pages；之后更新 Secret 时，需要在 **Actions → Deploy GitHub Pages → Run workflow** 重新构建和部署。
4. 打开 Pages 中的“天地图基础测试”或“杭州示例 → 边界分层”，验证天地图底图及注记。没有配置天地图 Key 时，边界页仍可使用默认 OSM。

GitHub Secret 避免将 Key 直接写入仓库，但 `VITE_` 变量会在构建时进入浏览器代码；天地图请求的 URL 也会包含 Key，因此访问者可以查看它。请按天地图提供的能力限制 Key 的使用范围和配额，不要将它当作只能由服务器读取的私密凭据。

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
