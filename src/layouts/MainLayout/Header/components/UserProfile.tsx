import { UserOutlined } from "@ant-design/icons";
import { Dropdown, Button } from "antd";
import type { MenuProps } from "antd";

const userItems: MenuProps["items"] = [
  {
    key: 1,
    label: "1",
  },
  {
    key: 2,
    label: "2",
  },
];

export function UserProfile() {
  return (
    <Dropdown
      menu={{
        items: userItems,
        selectable: true,
      }}
      trigger={["click"]}
      placement="bottom"
      arrow
    >
      <Button type="text" icon={<UserOutlined />}>
        admin
      </Button>
    </Dropdown>
  );
}
