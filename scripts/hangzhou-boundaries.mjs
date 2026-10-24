/** 从同一套区县面派生市级外缘与区县共享边界，不使用独立市级面的坐标。 */

function positionKey(position) {
  return `${position[0]},${position[1]}`;
}

function edgeKey(startKey, endKey) {
  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
}

/** 把同一组无向线段接成长线；度数大于 2 表示边界拓扑有歧义。 */
function joinEdges(edges, description) {
  const adjacency = new Map();
  const positions = new Map();

  edges.forEach((edge, index) => {
    for (const [key, position] of [
      [edge.startKey, edge.start],
      [edge.endKey, edge.end],
    ]) {
      if (!adjacency.has(key)) adjacency.set(key, []);
      adjacency.get(key).push(index);
      positions.set(key, position);
    }
  });

  for (const [key, incidentEdges] of adjacency) {
    if (incidentEdges.length > 2) {
      throw new Error(`${description} 在 ${key} 处分叉，无法可靠拼接`);
    }
  }

  const visited = new Set();
  const lines = [];
  const endpoints = [...adjacency.keys()]
    .filter((key) => adjacency.get(key).length === 1)
    .sort();
  const starts = [...endpoints, ...[...adjacency.keys()].sort()];

  for (const start of starts) {
    if (adjacency.get(start).every((index) => visited.has(index))) continue;

    const line = [positions.get(start)];
    let current = start;
    while (true) {
      const nextIndex = adjacency
        .get(current)
        .find((index) => !visited.has(index));
      if (nextIndex === undefined) break;

      visited.add(nextIndex);
      const edge = edges[nextIndex];
      current = edge.startKey === current ? edge.endKey : edge.startKey;
      line.push(positions.get(current));
    }
    lines.push(line);
  }

  if (visited.size !== edges.length) {
    throw new Error(`${description} 有未拼接的线段`);
  }
  return lines;
}

export function deriveHangzhouBoundaries(features) {
  const districts = features.filter(
    (feature) => feature.properties.level === "district",
  );
  const segments = new Map();

  for (const feature of districts) {
    const adcode = feature.properties.adcode;
    for (const polygon of feature.geometry.coordinates) {
      for (const ring of polygon) {
        for (let index = 1; index < ring.length; index += 1) {
          const start = ring[index - 1];
          const end = ring[index];
          const startKey = positionKey(start);
          const endKey = positionKey(end);
          if (startKey === endKey) {
            throw new Error(`${adcode} 存在零长度边界线段`);
          }

          const key = edgeKey(startKey, endKey);
          const existing = segments.get(key);
          if (existing) {
            if (
              existing.owners.includes(adcode) ||
              existing.owners.length >= 2
            ) {
              throw new Error(`边界线段 ${key} 重复或被三个以上区县共用`);
            }
            existing.owners.push(adcode);
          } else {
            segments.set(key, {
              start,
              end,
              startKey,
              endKey,
              owners: [adcode],
            });
          }
        }
      }
    }
  }

  const outerEdges = [];
  const innerGroups = new Map();
  for (const edge of segments.values()) {
    if (edge.owners.length === 1) {
      outerEdges.push(edge);
    } else {
      const pair = [...edge.owners].sort((a, b) => a - b);
      const key = pair.join("-");
      if (!innerGroups.has(key)) innerGroups.set(key, { pair, edges: [] });
      innerGroups.get(key).edges.push(edge);
    }
  }

  const outerLines = joinEdges(outerEdges, "杭州市外缘");
  if (
    outerLines.length !== 1 ||
    positionKey(outerLines[0][0]) !== positionKey(outerLines[0].at(-1))
  ) {
    throw new Error("区县外缘未构成预期的单条闭合市界，请检查缝隙或飞地");
  }

  const boundaryFeatures = [
    {
      type: "Feature",
      id: "boundary-outer-330100",
      properties: { kind: "outer", cityAdcode: 330100 },
      geometry: { type: "MultiLineString", coordinates: outerLines },
    },
  ];

  for (const [key, { pair, edges }] of [...innerGroups].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    boundaryFeatures.push({
      type: "Feature",
      id: `boundary-inner-${key}`,
      properties: { kind: "inner", districtAdcodes: pair },
      geometry: {
        type: "MultiLineString",
        coordinates: joinEdges(edges, `区县界 ${key}`),
      },
    });
  }

  return { type: "FeatureCollection", features: boundaryFeatures };
}
