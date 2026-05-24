import { TranslationOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { useTranslation } from "react-i18next";

type LanguageKey = "zh-CN" | "en-US";

const languageItems: MenuProps["items"] = [
  {
    key: "zh-CN",
    label: "中文",
  },
  {
    key: "en-US",
    label: "English",
  },
];

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();

  const onLanguageClick: MenuProps["onClick"] = ({ key }) => {
    const language = key as LanguageKey;

    i18n.changeLanguage(language);
    localStorage.setItem("language", language);
  };

  return (
    <Tooltip title={t("header.switchLanguage")}>
      <Dropdown
        menu={{
          items: languageItems,
          selectable: true,
          selectedKeys: [i18n.language],
          onClick: onLanguageClick,
        }}
        trigger={["click"]}
      >
        <Button
          type="text"
          icon={<TranslationOutlined />}
          aria-label={t("header.switchLanguage")}
        />
      </Dropdown>
    </Tooltip>
  );
}
