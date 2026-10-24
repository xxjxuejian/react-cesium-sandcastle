import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { deriveHangzhouBoundaries } from "./hangzhou-boundaries.mjs";

function district(adcode, coordinates) {
  return {
    properties: { level: "district", adcode },
    geometry: { type: "MultiPolygon", coordinates: [[coordinates]] },
  };
}

function segmentKey(start, end) {
  const first = start.join(",");
  const second = end.join(",");
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

function lineSegments(features) {
  const keys = [];
  for (const feature of features) {
    for (const line of feature.geometry.coordinates) {
      for (let index = 1; index < line.length; index += 1) {
        keys.push(segmentKey(line[index - 1], line[index]));
      }
    }
  }
  return keys.sort();
}

test("相邻区县的共享边只进入内部区界", () => {
  const features = [
    district(1, [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]),
    district(2, [
      [1, 0],
      [2, 0],
      [2, 1],
      [1, 1],
      [1, 0],
    ]),
  ];

  const result = deriveHangzhouBoundaries(features);
  assert.equal(result.features.length, 2);
  assert.equal(result.features[0].properties.kind, "outer");
  assert.equal(result.features[0].geometry.coordinates.length, 1);
  assert.deepEqual(
    result.features[0].geometry.coordinates[0][0],
    result.features[0].geometry.coordinates[0].at(-1),
  );
  assert.equal(result.features[0].geometry.coordinates[0].length, 7);
  assert.equal(result.features[1].properties.kind, "inner");
  assert.deepEqual(result.features[1].properties.districtAdcodes, [1, 2]);
  assert.equal(result.features[1].geometry.coordinates.length, 1);
  assert.deepEqual(result.features[1].geometry.coordinates[0], [
    [1, 0],
    [1, 1],
  ]);
});

test("杭州标准面的线段被外缘和内部区界恰好分配一次", () => {
  const polygonData = JSON.parse(
    readFileSync(
      new URL("../public/geojson/hangzhou.wgs84.geojson", import.meta.url),
    ),
  );
  const boundaryData = deriveHangzhouBoundaries(polygonData.features);
  const savedData = JSON.parse(
    readFileSync(
      new URL(
        "../public/geojson/hangzhou.boundaries.wgs84.geojson",
        import.meta.url,
      ),
    ),
  );
  assert.deepEqual(savedData, boundaryData);
  const outer = boundaryData.features.filter(
    (f) => f.properties.kind === "outer",
  );
  const inner = boundaryData.features.filter(
    (f) => f.properties.kind === "inner",
  );

  assert.equal(outer.length, 1);
  assert.equal(inner.length, 27);
  assert.equal(outer[0].geometry.coordinates[0].length - 1, 1667);
  assert.equal(
    inner.reduce(
      (count, feature) =>
        count +
        feature.geometry.coordinates.reduce(
          (sum, line) => sum + line.length - 1,
          0,
        ),
      0,
    ),
    1445,
  );

  const occurrences = new Map();
  for (const feature of polygonData.features.filter(
    (item) => item.properties.level === "district",
  )) {
    for (const polygon of feature.geometry.coordinates) {
      for (const ring of polygon) {
        for (let index = 1; index < ring.length; index += 1) {
          const key = segmentKey(ring[index - 1], ring[index]);
          occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
        }
      }
    }
  }
  assert.deepEqual(
    lineSegments(outer),
    [...occurrences]
      .filter(([, count]) => count === 1)
      .map(([key]) => key)
      .sort(),
  );
  assert.deepEqual(
    lineSegments(inner),
    [...occurrences]
      .filter(([, count]) => count === 2)
      .map(([key]) => key)
      .sort(),
  );
});
