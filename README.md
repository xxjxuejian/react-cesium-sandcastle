# React + Cesium 学习项目

当前分支 `frontend_single` 只使用独立 Node.js 后端接口。运行时 Mock、模拟账号和本地模拟路由已经移除。

## 启动前后端

后端目录为同级的 `react-cesium-server/`。首次启动按后端 README 完成依赖安装、`pnpm db:migrate` 和管理员初始化，再运行：

```powershell
cd D:\Desktop\my-projects\react-cesium-server
pnpm dev
```

另开终端启动前端：

```powershell
cd D:\Desktop\my-projects\react-cesium-sandcastle
pnpm install
pnpm dev
```

打开 Vite 显示的地址，使用真实账号登录。`pnpm dev` 默认将 `/api` 代理到 `http://127.0.0.1:3000`；自定义端口时在前端 `.env.local` 设置 `VITE_API_PROXY_TARGET`。原 `pnpm dev:backend` 命令已经移除。

后端当前开放登录、用户、避难场所与航线管理，重点单位将在后续阶段开放。进度见 [后端阶段任务](docs/backend/后端分阶段实施任务.md)。

## 检查命令

- `pnpm lint`：检查 TypeScript 和 React 代码。
- `pnpm test`：检查请求处理、异步保护和空间业务规则；编译前清理旧测试产物。
- `node --test --test-force-exit tests/airlinePage.test.mjs tests/keyUnitPage.test.mjs tests/mapTools.test.mjs`：页面与地图工具回归；全部断言执行完毕后退出，避免本机 JSDOM 后台计时器持续等待。
- `pnpm build`：类型检查并构建生产前端。

页面测试中的 `tests/fixtures/` 只用于自动化测试，不向应用提供接口，也不参与生产打包。生产部署需要为同源 `/api` 配置反向代理；Vite 开发代理不能随静态文件部署。

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

## GitHub Pages 历史部署配置

当前工作流自动发布 main 分支。本分支依赖真实后端，单独发布到 Pages 不会自动具备 API 服务；正式部署方案在后端阶段 7 完成。

仓库的 Pages 工作流要求存在名为 `VITE_CESIUM_ION_TOKEN` 的 Actions Secret。工作流会在构建前检查该值，并通过现有 `VITE_BASE_PATH` 让 Cesium 静态资源从仓库子路径加载。

如需在 GitHub Pages 使用天地图，还需要配置可选的 `VITE_TIANDITU_TOKEN`：

1. 打开 GitHub 仓库，进入 **Settings → Secrets and variables → Actions**，选择 **Secrets → New repository secret**。
2. 名称填写 `VITE_TIANDITU_TOKEN`，值填写天地图 Key，保存为仓库级 Secret。不要将实际 Key 写入仓库文件。
3. 将包含当前工作流配置的代码推送到 `main`。工作流会将该 Secret 作为构建环境变量，完成后自动部署 Pages；之后更新 Secret 时，需要在 **Actions → Deploy GitHub Pages → Run workflow** 重新构建和部署。
4. 打开 Pages 中的“天地图基础测试”或“杭州示例 → 边界分层”，验证天地图底图及注记。没有配置天地图 Key 时，边界页仍可使用默认 OSM。

GitHub Secret 避免将 Key 直接写入仓库，但 `VITE_` 变量会在构建时进入浏览器代码；天地图请求的 URL 也会包含 Key，因此访问者可以查看它。请按天地图提供的能力限制 Key 的使用范围和配额，不要将它当作只能由服务器读取的私密凭据。
