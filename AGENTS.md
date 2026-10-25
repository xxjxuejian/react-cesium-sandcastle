# Repository Guidelines

## 学习目标与代码可读性原则

本项目首先用于学习 React 和 Cesium。使用者目前处于两者的初学阶段，后续代码编写、修改和讲解都应以初学者能够读懂、跟随执行流程并独立修改为目标。

- **可读性放在第一位**：使用直观的命名、清晰的执行顺序和容易理解的写法。可以适当保留重复，避免为了代码简短、技巧性或形式上的复用增加理解成本。
- **避免过度封装**：页面专属逻辑优先留在页面内部，不为单次调用或尚未出现的复用需求增加包装函数、自定义 Hook、通用组件或抽象层。确实存在复用，或拆分明显有助于理解时，再进行提取。
- **封装前说明具体价值**：涉及组件拆分、Hook 提取或架构调整时，先结合当前代码解释它解决什么问题、带来什么收益，以及增加了哪些理解成本。
- **在完成功能的基础上保持必要的健壮性**：保留与功能相关的错误处理、异步保护和 Cesium 资源清理，并用注释说明它们解决的问题。
- **补充适合初学者的中文注释**：说明关键代码的目的、重要 API 的作用、React 生命周期与 Cesium 的配合、异步执行顺序，以及资源为何需要清理。注释应帮助理解原因和流程，避免只复述代码字面含义。
- **类型定义也要补充中文注释**：新增或修改 `interface`、`type` 等类型定义时，为类型本身和各字段补充中文 JSDoc 注释，说明业务含义、使用场景，以及必要的单位、取值范围和系统维护规则。可选字段应说明省略时的含义或默认行为，联合类型应说明各取值的含义。类型写法保持简单直观，避免为了复用引入复杂的泛型或类型推导。
- **结合实际代码讲解**：从真实入口、文件位置、调用关系和执行时机开始，解释状态变化如何影响 React 页面和 Cesium 场景，再引入相关概念。
- **统一使用中文说明**：默认使用中文回复；除代码、命令、API、库名和专业术语外，说明、注释和 Markdown 文档均使用中文。

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
