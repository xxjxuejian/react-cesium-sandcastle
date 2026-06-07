import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// 应用支持的主题模式，后续接入 antd theme.algorithm 时也会使用这个值。
export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  // 当前主题模式。
  mode: ThemeMode;
  // 方便组件直接判断是否为暗色主题，避免重复写 mode === "dark"。
  isDark: boolean;
  // 明确设置主题模式，适合下拉菜单、分段控制等场景。
  setMode: (mode: ThemeMode) => void;
  // 在亮色和暗色之间切换，适合 Header 里的 Switch 开关。
  toggleMode: () => void;
};

type ThemeProviderProps = {
  // 被 ThemeProvider 包裹的应用内容。
  children: ReactNode;
};

// localStorage 中保存主题模式的键名。
const THEME_STORAGE_KEY = "app-theme";

// 主题上下文。默认值为 null，用于在 hook 中判断是否缺少 Provider。
const ThemeContext = createContext<ThemeContextValue | null>(null);

// 判断字符串是否是合法主题模式，同时帮助 TypeScript 收窄类型。
function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

// 获取系统当前的深浅色偏好，作为用户未手动选择时的默认值。
function getSystemThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// 计算应用首次渲染时使用的主题模式。
function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  // 优先使用用户手动选择过的主题，其次跟随系统偏好。
  const storedThemeMode = localStorage.getItem(THEME_STORAGE_KEY);

  if (isThemeMode(storedThemeMode)) {
    return storedThemeMode;
  }

  return getSystemThemeMode();
}

// 提供全局主题状态，让 AntdProvider、Header 开关等组件共享同一份主题。
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(getInitialThemeMode);

  useEffect(() => {
    // 持久化用户选择，并同步到根节点，方便非 antd 样式读取主题状态。
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  // 提供给 Switch 使用的切换函数。
  const toggleMode = useCallback(() => {
    setMode((currentMode) => (currentMode === "dark" ? "light" : "dark"));
  }, []);

  // 缓存 Context value，避免 Provider 每次渲染都创建新对象。
  const value = useMemo(
    () => ({
      mode,
      isDark: mode === "dark",
      setMode,
      toggleMode,
    }),
    [mode, toggleMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// 读取主题上下文的业务 hook，调用方无需直接接触 ThemeContext。
// eslint-disable-next-line react-refresh/only-export-components
export function useThemeMode() {
  const context = useContext(ThemeContext);

  if (!context) {
    // 让错误尽早暴露：使用该 hook 的组件必须处于 ThemeProvider 内部。
    throw new Error("useThemeMode must be used within ThemeProvider");
  }

  return context;
}
