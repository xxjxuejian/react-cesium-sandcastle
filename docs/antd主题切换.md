# antd 主题切换实现总结

本文档总结在当前 React + TypeScript + antd 项目中实现亮色/暗色主题切换的思路、实现步骤，以及实现过程中需要特别注意的问题。

## 一、实现思路

使用 antd 组件库时，主题切换的核心不应该是手动给每个组件改样式，而应该把主题状态交给全局管理，再通过 antd 的 `ConfigProvider` 统一注入主题配置。

整体可以拆成三层：

- `ThemeProvider`：管理当前主题状态，例如 `light` / `dark`，并提供切换方法。
- `AntdProvider`：读取当前主题状态，把它转换成 antd 的 `theme.algorithm` 配置。
- `ThemeSwitch`：放在页面 Header 右侧，只负责展示开关和触发切换。

这样设计的好处是职责清晰：

- Header 不需要知道 antd 主题算法怎么配置。
- antd 组件不需要单独关心主题状态。
- 后续如果增加其他主题入口，例如设置页、快捷键、系统主题跟随模式，也可以复用同一份全局状态。

主题切换的最终数据流是：

```txt
用户点击 ThemeSwitch
  -> 调用 ThemeProvider 中的 toggleMode
  -> 更新全局主题 mode
  -> AntdProvider 读取新 mode
  -> ConfigProvider 切换 defaultAlgorithm / darkAlgorithm
  -> antd 组件和使用 token 的布局样式自动更新
```

## 二、实现步骤

### 1. 用 ThemeProvider 管理全局主题状态

`ThemeProvider` 使用 React Context 保存主题状态，并导出 `useThemeMode` 供其他组件读取。

当前主题状态包含：

- `mode`：当前主题模式，类型为 `"light" | "dark"`。
- `isDark`：是否为暗色主题，方便组件直接判断。
- `setMode`：显式设置主题。
- `toggleMode`：在亮色和暗色之间切换。

实现时同时处理了两个持久化和同步需求：

- 通过 `localStorage` 保存用户选择，刷新页面后仍然保持主题。
- 通过 `document.documentElement.dataset.theme` 和 `colorScheme` 同步根节点状态，方便原生控件和非 antd 样式响应主题。

核心逻辑：

```tsx
const [mode, setMode] = useState<ThemeMode>(getInitialThemeMode);

useEffect(() => {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}, [mode]);
```

首次主题值的优先级是：

```txt
localStorage 中用户选择过的主题
  -> 系统 prefers-color-scheme 偏好
  -> light
```

### 2. 在 AppProvider 中接入 ThemeProvider

`ThemeProvider` 必须包在 `AntdProvider` 外层，因为 `AntdProvider` 需要通过 `useThemeMode()` 读取当前主题。

Provider 顺序：

```tsx
export function AppProvider() {
  return (
    <ThemeProvider>
      <AntdProvider>
        <RouterProvider router={router} />
      </AntdProvider>
    </ThemeProvider>
  );
}
```

如果顺序反过来，`AntdProvider` 调用 `useThemeMode()` 时会找不到 `ThemeProvider`，从而抛出错误。

### 3. 在 AntdProvider 中配置 antd 主题算法

antd 的主题切换主要通过 `ConfigProvider` 的 `theme` 属性完成。

当前实现中：

- 亮色主题使用 `theme.defaultAlgorithm`。
- 暗色主题使用 `theme.darkAlgorithm`。
- 国际化 `locale` 和主题 `theme` 都集中在同一个 `ConfigProvider` 中。

核心逻辑：

```tsx
const { darkAlgorithm, defaultAlgorithm } = theme;

export function AntdProvider({ children }: AntdProviderProps) {
  const { i18n } = useTranslation();
  const { isDark } = useThemeMode();
  const locale = antdLocales[i18n.language as AppLanguage] ?? zhCN;

  return (
    <ConfigProvider
      locale={locale}
      theme={{
        algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
```

这个位置是 antd 主题切换的关键入口。不要在 Header 或普通页面组件里直接配置 antd 主题，否则主题逻辑会分散。

### 4. 新增 ThemeSwitch 作为切换入口

`ThemeSwitch` 放在 `src/components/ThemeSwitch/index.tsx`，使用 antd 的 `Switch` 组件实现。

它只做两件事：

- 根据 `isDark` 显示当前开关状态。
- 点击时调用 `toggleMode`。

核心逻辑：

```tsx
export function ThemeSwitch() {
  const { isDark, toggleMode } = useThemeMode();

  return (
    <Tooltip title="切换主题">
      <Switch
        checked={isDark}
        checkedChildren={<MoonOutlined />}
        unCheckedChildren={<SunOutlined />}
        onChange={toggleMode}
        aria-label="切换主题"
      />
    </Tooltip>
  );
}
```

这个组件是用户交互入口，不负责主题算法、不负责持久化，也不直接操作 DOM。

### 5. 把 ThemeSwitch 放入 Header 右侧

Header 右侧本来已经有语言切换、全屏、用户入口，主题切换也属于全局工具，因此放在同一区域。

示例顺序：

```tsx
<ThemeSwitch />
<LanguageSwitch />
<FullScreen />
<UserProfile />
```

这样用户可以在任何页面都访问主题切换能力。

### 6. 用 antd token 替换固定背景色

只切换 antd 组件主题还不够。如果页面布局中仍然写死 Tailwind 固定颜色，例如：

```tsx
bg-white
bg-slate-50
bg-red-100
```

暗色主题下就会出现 antd 组件变暗，但 Header 或内容容器仍然是亮色块的问题。

因此 Header 和 Content 这类布局区域使用 antd token：

```tsx
const { token } = theme.useToken();

style={{ background: token.colorBgContainer }}
```

内容区可以使用：

```tsx
style={{ background: token.colorBgLayout }}
```

这样布局背景会随着 `ConfigProvider` 的主题算法一起变化。

## 三、重要问题

### 1. 为什么需要 React Context

主题状态会被多个远距离组件使用：

- Header 的 `ThemeSwitch` 需要读取并切换主题。
- `AntdProvider` 需要读取主题并配置 antd。
- 未来其他组件也可能需要根据主题调整局部样式。

如果不用 Context，就只能从顶层组件一层层通过 props 往下传，维护成本会很高。

Context 的作用是提供一份应用级共享状态，让下层组件通过 `useThemeMode()` 直接读取。

### 2. Provider 顺序很重要

当前顺序必须是：

```tsx
<ThemeProvider>
  <AntdProvider>
    <RouterProvider router={router} />
  </AntdProvider>
</ThemeProvider>
```

原因是 `AntdProvider` 内部调用了 `useThemeMode()`。它必须处于 `ThemeProvider` 的子树内。

### 3. antd 组件优先走 ConfigProvider

antd 官方推荐通过 `ConfigProvider` 配置全局主题。不要为了切换主题去手动覆盖每个 antd 组件的 CSS。

推荐方式：

```tsx
theme={{
  algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
}}
```

如果后续需要品牌色，也应该放在同一个 `theme` 配置里：

```tsx
theme={{
  algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
  token: {
    colorPrimary: "#1677ff",
  },
}}
```

### 4. 固定色会破坏暗色主题

Tailwind 固定色不会自动跟随 antd 主题变化，例如 `bg-white` 在暗色模式下仍然是白色。

处理原则：

- antd 组件颜色交给 `ConfigProvider`。
- 布局容器背景优先使用 antd token。
- 少量自定义样式可以通过 `data-theme` 或 CSS 变量控制。

### 5. localStorage 只保存用户选择

主题持久化保存的是用户选择的结果，不是系统偏好。

当前逻辑是：

- 用户没有选过主题时，首次进入跟随系统偏好。
- 用户切换过主题后，以用户选择为准。
- 刷新页面时继续使用用户选择。

这是多数后台系统和工具类应用更稳定的体验。

### 6. colorScheme 的作用

`document.documentElement.style.colorScheme = mode` 可以让浏览器内置 UI 更接近当前主题，例如表单控件、滚动条、日期输入等原生表现。

它不能替代 antd 的 `ConfigProvider`，但可以作为主题切换的辅助同步。

### 7. Fast Refresh 规则

当前 `ThemeProvider.tsx` 同时导出了组件 `ThemeProvider` 和 hook `useThemeMode`。这会触发 `react-refresh/only-export-components` 规则，因此文件中对 `useThemeMode` 的导出加了局部 ESLint 例外。

如果后续希望完全避免这个例外，可以把 Context 和 hook 拆到单独文件，例如：

```txt
src/app/providers/themeContext.ts
src/app/providers/ThemeProvider.tsx
```

当前为了保持结构简单，暂时保留单文件实现。

## 四、最终效果

完成后，用户点击 Header 右侧的主题开关时：

- `ThemeProvider` 更新全局主题状态。
- 主题值写入 `localStorage`。
- 根节点同步 `data-theme` 和 `color-scheme`。
- `AntdProvider` 切换 antd 主题算法。
- antd 组件、Header、Content 等使用 token 的区域同步更新。

这套实现的重点是：状态集中、配置集中、入口轻量。后续扩展主题色、品牌色、紧凑模式或跟随系统模式时，都可以继续沿着这条结构扩展。
