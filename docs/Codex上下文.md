# Codex 项目上下文

## 项目定位

本项目是一个基于 Vite、React 和 TypeScript 的 Cesium Sandcastle 示例应用。

当前重点是搭建清晰的前端工程骨架，包括路由、菜单、主布局、国际化和示例页面组织方式。页面内容目前以示例占位为主，后续可以逐步接入 Cesium 相关能力。

## 技术栈

- React 19
- TypeScript
- Vite
- React Router 7
- Ant Design
- Tailwind CSS
- i18next / react-i18next
- pnpm

常用命令：

```bash
pnpm.cmd install
pnpm.cmd dev
pnpm.cmd build
pnpm.cmd lint
pnpm.cmd preview
```

## 启动链路

应用启动链路如下：

```txt
src/main.tsx
  -> src/app/App.tsx
    -> src/app/providers/AppProvider.tsx
      -> src/router/index.tsx
        -> src/layouts/MainLayout
          -> <Outlet />
```

`main.tsx` 只负责挂载 React 根节点和引入全局样式。

`App.tsx` 只负责进入应用级 Provider，不直接写路由、页面或业务逻辑。

`AppProvider.tsx` 是全局 Provider 聚合入口。当前主要接入 `I18nProvider` 和 `RouterProvider`。

## 目录职责

- `src/app`：应用外壳和全局 Provider 装配，不放具体业务页面。
- `src/router`：路由配置、路由转换、页面模块收集、菜单生成。
- `src/layouts`：页面布局。当前主布局在 `src/layouts/MainLayout`。
- `src/pages`：路由页面目录，页面入口约定为 `src/pages/**/index.tsx`。
- `src/i18n`：国际化初始化、语言包、语言类型、语言常量和工具函数。
- `src/components`：可复用组件，例如语言切换、全屏按钮。
- `src/config`：静态配置预留目录。
- `src/styles`：全局或主题样式。

## 路由与菜单

项目以 `src/router/mockRoutes.ts` 作为当前路由配置源。它同时驱动两条链路：

- 页面路由：`mockRoutes` 通过 `transformRoutes` 转换为 React Router 路由对象。
- 导航菜单：`mockRoutes` 通过 `createMenuItems` 转换为 Ant Design `Menu` 的 `items`。

页面组件路径由路由配置中的 `component` 字段决定：

```txt
component: "getting-started/hello-world"
  -> src/pages/getting-started/hello-world/index.tsx
```

新增路由时通常需要同步处理：

- 新增页面组件文件。
- 修改 `src/router/mockRoutes.ts`。
- 如果需要显示在菜单中，设置 `meta.showInMenu: true`。
- 如果使用新图标，在 `src/router/menu.tsx` 的 `iconMap` 中注册。
- 补充所有语言包中的 `titleKey` 文案。

## 布局状态

主布局由 `src/layouts/MainLayout/index.tsx` 统一组合：

- `Header`：顶部栏，放移动端菜单按钮、桌面端侧边栏折叠按钮、语言切换、全屏等入口。
- `Sidebar`：桌面端侧边栏菜单。
- `MobileDrawer`：移动端抽屉菜单。
- `Content`：页面内容区域。

当前布局状态优先放在 `MainLayout` 本地维护，不引入全局状态库：

- `mobileOpen`：控制移动端抽屉打开与关闭。
- `sidebarCollapsed`：控制桌面端侧边栏展开与收缩。

如果只是 `Header` 控制 `Sidebar`，优先使用 React 的状态提升方式：状态放在共同父组件 `MainLayout`，给 `Header` 传操作方法，给 `Sidebar` 传状态。

移动端抽屉和桌面端侧边栏折叠是两套独立交互。

## 国际化

国际化使用 `i18next` 和 `react-i18next`。

语言状态交给 i18next 管理，不额外放入 React 全局 store。

当前约定：

- 语言类型定义在 `src/i18n/types.ts`。
- 语言常量定义在 `src/i18n/constants.ts`。
- 默认语言读取逻辑定义在 `src/i18n/utils.ts`。
- 应用启动时从 `localStorage` 读取用户上次选择的语言。
- `LanguageSwitch` 负责调用 `i18n.changeLanguage` 并写入 `localStorage`。

组件中不要硬编码 `"language"` 这类存储 key，应从 `@/i18n` 导入统一常量。

路由菜单文案优先使用 `meta.titleKey`，并在语言包中维护实际文案。

推荐的 `titleKey` 结构：

```txt
menu.gettingStarted.title
menu.gettingStarted.helloWorld
menu.gettingStarted.resolutionScale
```

## 常见开发流程

新增普通页面：

1. 新增 `src/pages/xxx/index.tsx`。
2. 在 `src/router/mockRoutes.ts` 中新增路由配置。
3. 如果显示在菜单中，配置 `meta.titleKey`、`meta.showInMenu`、`meta.order`。
4. 在 `src/i18n/locales/zh-CN.ts` 和 `src/i18n/locales/en-US.ts` 中补充文案。
5. 执行 `pnpm.cmd build`，并手动验证路由跳转和菜单选中态。

新增带分组的页面：

1. 父级路由通常不配置 `component`，只配置 `children` 和 `redirect`。
2. 子路由的 `path` 使用相对路径，不要以 `/` 开头。
3. 父级菜单文案使用 `menu.xxx.title`。
4. 子级菜单文案使用 `menu.xxx.yyy`。

调整布局：

1. 先确认状态是否只在 `MainLayout` 内部协作。
2. 如果只是 Header、Sidebar、MobileDrawer 之间共享，优先放在 `MainLayout`。
3. 不要过早引入全局状态库。
4. 移动端优先沿用 Tailwind 响应式类和 Ant Design 抽屉。

## 当前注意事项

- `README.md` 仍以 Vite 模板说明为主，项目真实说明主要在 `docs/`。
- 修改路由、菜单或国际化文案时，需要同时检查 `src/router/mockRoutes.ts`、`src/router/menu.tsx` 和语言包。
- 页面模块由 `import.meta.glob("../pages/**/index.tsx")` 收集，页面入口文件名需要保持为 `index.tsx`。
- 当前项目没有测试脚本；改动后优先执行 `pnpm.cmd build`，必要时执行 `pnpm.cmd lint`。
- `pnpm.cmd lint` 可能暴露既有规则问题，处理任务时要区分本次改动和历史遗留问题。
- `dist/` 是构建产物，不应手动修改。
