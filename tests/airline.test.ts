import assert from "node:assert/strict";
import test from "node:test";
import { calculateAirlineLength } from "../src/utils/airline.js";

test("水平长度符合已知球面距离，不计高度差、不自动闭合，支持跨日期变更线", () => {
  const origin = { longitude: 0, latitude: 0, altitude: 0 };
  const east = { longitude: 1, latitude: 0, altitude: 999 };
  const north = { longitude: 1, latitude: 1, altitude: 60 };
  const oneDegree = (6371008.8 * Math.PI) / 180;
  assert.equal(calculateAirlineLength([]), 0);
  assert.equal(calculateAirlineLength([origin]), 0);
  assert.equal(
    calculateAirlineLength([origin, { ...origin, altitude: 80 }]),
    0,
  );
  assert.ok(
    Math.abs(calculateAirlineLength([origin, east, north]) - 2 * oneDegree) <
      0.001,
  );
  assert.ok(
    Math.abs(
      calculateAirlineLength([
        { ...origin, longitude: 179 },
        { ...origin, longitude: -179 },
      ]) -
        2 * oneDegree,
    ) < 0.001,
  );
  assert.ok(
    Math.abs(
      calculateAirlineLength([origin, { ...origin, longitude: 180 }]) -
        Math.PI * 6371008.8,
    ) < 0.001,
  );
});
