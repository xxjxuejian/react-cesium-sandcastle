import { Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";

import type { UserFormInput, UserRecord } from "../types";

/** 用户新增和编辑弹窗，由列表页负责请求及保存状态。 */
interface UserFormModalProps {
  /** 是否显示弹窗。 */
  open: boolean;
  /** create 需要初始密码，edit 只修改资料。 */
  mode: "create" | "edit";
  /** 编辑记录，新增时为空。 */
  initialUser: UserRecord | null;
  /** 请求期间禁用重复保存。 */
  confirmLoading: boolean;
  /** 关闭弹窗并清理当前记录。 */
  onCancel: () => void;
  /** 提交校验通过的界面输入。 */
  onSubmit: (values: UserFormInput) => void;
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
  { label: "管理员", value: "admin" },
  { label: "普通用户", value: "viewer" },
];

const departmentOptions = [
  { label: "平台研发部", value: "平台研发部" },
  { label: "运营管理部", value: "运营管理部" },
  { label: "低空安全部", value: "低空安全部" },
  { label: "数据服务部", value: "数据服务部" },
];

const defaultFormValues: Partial<UserFormInput> = {
  status: "enabled",
  gender: "unknown",
  role: "viewer",
};

function getFormValues(initialUser: UserRecord | null) {
  if (!initialUser) return defaultFormValues;

  return {
    username: initialUser.username,
    nickname: initialUser.nickname,
    status: initialUser.status,
    gender: initialUser.gender,
    department: initialUser.department,
    role: initialUser.role,
    phone: initialUser.phone,
    email: initialUser.email,
  };
}

export function UserFormModal({
  open,
  mode,
  initialUser,
  confirmLoading,
  onCancel,
  onSubmit,
}: UserFormModalProps) {
  const [form] = Form.useForm<UserFormInput>();
  const title = mode === "create" ? "新增用户" : "编辑用户";

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    form.setFieldsValue(getFormValues(initialUser));
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
      cancelButtonProps={{ disabled: confirmLoading }}
      closable={!confirmLoading}
      mask={{ closable: !confirmLoading }}
      onCancel={handleCancel}
      onOk={() => form.submit()}
    >
      <Form<UserFormInput>
        name="user-profile"
        form={form}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, whitespace: true, message: "请输入用户名" },
            { max: 64, message: "最多 64 个字符" },
          ]}
        >
          <Input maxLength={64} autoComplete="off" placeholder="请输入用户名" />
        </Form.Item>
        <Form.Item
          name="nickname"
          label="昵称"
          rules={[
            { required: true, whitespace: true, message: "请输入昵称" },
            { max: 64, message: "最多 64 个字符" },
          ]}
        >
          <Input placeholder="请输入昵称" />
        </Form.Item>
        {mode === "create" && (
          <Form.Item
            name="password"
            label="初始密码"
            preserve={false}
            rules={[
              { required: true, message: "请输入初始密码" },
              { min: 15, max: 128, message: "密码长度须为 15～128 个字符" },
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              maxLength={128}
              placeholder="请输入 15～128 个字符的初始密码"
            />
          </Form.Item>
        )}
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
        <Form.Item name="department" label="部门">
          <Select
            allowClear
            options={departmentOptions}
            placeholder="请选择部门"
          />
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
          rules={[{ pattern: /^1\d{10}$/, message: "请输入 11 位手机号码" }]}
        >
          <Input placeholder="请输入手机号码" />
        </Form.Item>
        <Form.Item
          name="email"
          label="邮箱"
          rules={[{ type: "email", message: "请输入正确的邮箱地址" }]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
