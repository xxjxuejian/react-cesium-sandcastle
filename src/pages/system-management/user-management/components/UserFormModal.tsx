import { Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";

import type { UserFormValues, UserRecord } from "../types";

interface UserFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialUser: UserRecord | null;
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: UserFormValues) => void;
}

const statusOptions = [
  { label: "启用", value: "enabled" },
  { label: "停用", value: "disabled" },
];

const genderOptions = [
  { label: "男", value: "male" },
  { label: "女", value: "female" },
  { label: "未知", value: "unknown" },
];

const roleOptions = [
  { label: "超级管理员", value: "超级管理员" },
  { label: "运营专员", value: "运营专员" },
  { label: "安全审核员", value: "安全审核员" },
  { label: "数据分析员", value: "数据分析员" },
];

const departmentOptions = [
  { label: "平台研发部", value: "平台研发部" },
  { label: "运营管理部", value: "运营管理部" },
  { label: "低空安全部", value: "低空安全部" },
  { label: "数据服务部", value: "数据服务部" },
];

const defaultFormValues: Partial<UserFormValues> = {
  status: "enabled",
  gender: "unknown",
};

export function UserFormModal({
  open,
  mode,
  initialUser,
  confirmLoading,
  onCancel,
  onSubmit,
}: UserFormModalProps) {
  const [form] = Form.useForm<UserFormValues>();
  const title = mode === "create" ? "新增用户" : "编辑用户";

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue(
      initialUser
        ? {
            username: initialUser.username,
            nickname: initialUser.nickname,
            status: initialUser.status,
            gender: initialUser.gender,
            department: initialUser.department,
            role: initialUser.role,
            phone: initialUser.phone,
            email: initialUser.email,
          }
        : defaultFormValues,
    );
  }, [form, initialUser, open]);

  function handleCancel() {
    form.resetFields();
    onCancel();
  }

  return (
    <Modal
      title={title}
      open={open}
      okText="保存"
      cancelText="取消"
      confirmLoading={confirmLoading}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form<UserFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={onSubmit}
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[{ required: true, message: "请输入用户名" }]}
        >
          <Input placeholder="请输入用户名" />
        </Form.Item>
        <Form.Item
          name="nickname"
          label="昵称"
          rules={[{ required: true, message: "请输入昵称" }]}
        >
          <Input placeholder="请输入昵称" />
        </Form.Item>
        <Form.Item
          name="status"
          label="状态"
          rules={[{ required: true, message: "请选择状态" }]}
        >
          <Select options={statusOptions} placeholder="请选择状态" />
        </Form.Item>
        <Form.Item
          name="gender"
          label="性别"
          rules={[{ required: true, message: "请选择性别" }]}
        >
          <Select options={genderOptions} placeholder="请选择性别" />
        </Form.Item>
        <Form.Item
          name="department"
          label="部门"
          rules={[{ required: true, message: "请选择部门" }]}
        >
          <Select options={departmentOptions} placeholder="请选择部门" />
        </Form.Item>
        <Form.Item
          name="role"
          label="角色"
          rules={[{ required: true, message: "请选择角色" }]}
        >
          <Select options={roleOptions} placeholder="请选择角色" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="手机号码"
          rules={[
            { required: true, message: "请输入手机号码" },
            { pattern: /^1\d{10}$/, message: "请输入 11 位手机号码" },
          ]}
        >
          <Input placeholder="请输入手机号码" />
        </Form.Item>
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: "请输入邮箱" },
            { type: "email", message: "请输入正确的邮箱地址" },
          ]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
