import { useCallback, useEffect, useState } from "react";
import { message } from "antd";

import {
  createUser,
  deleteUser,
  getUserList,
  updateUser,
} from "@/api/userManagement";
import { UserFormModal } from "./components/UserFormModal";
import { UserTablePanel } from "./components/UserTablePanel";
import type { UserFormValues, UserQueryParams, UserRecord } from "./types";

const defaultQuery: UserQueryParams = {
  page: 1,
  pageSize: 10,
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<UserQueryParams>(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async (nextQuery: UserQueryParams) => {
    setLoading(true);

    try {
      const result = await getUserList(nextQuery);
      setUsers(result.list);
      setTotal(result.total);
    } catch {
      message.error("加载用户列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers(query);
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

      // 删除当前页最后一条数据后，自动返回上一页，
      // 避免停留在一个已经不存在的空白分页上。
      const nextPage =
        users.length === 1 && query.page > 1 ? query.page - 1 : query.page;

      setQuery((currentQuery) => ({
        ...currentQuery,
        page: nextPage,
      }));
    } catch {
      message.error("删除用户失败");
    }
  }

  async function handleSubmit(values: UserFormValues) {
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        await createUser(values);
      } else if (currentUser) {
        await updateUser(currentUser.id, values);
      }

      handleModalClose();
      setQuery((currentQuery) => ({
        ...currentQuery,
        page: modalMode === "create" ? 1 : currentQuery.page,
      }));
    } catch {
      message.error("保存用户失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
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
        onPageChange={handlePageChange}
      />
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
