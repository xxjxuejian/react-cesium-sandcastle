import { PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { TableProps } from "antd";
import { useEffect } from "react";

import type { UserQueryParams, UserRecord, UserStatus } from "../types";

/** 用户列表及查询事件；所有写请求由页面处理。 */
interface UserTablePanelProps {
  /** 当前页记录。 */
  users: UserRecord[];
  /** 筛选后的总数。 */
  total: number;
  /** 列表是否正在加载。 */
  loading: boolean;
  /** 当前筛选及分页。 */
  query: UserQueryParams;
  /** 提交筛选。 */
  onSearch: (values: Partial<UserQueryParams>) => void;
  /** 重置筛选。 */
  onReset: () => void;
  /** 打开新增弹窗。 */
  onCreate: () => void;
  /** 打开编辑弹窗。 */
  onEdit: (user: UserRecord) => void;
  /** 删除指定用户。 */
  onDelete: (user: UserRecord) => void;
  /** 打开指定用户的密码重置弹窗。 */
  onResetPassword: (user: UserRecord) => void;
  /** 切换分页。 */
  onPageChange: (page: number, pageSize: number) => void;
}

type SearchFormValues = {
  username?: string;
  nickname?: string;
  status?: UserStatus;
  department?: string;
  phone?: string;
};

const statusOptions = [
  { label: "启用", value: "enabled" },
  { label: "停用", value: "disabled" },
];

const genderText = {
  male: "男",
  female: "女",
  unknown: "未知",
};

const statusTag = {
  enabled: { color: "success", text: "启用" },
  disabled: { color: "default", text: "停用" },
};

export function UserTablePanel({
  users,
  total,
  loading,
  query,
  onSearch,
  onReset,
  onCreate,
  onEdit,
  onDelete,
  onResetPassword,
  onPageChange,
}: UserTablePanelProps) {
  const [form] = Form.useForm<SearchFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      username: query.username,
      nickname: query.nickname,
      status: query.status,
      department: query.department,
      phone: query.phone,
    });
  }, [form, query]);

  const columns: TableProps<UserRecord>["columns"] = [
    {
      title: "用户名",
      dataIndex: "username",
      width: 120,
    },
    {
      title: "昵称",
      dataIndex: "nickname",
      width: 120,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (status: UserStatus) => {
        const tag = statusTag[status];

        return <Tag color={tag.color}>{tag.text}</Tag>;
      },
    },
    {
      title: "性别",
      dataIndex: "gender",
      width: 100,
      render: (gender: UserRecord["gender"]) => genderText[gender],
    },
    {
      title: "部门",
      dataIndex: "department",
      width: 140,
    },
    {
      title: "角色",
      dataIndex: "role",
      width: 140,
      render: (role: UserRecord["role"]) =>
        role === "admin" ? "管理员" : "普通用户",
    },
    {
      title: "手机号码",
      dataIndex: "phone",
      width: 140,
    },
    {
      title: "邮箱",
      dataIndex: "email",
      width: 180,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 180,
    },
    {
      title: "操作",
      key: "actions",
      fixed: "right",
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => onResetPassword(record)}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确认删除用户？"
            description={`删除后无法恢复：${record.username}`}
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

  function handleReset() {
    form.resetFields();
    onReset();
  }

  return (
    <Space className="w-full" orientation="vertical" size="middle">
      <Form<SearchFormValues>
        name="user-search"
        form={form}
        layout="inline"
        onFinish={onSearch}
        className="gap-y-3"
      >
        <Form.Item name="username" label="用户名">
          <Input allowClear placeholder="请输入用户名" />
        </Form.Item>
        <Form.Item name="nickname" label="昵称">
          <Input allowClear placeholder="请输入昵称" />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            allowClear
            options={statusOptions}
            placeholder="请选择状态"
            className="min-w-32"
          />
        </Form.Item>
        <Form.Item name="department" label="部门">
          <Input allowClear placeholder="请输入部门" />
        </Form.Item>
        <Form.Item name="phone" label="手机号码">
          <Input allowClear placeholder="请输入手机号码" />
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
          新增用户
        </Button>
      </div>

      <Table<UserRecord>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={users}
        scroll={{ x: 1320 }}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `共 ${count} 条`,
          onChange: onPageChange,
        }}
      />
    </Space>
  );
}
