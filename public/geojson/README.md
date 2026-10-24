# 杭州行政区边界数据

- `rawData/hangzhou.geojson`：用户从 [阿里云 DataV GeoAtlas](https://geo.datav.aliyun.com/areas_v3/bound/330100_full.json) 下载的 13 个区县原始文件，保持不变。文件没有坐标系声明。依据 [DataV 地图数据格式说明](https://help.aliyun.com/zh/datav/datav-7-0/user-guide/map-data-format-1)，这里将原始坐标**推定**为 GCJ-02；该文档没有逐一标注此 URL 的坐标系。
- `rawData/zhejiang.geojson`：新加入的浙江省各市原始文件，保持不变；脚本只提取其中 `adcode=330100` 的杭州市要素。该文件未声明坐标系，来源、下载日期和授权条件尚待记录。其市界与区县原始边界在坐标数值上基本贴合，因此暂按相同的 GCJ-02 假设转换；这不是独立的坐标系证明。
- `hangzhou.wgs84.geojson`：运行 `node scripts/convert-hangzhou-gcj02-to-wgs84.mjs` 后生成的项目标准面数据，含 1 个市级要素和 13 个区县要素。脚本转换所有边界顶点，将 `Polygon` 统一为 `MultiPolygon`，并按下表生成字段；两个原始文件均不参与覆盖写入。
- `hangzhou.boundaries.wgs84.geojson`：同一命令从上述 **13 个区县面** 派生的边界线数据，不采用独立市级面的坐标。它包含 1 个全市外缘要素和 27 个相邻区县对的内部区界要素，由 `/hangzhou/boundaries` 页面读取；原 `/hangzhou/regions` 页面只绘制区县完整环线。

| 位置 | 字段 | 规则 |
| --- | --- | --- |
| Feature 顶层 | `id` | `region-${adcode}`，供 Cesium Entity 稳定标识 |
| `properties` | `adcode`、`name`、`level` | 沿用原始行政编码、名称和层级 |
| `properties` | `parentAdcode` | 从原始 `parentAdcode` 或 `parent.adcode` 读取；区县必须有上级编码，市级缺乏可靠值时允许 `null` |
| `properties` | `labelPoint` | 优先转换原始 `centroid`，缺失时转换 `center`；萧山区采用后一种情况 |
| `geometry` | `MultiPolygon` | 所有坐标按“原始为 GCJ-02”的推定转换为 WGS84，保留多面和内环 |

脚本会检查杭州市要素唯一、13 个区县、上下级编码、行政编码重复、必需字段、经纬度范围和环线闭合；遇到不符合契约的数据会报错，不写出新的标准文件。`labelPoint` 只用于放置标签，不作为行政中心、测绘质心或下钻相机范围的证明。业务统计指标另按 `adcode` 关联，不写进边界 GeoJSON。

派生边界文件也是 `FeatureCollection`，每个要素的几何类型统一为 `MultiLineString`：

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "boundary-outer-330100",
      "properties": { "kind": "outer", "cityAdcode": 330100 },
      "geometry": { "type": "MultiLineString", "coordinates": [[[118.33976867, 29.47817771], [118.34242616, 29.47644462]]] }
    },
    {
      "type": "Feature",
      "id": "boundary-inner-330102-330105",
      "properties": { "kind": "inner", "districtAdcodes": [330102, 330105] },
      "geometry": { "type": "MultiLineString", "coordinates": [[[120.15224651, 30.26038303], [120.15939816, 30.26069775]]] }
    }
  ]
}
```

上例中的坐标仅截取每条线的前两个点，实际外缘是闭合线。脚本把每条区县环线拆成无向线段：仅出现一次的线段归入外缘，被两个不同区县共用的线段归入内部区界；再按连通关系拼接。当前数据得到 1667 条外缘短线段、1445 条内部短线段，外缘拼成一条闭合线；出现重复归属、三重共享、分叉或外缘不闭合时会报错。这个检查依赖当前区县间精确共边，不等于完整的测绘或覆盖有效性证明；换数据后还需核对缝隙、重叠和坐标系。

转换使用常见的 GCJ-02 正向公式，通过迭代求逆。它不能提高原始边界的测绘精度，也不能代替与独立 WGS84 控制点的实地核验。原始文件的下载日期、行政区数据版本、公开使用授权与署名条件尚未记录，发布前需要核实。
