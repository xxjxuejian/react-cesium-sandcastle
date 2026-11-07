import { useCallback, useEffect, useState } from "react";
import { Alert, Form, Input, Modal, message } from "antd";

import {
  createUser,
  deleteUser,
  getUserList,
  updateUser,
  resetUserPassword,
} from "@/api/userManagement";
import { UserFormModal } from "./components/UserFormModal";
import { UserTablePanel } from "./components/UserTablePanel";
import type { UserFormInput, UserQueryParams, UserRecord } from "./types";
import { useAuthStore } from "@/store/auth";
import { usesMockApi } from "@/auth/token";
import { isRequestCanceled } from "@/utils/request";

const defaultQuery: UserQueryParams = {
  page: 1,
  pageSize: 10,
};

export default function UserManagement() {
  const [messageApi, messageContext] = message.useMessage();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<UserQueryParams>(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordForm] = Form.useForm<{ password: string }>();

  const fetchUsers = useCallback(
    async (nextQuery: UserQueryParams, signal: AbortSignal) => {
      setLoading(true);

      try {
        const result = await getUserList(nextQuery, signal);
        if (signal.aborted) return;
        setUsers(result.list);
        setTotal(result.total);
      } catch (error) {
        if (!signal.aborted && !isRequestCanceled(error))
          messageApi.error(
            error instanceof Error ? error.message : "加载用户列表失败",
          );
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [messageApi],
  );

  useEffect(() => {
    // 切换筛选或卸载页面时取消旧请求，避免旧列表覆盖新列表。
    const controller = new AbortController();
    void fetchUsers(query, controller.signal);
    return () => controller.abort();
  }, [fetchUsers, query]);

  function handleSearch(values: Partial<UserQueryParams>) {
    setQuery((currentQuery) => ({
      ...currentQuery,
      ...values,
      page: 1,
    }));
  }

  function handleReset() {
    setQuery(defaultQuery);
  }

  function handlePageChange(page: number, pageSize: number) {
    setQuery((currentQuery) => ({
      ...currentQuery,
      page,
      pageSize,
    }));
  }

  function handleCreate() {
    setCurrentUser(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function handleEdit(user: UserRecord) {
    setCurrentUser(user);
    setModalMode("edit");
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setCurrentUser(null);
  }

  async function handleDelete(user: UserRecord) {
    try {
      await deleteUser(user.id);
      if (!usesMockApi && useAuthStore.getState().user?.id === user.id) {
        await useAuthStore.getState().restoreSession();
        return;
      }

      // 删除当前页最后一条数据后，自动返回上一页，
      // 避免停留在一个已经不存在的空白分页上。
      const nextPage =
        users.length === 1 && query.page > 1 ? query.page - 1 : query.page;

      setQuery((currentQuery) => ({
        ...currentQuery,
        page: nextPage,
      }));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "删除用户失败");
    }
  }

  async function handleSubmit(values: UserFormInput) {
    if (submitting) return;
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        await createUser({ ...values, password: values.password ?? "" });
      } else if (currentUser) {
        // 资料编辑不提交密码，避免把两条业务流程混在一起。
        const { password: _password, ...profile } = values;
        void _password;
        await updateUser(currentUser.id, profile);
        if (
          !usesMockApi &&
          useAuthStore.getState().user?.id === currentUser.id
        ) {
          await useAuthStore.getState().restoreSession();
        }
      }

      handleModalClose();
      setQuery((currentQuery) => ({
        ...currentQuery,
        page: modalMode === "create" ? 1 : currentQuery.page,
      }));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "保存用户失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword({ password }: { password: string }) {
    if (!passwordUser || resettingPassword) return;
    setResettingPassword(true);
    try {
      await resetUserPassword(passwordUser.id, password);
      passwordForm.resetFields();
      setPasswordUser(null);
      messageApi.success(
        usesMockApi
          ? "模拟重置成功，不会修改登录账号"
          : "密码已重置，该用户需重新登录",
      );
      // 修改自己的密码后，成功响应本身是 200；主动恢复会话才能立即发现旧凭证失效。
      if (
        !usesMockApi &&
        useAuthStore.getState().user?.id === passwordUser.id
      ) {
        await useAuthStore.getState().restoreSession();
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "重置密码失败");
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <>
      {messageContext}
      {usesMockApi && (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          title="当前为 Mock 模式：新增、停用和重置密码仅模拟列表操作，不影响登录账号。真实账号验收请使用 pnpm dev:backend。"
        />
      )}
      <UserTablePanel
        users={users}
        total={total}
        loading={loading}
        query={query}
        onSearch={handleSearch}
        onReset={handleReset}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onResetPassword={(user) => {
          passwordForm.resetFields();
          setPasswordUser(user);
        }}
        onPageChange={handlePageChange}
      />
      <Modal
        title={`重置密码：${passwordUser?.username ?? ""}`}
        open={passwordUser !== null}
        confirmLoading={resettingPassword}
        okText="重置密码"
        cancelText="取消"
        closable={!resettingPassword}
        mask={{ closable: !resettingPassword }}
        cancelButtonProps={{ disabled: resettingPassword }}
        onCancel={() => {
          passwordForm.resetFields();
          setPasswordUser(null);
        }}
        onOk={() => passwordForm.submit()}
      >
        <p className="mb-4">
          重置后，该用户的所有会话都会失效。请将新密码交给用户。
        </p>
        <Form
          name="user-password"
          form={passwordForm}
          layout="vertical"
          onFinish={handleResetPassword}
        >
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 15, max: 128, message: "密码长度须为 15～128 个字符" },
            ]}
          >
            <Input.Password autoComplete="new-password" maxLength={128} />
          </Form.Item>
        </Form>
      </Modal>
      <UserFormModal
        open={modalOpen}
        mode={modalMode}
        initialUser={currentUser}
        confirmLoading={submitting}
        onCancel={handleModalClose}
        onSubmit={handleSubmit}
      />
    </>
  );
}
