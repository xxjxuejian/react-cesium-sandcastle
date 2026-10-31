import assert from "node:assert/strict";
import test from "node:test";
import mocks from "../mock/system-management/keyUnit.mock.js";
import {
  hasValidKeyUnitCenter,
  validateKeyUnit,
} from "../src/utils/keyUnit.js";
import type {
  KeyUnitFormValues,
  KeyUnitListResult,
  KeyUnitRecord,
} from "../src/pages/system-management/key-unit-management/types.js";
import type { ApiResponse } from "../src/types/api.js";

const base = "/api/system-management/key-units";
function route(method: string, detail = false) {
  const found = mocks.find(
    (item) =>
      item.method === method && item.url === `${base}${detail ? "/:id" : ""}`,
  );
  assert.ok(found);
  return found;
}
function values(): KeyUnitFormValues {
  return {
    name: " 测试单位 ",
    longitude: 120.2,
    latitude: 30.25,
    address: "",
    remark: "",
    rings: {
      core: { radius: 300, minHeight: 20, maxHeight: 120 },
      counter: { radius: 800, minHeight: 10, maxHeight: 200 },
      warning: { radius: 1500, minHeight: 0, maxHeight: 300 },
    },
  };
}
function list(query = {}) {
  return route("get").response({
    url: base,
    query,
  }) as ApiResponse<KeyUnitListResult>;
}
function detail(id: string) {
  return route("get", true).response({
    url: `${base}/${id}?preview=true`,
  }) as ApiResponse<KeyUnitRecord>;
}
function create(body: unknown) {
  return route("post").response({
    url: base,
    body,
  }) as ApiResponse<KeyUnitRecord>;
}
function update(id: string, body: unknown) {
  return route("put", true).response({
    url: `${base}/${id}`,
    body,
  }) as ApiResponse<KeyUnitRecord>;
}
function remove(id: string) {
  return route("delete", true).response({
    url: `${base}/${id}`,
  }) as ApiResponse<boolean>;
}

test("空值不当成零坐标，合法零坐标和零高度可以使用", () => {
  assert.equal(hasValidKeyUnitCenter(null, 0), false);
  assert.equal(hasValidKeyUnitCenter(0, undefined), false);
  assert.equal(hasValidKeyUnitCenter(0, 0), true);
  const unit = values();
  unit.longitude = 0;
  unit.latitude = 0;
  unit.rings.core.minHeight = 0;
  unit.rings.counter.minHeight = 0;
  assert.equal(validateKeyUnit(unit), "");
});

test("半径递增和三维上下包含分别校验，允许公共高度边界", () => {
  const unit = values();
  unit.rings.core.radius = 800;
  assert.match(validateKeyUnit(unit), /核心圈半径必须小于反制圈/);
  unit.rings.core.radius = 300;
  unit.rings.core.minHeight = 0;
  assert.match(validateKeyUnit(unit), /核心圈最低高度不能低于反制圈/);
  unit.rings.core.minHeight = 20;
  unit.rings.core.maxHeight = 250;
  assert.match(validateKeyUnit(unit), /核心圈最高高度不能超过反制圈/);
  unit.rings.core.maxHeight = 200;
  unit.rings.core.minHeight = 10;
  assert.equal(validateKeyUnit(unit), "");
});

test("请求结构、缺失圈层、非法数值和空白名称均被拒绝", () => {
  for (const bad of [
    null,
    [],
    {},
    { ...values(), name: "  " },
    { ...values(), longitude: 181 },
    { ...values(), latitude: -91 },
    { ...values(), address: 3 },
    { ...values(), rings: [] },
    { ...values(), rings: { core: values().rings.core } },
  ])
    assert.notEqual(validateKeyUnit(bad), "");
  for (const field of ["radius", "minHeight", "maxHeight"] as const) {
    for (const bad of [null, undefined, NaN, Infinity, -1, "100"]) {
      const unit = structuredClone(values()) as unknown as {
        rings: { core: Record<string, unknown> };
      };
      unit.rings.core[field] = bad;
      assert.notEqual(
        validateKeyUnit(unit),
        "",
        `${field} 不应接受 ${String(bad)}`,
      );
    }
  }
  const sameHeight = values();
  sameHeight.rings.core.maxHeight = sameHeight.rings.core.minHeight;
  assert.notEqual(validateKeyUnit(sameHeight), "");
  const extraRing = {
    ...values(),
    rings: { ...values().rings, extra: values().rings.core },
  };
  assert.notEqual(validateKeyUnit(extraRing), "");
});

test("固定样例支持名称过滤、排序和分页，列表不暴露备注", () => {
  assert.equal(mocks[0].url, `${base}/:id`);
  assert.equal(list().data.total, 12);
  assert.equal(list().data.list.length, 10);
  assert.equal(list({ page: "2" }).data.list.length, 2);
  assert.equal(list({ name: " 市政府 " }).data.total, 1);
  assert.equal(list({ page: "100" }).data.list.length, 0);
  assert.equal(list().data.list[0].id, "key-unit-012");
  assert.equal("remark" in list().data.list[0], false);
});

test("非法分页和名称参数返回业务错误", () => {
  for (const query of [
    { page: "0" },
    { page: "1.5" },
    { page: "Infinity" },
    { pageSize: "0" },
    { pageSize: "101" },
    { name: 9 },
  ])
    assert.equal(list(query).code, 40004);
});

test("新增和详情保留零平面高度，忽略请求伪造的系统字段", () => {
  const input = values();
  const created = create({
    ...input,
    id: "fake",
    createdAt: "fake",
    updatedAt: "fake",
  });
  assert.equal(created.code, 0);
  try {
    assert.equal(created.data.name, "测试单位");
    assert.notEqual(created.data.id, "fake");
    assert.equal(created.data.createdAt, created.data.updatedAt);
    assert.deepEqual(created.data.rings, input.rings);
    input.rings.core.radius = 10;
    assert.equal(detail(created.data.id).data.rings.core.radius, 300);
    created.data.rings.core.maxHeight = 99;
    assert.equal(detail(created.data.id).data.rings.core.maxHeight, 120);
  } finally {
    remove(created.data.id);
  }
});

test("整体更新中心和范围，保留编号与创建时间，非法更新不写入", () => {
  const created = create(values()).data;
  try {
    const input = values();
    input.longitude = 121;
    input.rings.core.radius = 400;
    const result = update(created.id, input);
    assert.equal(result.code, 0);
    assert.equal(result.data.id, created.id);
    assert.equal(result.data.createdAt, created.createdAt);
    assert.equal(result.data.longitude, 121);
    assert.equal(result.data.rings.core.radius, 400);
    input.rings.warning.radius = 10;
    assert.equal(update(created.id, input).code, 40004);
    assert.equal(detail(created.id).data.rings.warning.radius, 1500);
  } finally {
    remove(created.id);
  }
});

test("返回记录为副本，修改列表不直接修改已保存单位", () => {
  const first = list().data.list[0];
  const previous = detail(first.id).data.rings.core.radius;
  first.rings.core.radius = 1;
  assert.equal(detail(first.id).data.rings.core.radius, previous);
});

test("缺失或非法新增不会改变记录数量", () => {
  const before = list().data.total;
  assert.equal(create(undefined).code, 40004);
  assert.equal(create({ ...values(), longitude: null }).code, 40004);
  assert.equal(list().data.total, before);
});

test("删除后详情、更新和重复删除均明确返回不存在", () => {
  const unit = create(values()).data;
  assert.equal(remove(unit.id).data, true);
  assert.equal(detail(unit.id).code, 40404);
  assert.equal(update(unit.id, values()).code, 40404);
  assert.equal(remove(unit.id).code, 40404);
});
