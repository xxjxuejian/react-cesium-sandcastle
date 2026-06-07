import type { ReactNode } from "react";
import { ConfigProvider, theme } from "antd";
import enUS from "antd/es/locale/en_US";
import zhCN from "antd/es/locale/zh_CN";
import "@/i18n";
import { useTranslation } from "react-i18next";

import type { AppLanguage } from "@/i18n";
import { useThemeMode } from "./ThemeProvider";

type AntdProviderProps = {
  children: ReactNode;
};

const antdLocales: Record<AppLanguage, typeof zhCN> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

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
