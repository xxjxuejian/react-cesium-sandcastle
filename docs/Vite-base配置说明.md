# Vite `base` 配置说明

本文结合当前项目的真实 GitHub Pages 地址、Vite 配置、React Router 和 CesiumJS 静态资源加载方式，说明 `vite.config.ts` 中 `base` 的作用、为什么必须正确配置，以及配置后会影响哪些内容。

## 结论

当前项目部署地址是：

```text
https://xxjxuejian.github.io/react-cesium-sandcastle/
```

这是一个 GitHub Pages **项目站点**，不是部署在域名根路径的个人站点。应用实际位于 `/react-cesium-sandcastle/` 子路径下，因此生产构建必须使用：

```ts
base: "/react-cesium-sandcastle/";
```

当前项目没有把仓库名称硬编码在 `vite.config.ts` 中。开发和生产环境文件显式配置 `VITE_BASE_PATH`，GitHub Actions 则根据仓库名称动态覆盖该变量，再由 Vite 配置统一读取。

## `base` 是什么

`base` 是应用在开发或生产环境中使用的**公共 URL 基础路径**。Vite 默认值是 `/`。

它回答的是下面这个问题：

> 浏览器加载当前应用的 JavaScript、CSS、图片和动态分包时，应当在这些资源地址前面添加什么路径？

假设构建产物中存在：

```text
dist/assets/index-abc123.js
```

不同的 `base` 会让浏览器使用不同的 URL：

| `base`                      | 生成的资源 URL                                    |
| --------------------------- | ------------------------------------------------- |
| `/`                         | `/assets/index-abc123.js`                         |
| `/react-cesium-sandcastle/` | `/react-cesium-sandcastle/assets/index-abc123.js` |

`base` 描述的是 URL 前缀，不是本地磁盘路径，也不会要求构建产物在 `dist` 中再创建一层同名目录。

## 为什么当前项目必须配置 `base`

GitHub Pages 常见的站点形式有两种。

### 个人站点

个人站点的仓库名称必须是：

```text
xxjxuejian.github.io
```

对应访问地址是：

```text
https://xxjxuejian.github.io/
```

应用部署在域名根路径 `/`，因此可以使用 Vite 默认配置：

```ts
base: "/";
```

### 项目站点

当前仓库名称是：

```text
react-cesium-sandcastle
```

对应的 GitHub Pages 地址是：

```text
https://xxjxuejian.github.io/react-cesium-sandcastle/
```

这个地址可以拆成：

```text
源站：https://xxjxuejian.github.io
项目公共路径：/react-cesium-sandcastle/
```

由于应用不是放在源站根路径，而是放在仓库名称对应的子路径中，所以必须让 Vite 为构建资源添加 `/react-cesium-sandcastle/` 前缀。

## 不配置或配置错误会发生什么

如果不配置 `base`，Vite 会使用默认值 `/`。构建后的 `index.html` 可能从下面的地址加载入口脚本：

```text
https://xxjxuejian.github.io/assets/index-abc123.js
```

但文件实际发布在：

```text
https://xxjxuejian.github.io/react-cesium-sandcastle/assets/index-abc123.js
```

因为请求地址少了 `/react-cesium-sandcastle/`，资源会返回 404。常见现象包括：

- 页面打开后白屏；
- JavaScript 或 CSS 请求返回 404；
- 页面样式丢失；
- 路由页面的动态分包加载失败；
- 图片、字体等资源无法显示；
- Cesium Worker、Assets、Widgets 或 ThirdParty 资源加载失败；
- 浏览器控制台出现 `Failed to fetch dynamically imported module` 等错误。

如果 `base` 中的仓库名称拼写错误，或者漏掉前导斜杠，效果与未正确配置相同：浏览器会向错误地址请求资源。

## 当前项目是如何配置的

### Vite 配置

当前 `vite.config.ts` 通过 `loadEnv()` 读取基础路径：

```ts
const basePath = env.VITE_BASE_PATH ?? "./";
```

优先级是：

1. GitHub Actions 等构建进程注入的 `VITE_BASE_PATH`；
2. 当前 Vite mode 对应环境文件中的 `VITE_BASE_PATH`；
3. 如果都没有配置，则回退到相对基础路径 `./`。

随后将结果交给 Vite：

```ts
return {
  base: basePath,
};
```

开发和生产环境文件都直接保存完整路径 `/react-cesium-sandcastle/`，因此配置文件不再额外补全斜杠。

### GitHub Actions 配置

`.github/workflows/deploy-pages.yml` 中设置了：

```yaml
env:
  VITE_BASE_PATH: /${{ github.event.repository.name }}/
```

当前仓库中，`${{ github.event.repository.name }}` 的值是：

```text
react-cesium-sandcastle
```

因此 GitHub Actions 执行 `pnpm build` 时，实际传给 Vite 的值是：

```text
/react-cesium-sandcastle/
```

这样不需要在 Vite 配置里重复写死仓库名称；仓库重命名后，工作流也会使用新的仓库名称。不过仓库重命名会改变 Pages 地址，还需要重新检查自定义域名、外部链接和 Cesium ion 的 URL 限制。

### 本地开发与生产部署的区别

本地开发从 `.env.development` 读取：

```text
/react-cesium-sandcastle/
```

因此开发页面通过下面的地址访问：

```text
http://localhost:5173/react-cesium-sandcastle/
```

本地生产构建从 `.env.production` 读取相同路径，GitHub Actions 构建时则动态注入：

```text
/react-cesium-sandcastle/
```

最终部署地址为：

```text
https://xxjxuejian.github.io/react-cesium-sandcastle/
```

因此开发、生产构建和 Pages 部署使用一致的项目子路径。

## 配置 `base` 后会影响什么

Vite 能够静态分析的资源地址会在构建阶段自动带上 `base`，主要包括：

- `index.html` 中由 Vite 处理的 `<script src>`、`<link href>` 等地址；
- JavaScript 或 TypeScript 中通过 `import` 引入的图片、字体等资源；
- CSS 中的 `url(...)`；
- 动态 `import()` 产生的路由分包和其他异步分包；
- Vite 生成的 JavaScript、CSS 和预加载资源地址；
- 构建时注入的 `import.meta.env.BASE_URL`。

例如，Pages 生产构建中的：

```ts
import.meta.env.BASE_URL;
```

会被静态替换为：

```text
/react-cesium-sandcastle/
```

需要动态拼接公共资源地址时，可以使用：

```ts
const configUrl = `${import.meta.env.BASE_URL}config.json`;
```

不要在这种场景中直接写：

```ts
const configUrl = "/config.json";
```

后者会请求域名根路径下的 `https://xxjxuejian.github.io/config.json`，而不是当前项目目录下的文件。

## `base` 不会自动处理什么

`base` 不是对所有字符串进行全局替换。下面这些内容通常不会自动添加 `base`：

- `fetch("/api/users")` 这类手写的绝对请求地址；
- 第三方库在运行时自行拼接的资源地址；
- Web Worker、WebAssembly 或配置文件中的动态 URL；
- React Router 的路由基础路径；
- Vite 开发服务器的 `server.proxy` 目标地址；
- Cesium ion Token 或其他环境变量；
- 服务端的路由回退、权限和跨域配置。

因此，不能把 `base` 当成 API 请求前缀。例如当前项目中的：

```ts
fetch("/api/users");
```

仍然会请求：

```text
https://xxjxuejian.github.io/api/users
```

它不会自动变成：

```text
https://xxjxuejian.github.io/react-cesium-sandcastle/api/users
```

另外，`vite.config.ts` 中的 `server.proxy` 只在本地 Vite 开发服务器中生效，部署到 GitHub Pages 后不存在 Vite 代理服务器。

## CesiumJS 为什么还需要 `CESIUM_BASE_URL`

当前项目使用 `vite-plugin-static-copy` 将 Cesium 的运行时资源复制到：

```text
dist/cesiumStatic/Workers/
dist/cesiumStatic/ThirdParty/
dist/cesiumStatic/Assets/
dist/cesiumStatic/Widgets/
```

`base` 不会把这些文件物理移动到：

```text
dist/react-cesium-sandcastle/cesiumStatic/
```

GitHub Pages 会把整个 `dist` 目录发布到 `/react-cesium-sandcastle/` URL 下，所以生产环境中的正确资源地址是：

```text
https://xxjxuejian.github.io/react-cesium-sandcastle/cesiumStatic/Workers/...
```

Cesium 在运行时自行创建 Worker 并拼接 Assets 等 URL，这些地址不是普通的 Vite 静态 `import`，Vite 无法全部自动改写。因此当前配置额外定义了：

```ts
define: {
  CESIUM_BASE_URL: JSON.stringify(
    `${basePath}${cesiumStaticDirectory}/`,
  ),
},
```

不同环境中的结果是：

| 环境         | `basePath`                  | `CESIUM_BASE_URL`                        |
| ------------ | --------------------------- | ---------------------------------------- |
| 本地开发     | `/react-cesium-sandcastle/` | `/react-cesium-sandcastle/cesiumStatic/` |
| GitHub Pages | `/react-cesium-sandcastle/` | `/react-cesium-sandcastle/cesiumStatic/` |

这里复用同一个 `basePath` 很重要。否则应用入口资源可以正常加载，但 Cesium 的 Worker、地形辅助资源或控件资源仍可能出现 404。

## `base` 与 React Router 的关系

当前项目使用：

```ts
createHashRouter(...)
```

页面地址类似：

```text
https://xxjxuejian.github.io/react-cesium-sandcastle/#/getting-started/hello-world
```

可以把它分成两部分：

```text
Vite 和 GitHub Pages 管理：/react-cesium-sandcastle/
React Router 管理：#/getting-started/hello-world
```

浏览器不会把 `#` 后面的内容发送给 GitHub Pages 服务器，因此刷新 Hash 路由时不依赖服务器提供 SPA 回退。当前项目通常不需要再为 React Router 配置 `/react-cesium-sandcastle/` 形式的 `basename`。

如果以后改成 `createBrowserRouter`，地址可能变成：

```text
https://xxjxuejian.github.io/react-cesium-sandcastle/getting-started/hello-world
```

此时除了 Vite `base`，还要处理 React Router 的 `basename`，并解决 GitHub Pages 对深层路径刷新返回 404 的问题。Vite 的 `base` 不能替代路由配置和服务器回退配置。

## 配置时的注意事项

### 1. 路径应与最终部署 URL 一致

当前项目应使用：

```text
/react-cesium-sandcastle/
```

用户名 `xxjxuejian` 属于域名部分，不应该写入 `base`：

```ts
// 错误示例
base: "/xxjxuejian/react-cesium-sandcastle/";
```

### 2. 建议保留前导和结尾斜杠

项目使用的是 URL 绝对路径形式，建议统一为：

```text
/react-cesium-sandcastle/
```

环境文件中的路径应直接包含前导和结尾斜杠，避免拼接 Cesium 资源地址时出现漏斜杠。

### 3. 环境变量是构建期配置

修改 `VITE_BASE_PATH` 后，需要重新启动开发服务器或重新执行构建。部署完成后再修改环境变量，不会改变已经生成的静态文件。

### 4. 不要把 `base` 与 `<base href>` 混为一谈

Vite 的 `base` 用于构建和开发期间生成、改写资源 URL。当前项目不需要在 `index.html` 中额外增加 `<base href>`；随意添加可能改变浏览器解析所有相对链接的方式。

### 5. 自定义域名可能改变配置

如果以后把项目部署到自定义域名根路径：

```text
https://cesium.example.com/
```

那么 `base` 应改回 `/`。此时 GitHub Actions 中根据仓库名称自动生成子路径的逻辑也需要同步调整。

### 6. 切换相对路径或 CDN 时需要同步验证 Cesium

Vite 还支持完整 URL，以及 `./`、空字符串等相对基础路径。当前环境文件使用 `/xxx/` 类型的绝对路径；如果切换为其他形式，必须同步验证 `CESIUM_BASE_URL` 的拼接结果。

如果以后需要 CDN：

```ts
base: "https://cdn.example.com/react-cesium-sandcastle/";
```

或者未知目录下的相对部署：

```ts
base: "./";
```

需要同步调整并验证 Cesium 资源地址策略，不能只修改 Vite `base`。

### 7. `public` 资源和手写 URL 需要单独检查

优先让 Vite 通过 `import`、HTML 或 CSS 管理静态资源。必须在运行时拼接 `public` 资源时，应使用 `import.meta.env.BASE_URL`，并避免以 `/` 开头的硬编码项目资源地址。

## 如何验证配置是否正确

### 本地构建

当前 `.env.production` 已配置 GitHub Pages 子路径，直接执行：

```powershell
pnpm.cmd build
```

然后检查 `dist/index.html`，入口资源地址应包含：

```text
/react-cesium-sandcastle/assets/
```

同时确认构建产物中存在：

```text
dist/cesiumStatic/Workers/
dist/cesiumStatic/Assets/
dist/cesiumStatic/ThirdParty/
dist/cesiumStatic/Widgets/
```

### 部署后检查

打开浏览器开发者工具的 Network 面板，重点确认：

1. 页面入口 JS 和 CSS 请求位于 `/react-cesium-sandcastle/assets/`；
2. 路由懒加载分包位于 `/react-cesium-sandcastle/assets/`；
3. Cesium Worker 和其他运行时资源位于 `/react-cesium-sandcastle/cesiumStatic/`；
4. 请求状态不是 404；
5. 刷新 Hash 路由页面仍能正常加载。

## 当前项目检查清单

- [x] 当前站点明确为 GitHub Pages 项目站点；
- [x] 生产地址包含 `/react-cesium-sandcastle/` 子路径；
- [x] GitHub Actions 根据仓库名称设置 `VITE_BASE_PATH`；
- [x] `vite.config.ts` 将 `basePath` 设置为 Vite `base`；
- [x] `CESIUM_BASE_URL` 复用相同的 `basePath`；
- [x] 开发和生产环境文件均配置 `/react-cesium-sandcastle/`；
- [x] 当前使用 Hash Router，不依赖 GitHub Pages 深层路由回退；
- [ ] 每次修改部署路径后重新执行生产构建并检查资源请求。

## 参考资料

- [Vite Shared Options：base](https://vite.dev/config/shared-options#base)
- [Vite 构建指南：Public Base Path](https://vite.dev/guide/build#public-base-path)
- [Vite 静态部署指南：GitHub Pages](https://vite.dev/guide/static-deploy#github-pages)
