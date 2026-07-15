import type {
  ShelterFormValues,
  ShelterQueryParams,
  ShelterRecord,
} from "./types";
import { useEffect, useState } from "react";
import { message } from "antd";
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
    if (listError) message.error("加载避难场所列表失败");
  }, [listError]);

  useEffect(() => {
    if (!detailError) return;

    setDetailOpen(false);
    message.error("加载避难场所详情失败");
  }, [detailError]);

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

      message.success("删除成功");
      if (nextPage !== queryParams.page) {
        setQueryParams((currentQuery) => ({
          ...currentQuery,
          page: nextPage,
        }));
      } else {
        refreshShelters();
      }
    } catch {
      message.error("删除避难场所失败");
    }
  }

  async function handleSubmit(values: ShelterFormValues) {
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        await createShelter(values);
        message.success("添加成功");
      } else {
        if (curShelter) {
          await updateShelter(curShelter.id, values);
          message.success("修改成功");
        }
      }

      handleModalClose();
      if (modalMode === "create" && queryParams.page !== 1) {
        setQueryParams((currentQuery) => ({ ...currentQuery, page: 1 }));
      } else {
        refreshShelters();
      }
    } catch {
      message.error("保存避难场所失败");
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
