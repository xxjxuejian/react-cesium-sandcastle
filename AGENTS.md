# Repository Guidelines

## 项目结构与模块组织

本仓库是基于 Vite 的 React + TypeScript 应用。入口文件位于 `src/main.tsx`，根组件在 `src/app/App.tsx`。页面放在 `src/pages/`，按功能路径拆分，例如 `getting-started/hello-world/`。通用组件放在 `src/components/`，布局放在 `src/layouts/`，路由相关逻辑放在 `src/router/`，菜单与静态配置放在 `src/config/`，国际化资源放在 `src/i18n/locales/`。静态资源可放在 `src/assets/` 或 `public/`；构建产物 `dist/` 不应手动修改或提交。

## 构建、测试与本地开发命令

本项目使用 `pnpm` 管理依赖：

- `pnpm install`：安装依赖并更新 `pnpm-lock.yaml`。
- `pnpm dev`：启动 Vite 本地开发服务，支持热更新。
- `pnpm build`：先执行 TypeScript 项目构建，再生成生产包。
- `pnpm lint`：运行 ESLint 检查 `ts` 与 `tsx` 文件。
- `pnpm preview`：预览最近一次 `pnpm build` 的产物。

## 编码风格与命名约定

优先使用 TypeScript、React 函数组件和显式类型。组件文件使用 PascalCase，例如 `LanguageSwitch.tsx`；页面目录使用短横线命名，例如 `resolution-scale/`；工具、配置和类型文件使用语义化小驼峰或领域名，例如 `routeModules.ts`、`types.ts`。样式优先沿用 Tailwind CSS 与现有布局方式。提交前运行 `pnpm lint`，格式化遵循 Prettier，并启用 `prettier-plugin-tailwindcss` 对 Tailwind class 排序。

## 测试指南

当前 `package.json` 尚未定义测试脚本。新增业务逻辑时，优先补充可自动化验证的测试，并在引入测试框架后添加 `pnpm test` 脚本。测试文件建议与被测模块相邻，命名为 `*.test.ts` 或 `*.test.tsx`。在测试体系补齐前，至少执行 `pnpm lint` 与 `pnpm build`，并手动验证关键页面、路由和语言切换。

## 提交与 Pull Request 规范

当前环境的 Git safe.directory 检查可能阻止读取完整提交历史，因此提交信息采用简洁的祈使句或常见前缀，例如 `feat: add route menu`、`fix: handle missing locale`。每个 PR 应包含变更摘要、验证命令结果、相关 issue 链接；涉及界面变更时附截图或录屏。避免把重构、格式化和功能改动混在同一个 PR 中。

## 配置与安全提示

不要提交本地密钥、私有令牌或机器相关配置。新增环境变量时提供 `.env.example` 说明名称和用途。修改路由、菜单或国际化文案时，同时检查 `src/router/`、`src/config/menu.ts` 与 `src/i18n/locales/` 是否保持一致。
