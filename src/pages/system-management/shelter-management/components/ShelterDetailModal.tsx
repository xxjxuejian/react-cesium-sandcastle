import { Descriptions, Modal, Space, Spin, Tag } from "antd";

import {
  shelterFacilityText,
  shelterFacilityTypeText,
  shelterOperationStatusColor,
  shelterOperationStatusText,
  shelterUsageText,
} from "../constants";
import type { ShelterRecord } from "../types";

/** 避难场所详情弹窗属性。 */
interface ShelterDetailModalProps {
  open: boolean;
  loading: boolean;
  shelter: ShelterRecord | null;
  onCancel: () => void;
}

/** 计算当前已使用容量占总容量的比例。 */
function getOccupancyRate({ capacity, availableCapacity }: ShelterRecord) {
  if (capacity === 0) return "0%";

  return `${Math.round(((capacity - availableCapacity) / capacity) * 100)}%`;
}

/** 展示避难场所的只读详情。 */
export function ShelterDetailModal({
  open,
  loading,
  shelter,
  onCancel,
}: ShelterDetailModalProps) {
  return (
    <Modal
      title="避难场所详情"
      open={open}
      footer={null}
      width={820}
      destroyOnHidden
      onCancel={onCancel}
    >
      <Spin spinning={loading}>
        {shelter ? (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="场所名称" span={2}>
              {shelter.name}
            </Descriptions.Item>
            <Descriptions.Item label="场所形态">
              {shelterFacilityTypeText[shelter.facilityType]}
            </Descriptions.Item>
            <Descriptions.Item label="应急用途">
              {shelterUsageText[shelter.shelterUsage]}
            </Descriptions.Item>
            <Descriptions.Item label="运营状态">
              <Tag color={shelterOperationStatusColor[shelter.operationStatus]}>
                {shelterOperationStatusText[shelter.operationStatus]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="容量情况">
              {`${shelter.availableCapacity}/${shelter.capacity}`}
            </Descriptions.Item>
            <Descriptions.Item label="使用率">
              {getOccupancyRate(shelter)}
            </Descriptions.Item>
            <Descriptions.Item label="详细地址" span={2}>
              {shelter.address}
            </Descriptions.Item>
            <Descriptions.Item label="经纬度" span={2}>
              {`${shelter.location?.longitude}, ${shelter.location?.latitude}`}
            </Descriptions.Item>
            <Descriptions.Item label="高度">
              {shelter.location?.height ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="管理单位">
              {shelter.managementUnit}
            </Descriptions.Item>
            <Descriptions.Item label="联系人">
              {shelter.contactName}
            </Descriptions.Item>
            <Descriptions.Item label="联系电话">
              {shelter.contactPhone}
            </Descriptions.Item>
            <Descriptions.Item label="设施能力" span={2}>
              <Space size={[0, 4]} wrap>
                {shelter.facilities.map((facility) => (
                  <Tag key={facility}>{shelterFacilityText[facility]}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="备注说明" span={2}>
              {shelter.description || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {shelter.createdAt}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {shelter.updatedAt}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Spin>
    </Modal>
  );
}
