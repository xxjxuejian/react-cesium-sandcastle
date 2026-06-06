import { DatePicker, Empty, Pagination, Space } from "antd";

export default function Home() {
  return (
    <Space orientation="vertical" size="large">
      <DatePicker />
      <Empty />
      <Pagination total={85} showSizeChanger showQuickJumper />
    </Space>
  );
}
