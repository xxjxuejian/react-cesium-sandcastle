import type {
  ShelterFormValues,
  ShelterQueryParams,
  ShelterRecord,
} from "./types";
import { useEffect, useState } from "react";
import { Alert, Button, message } from "antd";
import { ShelterTable } from "./components/ShelterTable";
import { ShelterForm } from "./components/ShelterForm";
import { ShelterDetailModal } from "./components/ShelterDetailModal";
import { useShelterDetail } from "./hooks/useShelterDetail";
import { useShelterList } from "./hooks/useShelterList";
import {
  createShelter,
  updateShelter,
  deleteShelter,
} from "@/api/shelterManagement";

const defaultQueryParams: ShelterQueryParams = {
  page: 1,
  pageSize: 5,
};

export default function ShelterManagement() {
  const [messageApi, messageContext] = message.useMessage();
  const [queryParams, setQueryParams] =
    useState<ShelterQueryParams>(defaultQueryParams);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [curShelter, setCurShelter] = useState<ShelterRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const {
    shelters,
    total,
    loading,
    error: listError,
    refreshShelters,
  } = useShelterList(queryParams);
  const {
    shelter: detailShelter,
    loading: detailLoading,
    error: detailError,
    loadDetail,
    clearDetail,
  } = useShelterDetail();

  useEffect(() => {
    if (listError)
      messageApi.error(
        listError instanceof Error ? listError.message : "加载避难场所列表失败",
      );
  }, [listError, messageApi]);

  useEffect(() => {
    if (!detailError) return;

    setDetailOpen(false);
    messageApi.error(
      detailError instanceof Error
        ? detailError.message
        : "加载避难场所详情失败",
    );
  }, [detailError, messageApi]);

  function handleQuery(values: Partial<ShelterQueryParams>) {
    setQueryParams((currentQuery) => ({
      ...currentQuery,
      ...values,
      page: 1,
    }));
  }

  function handleResetQuery() {
    setQueryParams(defaultQueryParams);
  }

  function handlePageChange(page: number, pageSize: number) {
    setQueryParams((currentQuery) => ({
      ...currentQuery,
      page,
      pageSize,
    }));
  }

  function handleCreate() {
    setCurShelter(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function handleEdit(shelter: ShelterRecord) {
    setCurShelter(shelter);
    setModalMode("edit");
    setModalOpen(true);
  }

  async function handleDelete(shelter: ShelterRecord) {
    try {
      await deleteShelter(shelter.id);

      const nextPage =
        shelters.length === 1 && queryParams.page > 1
          ? queryParams.page - 1
          : queryParams.page;

      messageApi.success("删除成功");
      if (nextPage !== queryParams.page) {
        setQueryParams((currentQuery) => ({
          ...currentQuery,
          page: nextPage,
        }));
      } else {
        refreshShelters();
      }
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "删除避难场所失败",
      );
    }
  }

  async function handleSubmit(values: ShelterFormValues) {
    if (submitting) return;
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        await createShelter(values);
        messageApi.success("添加成功");
      } else {
        if (curShelter) {
          await updateShelter(curShelter.id, values);
          messageApi.success("修改成功");
        }
      }

      handleModalClose();
      if (modalMode === "create" && queryParams.page !== 1) {
        setQueryParams((currentQuery) => ({ ...currentQuery, page: 1 }));
      } else {
        refreshShelters();
      }
    } catch (error) {
      // 保留抽屉与输入，用户可以依据后端的字段错误修正后重新保存。
      messageApi.error(
        error instanceof Error ? error.message : "保存避难场所失败",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleDetail(shelter: ShelterRecord) {
    setDetailOpen(true);
    void loadDetail(shelter.id);
  }

  function handleDetailClose() {
    setDetailOpen(false);
    clearDetail();
  }

  function handleModalClose() {
    setModalOpen(false);
    setCurShelter(null);
  }

  return (
    <>
      {messageContext}
      {listError !== null && (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          title={
            listError instanceof Error
              ? listError.message
              : "加载避难场所列表失败"
          }
          action={
            <Button size="small" onClick={refreshShelters}>
              重试
            </Button>
          }
        />
      )}
      <ShelterTable
        shelters={shelters}
        loading={loading}
        total={total}
        queryParams={queryParams}
        onQuery={handleQuery}
        onResetQuery={handleResetQuery}
        onPageChange={handlePageChange}
        onCreate={handleCreate}
        onDetail={handleDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ShelterForm
        open={modalOpen}
        mode={modalMode}
        confirmLoading={submitting}
        initialShelter={curShelter}
        onCancel={handleModalClose}
        onSubmit={handleSubmit}
      />
      <ShelterDetailModal
        open={detailOpen}
        loading={detailLoading}
        shelter={detailShelter}
        onCancel={handleDetailClose}
      />
    </>
  );
}
