# vite-plugin-mock 生产环境动态路由问题与解决方案

## 背景

避难场所管理页面新增详情弹窗后，开发环境工作正常，但生产构建中点击“查看”先后出现了以下问题：

1. 弹窗报错 `Cannot read properties of undefined (reading 'map')`。
2. 调整 mock 路由顺序后，弹窗持续加载，控制台报错 `Cannot read properties of undefined (reading 'split')`。

这两个现象都不是 `ShelterDetailModal` 的渲染逻辑导致的，根因是 `vite-plugin-mock@3.0.2` 的开发环境与生产环境采用了不同的 mock 请求处理链路。

## 请求链路差异

### 开发环境

开发环境由 Vite 插件 `viteMockServe` 处理请求。mock handler 可以正常获得完整请求信息，包括 `url`：

```ts
response: ({ url }) => {
  const id = url.split("/").at(-1);
}
```

### 生产环境

生产环境由 `src/mockProdServer.ts` 调用下面的方法注册浏览器端 MockJS 拦截器：

```ts
import { createProdMockServer } from "vite-plugin-mock/client";
```

`vite-plugin-mock@3.0.2` 的生产适配器会先读取完整 URL，再把请求转换后传给业务 mock handler。原始实现如下：

```ts
const { body, type, url, headers } = options;

result = handle({
  method: type,
  body: b,
  query: __param2Obj__(url),
  headers,
});
```

这里虽然读取了 `url`，但没有把它放入传给 `handle` 的对象。因此生产环境中的 `response: ({ url }) => ...` 最终收到的 `url` 是 `undefined`。

## 第一层问题：列表路由错误匹配详情请求

生产适配器使用下面的方式生成路由正则：

```ts
pathToRegexp(url, undefined, { end: false });
```

因为 `end: false` 允许前缀匹配，所以列表路由：

```text
/api/system-management/shelters
```

也可以匹配详情请求：

```text
/api/system-management/shelters/shelter-001
```

当列表 GET 路由先注册时，详情请求会错误获得列表响应：

```ts
{
  list: ShelterRecord[];
  total: number;
}
```

详情弹窗期望的是单个 `ShelterRecord`，因此读取 `shelter.facilities.map(...)` 时会出现 `.map()` 报错。

解决方式是让更具体的详情 GET 路由优先于列表 GET 路由注册：

```ts
export default [
  {
    url: "/api/system-management/shelters/:id",
    method: "get",
    // ...
  },
  {
    url: "/api/system-management/shelters",
    method: "get",
    // ...
  },
];
```

## 第二层问题：生产 handler 缺少 url

路由顺序修正后，详情路由可以被正确命中，但生产适配器没有向 handler 传递 `url`：

```ts
response: ({ url }) => {
  const id = getPathId(url);
}

function getPathId(url: string) {
  return url.split("/").at(-1) ?? "";
}
```

此时 `getPathId(undefined)` 会在 `.split()` 处抛出异常。异常发生在 MockJS 的响应生成阶段，Axios 请求无法正常完成，因此详情弹窗会一直保持加载状态。

该问题会影响所有依赖 `response({ url })` 提取动态路径 ID 的生产 mock，而不仅是详情接口。当前仓库中的避难场所更新、删除以及用户更新、删除接口都属于同一类情况。

## 最终解决方案

最终采用 pnpm 的依赖补丁能力，集中修复 `vite-plugin-mock@3.0.2`，避免每个业务接口重复增加查询参数 ID。

补丁文件位于：

```text
patches/vite-plugin-mock@3.0.2.patch
```

补丁同时修改生产包的 ESM 和 CJS 入口：

```text
dist/client.mjs
dist/client.cjs
```

修改内容如下：

```diff
 result = handle({
   method: type,
   body: b,
   query: __param2Obj__(url),
-  headers
+  headers,
+  url
 });
```

`pnpm-workspace.yaml` 中注册了该补丁：

```yaml
patchedDependencies:
  vite-plugin-mock@3.0.2: patches/vite-plugin-mock@3.0.2.patch
```

`pnpm-lock.yaml` 同时保存补丁路径与哈希。以后执行 `pnpm install` 时，pnpm 会自动把补丁应用到 `vite-plugin-mock@3.0.2`，不需要手动修改 `node_modules`。

## 为什么不采用逐接口查询参数方案

临时方案曾在详情请求中同时传递路径 ID 和查询参数 ID：

```ts
request.get(`/system-management/shelters/${id}`, {
  params: { id },
});
```

mock handler 再通过 `query.id` 查询记录。这个方案可以绕开生产适配器缺少 `url` 的问题，但存在以下缺点：

- 相同 ID 在路径和查询参数中重复传递。
- 每个动态详情、更新、删除接口都需要单独修改。
- mock 工具的兼容问题泄漏到了业务 API 契约中。
- 接入真实后端时可能产生没有业务意义的额外参数。

因此最终撤销了该临时方案，业务 API 保持原有 RESTful 路径，只在依赖适配层集中补回 `url`。

## 为什么组件可选链不是根本解决方案

给 `shelter.facilities.map(...)` 添加可选链只能避免页面立即崩溃，无法纠正详情接口实际返回列表对象的问题。同样，给 `location` 添加可选链可以提高展示组件的容错性，但不能代替接口契约修复。

这次处理遵循以下原则：

- 在 mock 请求边界修复错误数据来源。
- 保持详情弹窗为纯展示组件。
- 不让组件静默吞掉错误的接口响应结构。

## 涉及文件

- `patches/vite-plugin-mock@3.0.2.patch`：为生产 handler 补充 `url`。
- `pnpm-workspace.yaml`：注册 pnpm 依赖补丁。
- `pnpm-lock.yaml`：记录补丁路径、哈希和依赖快照。
- `mock/system-management/shelter.mock.ts`：保证详情 GET 路由优先于列表 GET 路由。
- `src/api/shelterManagement.ts`：继续使用原有 RESTful 详情路径，不再携带重复的 `params.id`。

## 验证方式

本次修改执行了以下验证：

```powershell
pnpm.cmd install --offline --frozen-lockfile
pnpm.cmd test
pnpm.cmd lint
pnpm.cmd build
```

验证结果：

- 冻结锁文件安装成功，补丁可以从仓库配置中重新应用。
- 测试全部通过。
- ESLint 检查通过。
- TypeScript 与 Vite 生产构建通过。
- 安装后的 `dist/client.mjs` 和 `dist/client.cjs` 均确认包含传递给 handler 的 `url`。

生产部署后还需要手动验证以下操作：

1. 点击避难场所“查看”，详情弹窗结束加载并展示完整设施列表。
2. 验证避难场所编辑和删除。
3. 验证用户编辑和删除。
4. 强制刷新浏览器或清理 CDN 缓存，确认页面未继续加载旧的哈希资源。

## 后续维护注意事项

- 升级 `vite-plugin-mock` 时，需要先检查新版本是否已经向生产 handler 传递 `url`。
- 如果上游版本已经修复，应删除本地补丁和 `patchedDependencies` 配置，再重新生成锁文件。
- 如果升级后补丁无法应用，不能直接忽略安装错误，需要根据新版本的 `dist/client.mjs` 和 `dist/client.cjs` 重新生成补丁。
- 新增同一 HTTP 方法下的集合路由和子路由时，应优先注册更具体的子路由，避免 `{ end: false }` 引起前缀误匹配。
