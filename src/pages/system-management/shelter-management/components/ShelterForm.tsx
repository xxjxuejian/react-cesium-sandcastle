import { Button, Drawer, Form, Input, InputNumber, Select, Space } from "antd";
import { useEffect } from "react";

import {
  shelterFacilityOptions,
  shelterFacilityTypeOptions,
  shelterOperationStatusOptions,
  shelterUsageOptions,
} from "../constants";
import type { ShelterFormValues, ShelterRecord } from "../types";

/** 避难场所新增和编辑抽屉的属性。 */
interface ShelterFormProps {
  open: boolean;
  mode: "create" | "edit";
  initialShelter: ShelterRecord | null;
  confirmLoading: boolean;
  onSubmit: (values: ShelterFormValues) => void;
  onCancel: () => void;
}

/** 新增避难场所时预置的表单字段。 */
const defaultFormValues: Partial<ShelterFormValues> = {
  operationStatus: "open",
  facilities: [],
};

/** 将列表记录转换为可编辑的表单字段。 */
function getFormValues(
  mode: ShelterFormProps["mode"],
  initialShelter: ShelterRecord | null,
): Partial<ShelterFormValues> {
  if (mode === "create" || !initialShelter) return defaultFormValues;

  return {
    name: initialShelter.name,
    facilityType: initialShelter.facilityType,
    shelterUsage: initialShelter.shelterUsage,
    operationStatus: initialShelter.operationStatus,
    capacity: initialShelter.capacity,
    availableCapacity: initialShelter.availableCapacity,
    facilities: initialShelter.facilities,
    address: initialShelter.address,
    location: initialShelter.location,
    managementUnit: initialShelter.managementUnit,
    contactName: initialShelter.contactName,
    contactPhone: initialShelter.contactPhone,
    description: initialShelter.description,
  };
}

/** 展示并提交避难场所的新增或编辑表单。 */
export function ShelterForm({
  open,
  mode,
  initialShelter,
  confirmLoading,
  onCancel,
  onSubmit,
}: ShelterFormProps) {
  const [form] = Form.useForm<ShelterFormValues>();
  const title = mode === "create" ? "新增避难场所" : "编辑避难场所";

  // Drawer 每次打开或切换模式、记录时，都用当前上下文重新初始化表单。
  useEffect(() => {
    if (!open) return;

    form.resetFields();
    form.setFieldsValue(getFormValues(mode, initialShelter));
  }, [form, initialShelter, mode, open]);

  function handleClose() {
    // 请求提交期间禁止关闭，避免旧请求完成后影响随后打开的表单。
    if (confirmLoading) return;

    form.resetFields();
    onCancel();
  }

  return (
    <Drawer
      title={title}
      open={open}
      size={760}
      destroyOnHidden
      closable={!confirmLoading}
      maskClosable={!confirmLoading}
      keyboard={!confirmLoading}
      onClose={handleClose}
      footer={
        <Space className="flex justify-end">
          <Button disabled={confirmLoading} onClick={handleClose}>
            取消
          </Button>
          <Button
            type="primary"
            loading={confirmLoading}
            onClick={() => form.submit()}
          >
            保存
          </Button>
        </Space>
      }
    >
      <Form<ShelterFormValues>
        form={form}
        layout="vertical"
        requiredMark="optional"
        onFinish={onSubmit}
      >
        <section>
          <h3 className="mb-4 text-base font-medium">基础信息</h3>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item
              name="name"
              label="场所名称"
              rules={[{ required: true, message: "请输入场所名称" }]}
            >
              <Input placeholder="请输入场所名称" />
            </Form.Item>
            <Form.Item
              name="facilityType"
              label="场所形态"
              rules={[{ required: true, message: "请选择场所形态" }]}
            >
              <Select
                options={shelterFacilityTypeOptions}
                placeholder="请选择场所形态"
              />
            </Form.Item>
            <Form.Item
              name="shelterUsage"
              label="应急用途"
              rules={[{ required: true, message: "请选择应急用途" }]}
            >
              <Select
                options={shelterUsageOptions}
                placeholder="请选择应急用途"
              />
            </Form.Item>
            <Form.Item
              name="operationStatus"
              label="运营状态"
              rules={[{ required: true, message: "请选择运营状态" }]}
            >
              <Select
                options={shelterOperationStatusOptions}
                placeholder="请选择运营状态"
              />
            </Form.Item>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-base font-medium">容量与设施</h3>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item
              name="capacity"
              label="总容量"
              rules={[{ required: true, message: "请输入总容量" }]}
            >
              <InputNumber
                className="w-full"
                min={0}
                precision={0}
                placeholder="请输入总容量"
              />
            </Form.Item>
            <Form.Item
              name="availableCapacity"
              label="可用容量"
              dependencies={["capacity"]}
              rules={[
                { required: true, message: "请输入可用容量" },
                ({ getFieldValue }) => ({
                  /** 保证可用容量不会超过当前填写的总容量。 */
                  validator(_, value: number | null | undefined) {
                    const capacity = getFieldValue("capacity") as
                      | number
                      | null
                      | undefined;

                    if (
                      value == null ||
                      capacity == null ||
                      value <= capacity
                    ) {
                      return Promise.resolve();
                    }

                    return Promise.reject(
                      new Error("可用容量不能大于总容量"),
                    );
                  },
                }),
              ]}
            >
              <InputNumber
                className="w-full"
                min={0}
                precision={0}
                placeholder="请输入可用容量"
              />
            </Form.Item>
          </div>
          <Form.Item
            name="facilities"
            label="设施能力"
            rules={[{ required: true, message: "请选择设施能力" }]}
          >
            <Select
              allowClear
              mode="multiple"
              options={shelterFacilityOptions}
              placeholder="请选择设施能力"
            />
          </Form.Item>
        </section>

        <section>
          <h3 className="mb-4 text-base font-medium">位置</h3>
          <Form.Item
            name="address"
            label="详细地址"
            rules={[{ required: true, message: "请输入详细地址" }]}
          >
            <Input placeholder="请输入详细地址" />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
            <Form.Item
              name={["location", "longitude"]}
              label="经度"
              rules={[
                { required: true, message: "请输入经度" },
                {
                  type: "number",
                  min: -180,
                  max: 180,
                  message: "经度范围应为 -180 到 180",
                },
              ]}
            >
              <InputNumber
                className="w-full"
                min={-180}
                max={180}
                precision={6}
                placeholder="请输入经度"
              />
            </Form.Item>
            <Form.Item
              name={["location", "latitude"]}
              label="纬度"
              rules={[
                { required: true, message: "请输入纬度" },
                {
                  type: "number",
                  min: -90,
                  max: 90,
                  message: "纬度范围应为 -90 到 90",
                },
              ]}
            >
              <InputNumber
                className="w-full"
                min={-90}
                max={90}
                precision={6}
                placeholder="请输入纬度"
              />
            </Form.Item>
            <Form.Item name={["location", "height"]} label="高度（米）">
              <InputNumber className="w-full" placeholder="请输入高度" />
            </Form.Item>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-base font-medium">责任信息</h3>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item
              name="managementUnit"
              label="管理单位"
              rules={[{ required: true, message: "请输入管理单位" }]}
            >
              <Input placeholder="请输入管理单位" />
            </Form.Item>
            <Form.Item
              name="contactName"
              label="联系人"
              rules={[{ required: true, message: "请输入联系人" }]}
            >
              <Input placeholder="请输入联系人" />
            </Form.Item>
            <Form.Item
              name="contactPhone"
              label="联系电话"
              rules={[
                { required: true, message: "请输入联系电话" },
                { pattern: /^1\d{10}$/, message: "请输入 11 位手机号码" },
              ]}
            >
              <Input placeholder="请输入联系电话" />
            </Form.Item>
          </div>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={4} placeholder="请输入备注" />
          </Form.Item>
        </section>
      </Form>
    </Drawer>
  );
}
