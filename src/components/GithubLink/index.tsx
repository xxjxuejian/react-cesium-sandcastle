import { GithubOutlined } from "@ant-design/icons";
import { Button } from "antd";

export function GithubLink() {
  return (
    <Button
      type="text"
      icon={<GithubOutlined />}
      className="hidden lg:inline-flex"
      href="https://github.com/xxjxuejian/react-cesium-sandcastle"
      target="_blank"
    />
  );
}
