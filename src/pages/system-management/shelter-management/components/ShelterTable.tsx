import {
  Space,
  Table,
  Tag,
  Button,
  Popconfirm,
  Form,
  Input,
  Select,
  Pagination,
} from "antd";
import type { TableProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  shelterFacilityText,
  shelterFacilityTypeOptions,
  shelterFacilityTypeText,
  shelterOperationStatusColor,
  shelterOperationStatusOptions,
  shelterOperationStatusText,
  shelterUsageOptions,
  shelterUsageText,
} from "../constants";
import type {
  ShelterFacility,
  ShelterRecord,
  ShelterQueryParams,
} from "../types";

interface ShelterTableProps {
  shelters: ShelterRecord[];
  loading: boolean;
  total: number;
  queryParams: ShelterQueryParams;
  onQuery: (values: Partial<ShelterQueryParams>) => void;
  onResetQuery: () => void;
  onPageChange: (page: number, pageSize: number) => void;
  onCreate: () => void;
  onDetail: (shelter: ShelterRecord) => void;
  onEdit: (shelter: ShelterRecord) => void;
  onDelete: (shelter: ShelterRecord) => void;
}

type SearchFormValues = Pick<
  ShelterQueryParams,
  | "name"
  | "facilityType"
  | "shelterUsage"
  | "operationStatus"
  | "managementUnit"
  | "address"
>;

export function ShelterTable({
  shelters,
  loading,
  total,
  queryParams,
  onQuery,
  onResetQuery,
  onPageChange,
  onCreate,
  onDetail,
  onEdit,
  onDelete,
}: ShelterTableProps) {
  const [form] = Form.useForm<SearchFormValues>();
  // 这个应该是放在里面还是外面呢，是否存在重复创建的问题
  const columns: TableProps<ShelterRecord>["columns"] = [
    {
      title: "避难场所名称",
      dataIndex: "name",
      width: 200,
    },
    {
      title: "场所形态",
      dataIndex: "facilityType",
      width: 120,
      render: (facilityType: ShelterRecord["facilityType"]) =>
        shelterFacilityTypeText[facilityType],
    },
    {
      title: "应急用途",
      dataIndex: "shelterUsage",
      width: 120,
      render: (shelterUsage: ShelterRecord["shelterUsage"]) =>
        shelterUsageText[shelterUsage],
    },
    {
      title: "运营状态",
      dataIndex: "operationStatus",
      width: 110,
      render: (operationStatus: ShelterRecord["operationStatus"]) => (
        <Tag color={shelterOperationStatusColor[operationStatus]}>
          {shelterOperationStatusText[operationStatus]}
        </Tag>
      ),
    },
    {
      title: "可用/总容量",
      key: "capacity",
      width: 120,
      render: (_, record) => `${record.availableCapacity}/${record.capacity}`,
    },
    {
      title: "设施能力",
      dataIndex: "facilities",
      width: 260,
      render: (facilities: ShelterFacility[]) => (
        <Space size={[0, 4]} wrap>
          {facilities.map((facility) => (
            <Tag key={facility}>{shelterFacilityText[facility]}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "详细地址",
      dataIndex: "address",
      width: 240,
      ellipsis: true,
    },
    {
      title: "管理单位",
      dataIndex: "managementUnit",
      width: 200,
      ellipsis: true,
    },
    {
      title: "联系人",
      key: "contact",
      width: 170,
      render: (_, record) => `${record.contactName} ${record.contactPhone}`,
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 180,
    },
    {
      title: "操作",
      key: "actions",
      fixed: "right",
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => onDetail(record)}>
            查看
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              onEdit(record);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除避难场所？"
            description={`删除后无法恢复：${record.name}`}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(record)}
          >
            <Button danger type="link" size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // useEffect(() => {
  //   form.setFieldsValue({
  //     name: query.name,
  //     facilityType: query.facilityType,
  //     shelterUsage: query.shelterUsage,
  //     operationStatus: query.operationStatus,
  //     managementUnit: query.managementUnit,
  //     address: query.address,
  //   });
  // }, [form, query]);

  const handleReset = () => {
    form.resetFields();
    onResetQuery();
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <Form<SearchFormValues>
        form={form}
        layout="inline"
        className="gap-y-3"
        onFinish={onQuery}
      >
        <Form.Item name="name" label="场所名称">
          <Input allowClear placeholder="请输入场所名称" />
        </Form.Item>
        <Form.Item name="facilityType" label="场所形态">
          <Select
            allowClear
            options={shelterFacilityTypeOptions}
            placeholder="请选择场所形态"
            className="min-w-32"
          />
        </Form.Item>
        <Form.Item name="shelterUsage" label="应急用途">
          <Select
            allowClear
            options={shelterUsageOptions}
            placeholder="请选择应急用途"
            className="min-w-32"
          />
        </Form.Item>
        <Form.Item name="operationStatus" label="运营状态">
          <Select
            allowClear
            options={shelterOperationStatusOptions}
            placeholder="请选择运营状态"
            className="min-w-32"
          />
        </Form.Item>
        <Form.Item name="managementUnit" label="管理单位">
          <Input allowClear placeholder="请输入管理单位" />
        </Form.Item>
        <Form.Item name="address" label="详细地址">
          <Input allowClear placeholder="请输入详细地址" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <div className="flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          新增避难场所
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={shelters}
        scroll={{ x: 1320 }}
        pagination={{ placement: ["none"] }}
      />
      <Pagination
        total={total}
        showSizeChanger
        showQuickJumper
        showTotal={(total) => `共 ${total} 条`}
        pageSizeOptions={[5, 10, 20]}
        current={queryParams.page}
        pageSize={queryParams.pageSize}
        onChange={onPageChange}
      />
    </div>
  );
}
