import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Switch, Tooltip } from "antd";

import { useThemeMode } from "@/app/providers/ThemeProvider";
import { useTranslation } from "react-i18next";

export function ThemeSwitch() {
  const { isDark, toggleMode } = useThemeMode();
  const { t } = useTranslation();

  return (
    <Tooltip title={t("header.switchTheme")}>
      <Switch
        checked={isDark}
        checkedChildren={<MoonOutlined />}
        unCheckedChildren={<SunOutlined />}
        onChange={toggleMode}
        aria-label={t("header.switchTheme")}
      />
    </Tooltip>
  );
}
