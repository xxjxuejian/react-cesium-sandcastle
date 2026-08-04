import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/store/auth";

export function UserProfile() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const userItems: MenuProps["items"] = [
    {
      key: "role",
      label: user?.role,
      disabled: true,
    },
    { type: "divider" },
    {
      key: "logout",
      label: t("header.logout"),
      icon: <LogoutOutlined />,
    },
  ];

  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "logout") {
      void logout();
    }
  };

  return (
    <Dropdown
      menu={{ items: userItems, onClick: onMenuClick }}
      trigger={["click"]}
      placement="bottomRight"
      arrow
    >
      <Button type="text" icon={<UserOutlined />}>
        {user?.nickname}
      </Button>
    </Dropdown>
  );
}
