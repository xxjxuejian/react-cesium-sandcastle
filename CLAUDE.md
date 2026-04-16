# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

一个 React + CesiumJS 的 sandcastle 风格示例项目，用于学习和展示 3D 地理空间可视化。使用 Vite 作为构建工具，配置了路径别名。

## 开发命令

```bash
pnpm dev        # 启动开发服务器
pnpm build      # TypeScript 检查 + Vite 构建
pnpm lint       # ESLint 检查
pnpm preview    # 预览生产构建
```

## 技术栈

- React 19 + TypeScript 5.9
- Vite 8 (bundler 模式，路径别名 `@/*` → `src/*`)
- Ant Design 6 (UI 组件库)
- React Router 7 (通过 glob 实现文件路由)
- Tailwind CSS 3.4

## 架构

### 路由系统

路由在 `src/config/menuConfig.tsx` 中以 AntD Menu 项的形式声明。实际路由表在 `src/router/index.tsx` 中通过以下方式自动生成：

1. `import.meta.glob("../pages/**/*.tsx")` - 懒加载所有页面组件
2. `generateRoutes()` - 递归函数，从菜单配置构建 `RouteObject[]`

**菜单项约定：**

```typescript
{
  key: string;          // 完整路径，如 "/getting-started/hello-world"
  component?: string;   // 相对于 src/pages 的路径（如 "getting-started/hello-world"）
  redirect?: string;    // 含有子菜单时，自动重定向的目标
  children?: MenuItem[];
}
```

新增页面时，在 `src/pages/<category>/<name>/index.tsx` 下创建文件，并在 `menuConfig` 中添加对应条目。

### 布局

`src/layouts/index.tsx` 提供主骨架，包含可折叠的 AntD Sider + Menu + Outlet（用于渲染页面内容）。

### 页面路径约定

组件通过 `lazyLoad()` 加载，会尝试两种路径：

- `../pages/${componentPath}.tsx`
- `../pages/${componentPath}/index.tsx`

因此 `component: "getting-started/hello-world"` 会映射到 `src/pages/getting-started/hello-world/index.tsx`。

## 关键文件

- `src/router/index.tsx` - 路由生成逻辑
- `src/config/menuConfig.tsx` - 导航菜单与路由元数据
- `src/layouts/index.tsx` - 主布局包装器
- `src/App.tsx` - 根组件，包含 RouterProvider

## TypeScript

已启用严格模式。路径别名在 `tsconfig.app.json` 中定义。目前暂无测试配置。

## 代码检查

忽略代码中的`console.log`和注释
