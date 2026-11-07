import assert from "node:assert/strict";
import test from "node:test";
import {
  hasValidKeyUnitCenter,
  validateKeyUnit,
} from "../src/utils/keyUnit.js";
import type { KeyUnitFormValues } from "../src/pages/system-management/key-unit-management/types.js";
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
