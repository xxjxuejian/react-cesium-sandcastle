# Node.js 独立后端入门规划

更新日期：2026-11-07。本文描述整体设计。独立后端已实现 SQLite 数据库基础、登录联调与用户管理，其余管理接口将逐阶段实现。实施进度与验收以[后端分阶段实施任务](./后端分阶段实施任务.md)为准。

## 1. 第一版的目标

建立一个独立启动、独立管理依赖的 Node.js 后端，为当前登录、用户、避难场所、航线和重点单位页面提供真实接口。数据保存到数据库，重启服务后仍然存在。

建议采用 **Node.js + TypeScript + Express + SQLite**。Node.js 是运行环境，TypeScript 是编写代码的语言，Express 负责接收 HTTP 请求，SQLite 负责保存数据。沿用 TypeScript 能让前后端字段定义保持熟悉的写法。

这是针对个人学习、小数据量、单实例部署的建议。SQLite 无需另外启动数据库服务；当需求变成多实例部署、大量并发写入或实时无人机遥测，再评估 PostgreSQL。技术依据见 [技术选型核验](./backend-technology-notes.md)。

第一版使用一个后端进程、一份数据库。暂不引入微服务、Redis、消息队列、通用权限配置平台或 GIS 服务。仓库已有的《无人机实时地图后端设计》面向后续遥测场景，不是本阶段的实施清单。

## 2. 从已有代码理解后端

本分支只连接真实后端，运行代码中已移除 Mock。当前调用关系（当前已接入登录与用户管理）：

```text
管理页面 → 原有 API 方法 → /api 请求 → Node.js 后端 → SQLite
                                             ↓
                               校验身份、权限、参数及业务规则
```

例如保存航线：页面提交名称、速度和完整航点 → 后端检查登录和管理员身份 → 校验航点 → 计算长度和数量 → 保存数据库 → 返回完整记录 → 页面更新列表。数据库保存失败时，前端不能显示保存成功。

前端继续负责输入、交互、地图绘制和预览；后端负责数据是否允许保存，以及最终保存什么。前端校验用于及时提示，后端仍要校验，因为请求可以绕过页面直接发送。

## 3. 按当前功能划分模块

| 模块 | 当前依据 | 后端需要完成的内容 |
| --- | --- | --- |
| 登录与会话 | `src/api/auth.ts`、后端 `src/auth.ts` | 校验密码、创建登录凭证、恢复会话、退出失效 |
| 动态路由 | 后端 `src/available-routes.ts`、前端 `src/router/transform.tsx` | 按账号权限返回路由描述 |
| 用户管理 | `src/api/userManagement.ts` | 查询、分页、新增、修改、删除、账号启停及密码管理 |
| 避难场所 | `src/api/shelterManagement.ts` | 列表与详情、增删改、容量和位置校验 |
| 航线 | `src/api/airlineManagement.ts` | 列表与详情、增删改、航点校验、服务端计算长度 |
| 重点单位 | `src/api/keyUnitManagement.ts` | 列表与详情、增删改、中心点和三层防御范围校验 |

学习示例、时钟、地图显示本身不需要各建一个后端模块。后端也不用运行 Cesium Viewer，只需要理解经纬度、米、速度等普通数据。

## 4. 独立项目与目录

已创建与前端平级的 `react-cesium-server/`，有自己的 `package.json`、配置示例、Git 仓库和启动命令。下面是目标目录结构，数据库及业务模块目录将按阶段增加。

```text
react-cesium-server/
  src/
    app.ts                 # 配置请求解析、注册路由和错误处理
    server.ts              # 启动 HTTP 服务
    db.ts                  # 打开数据库连接
    config/routes.ts       # 前端菜单和页面路由描述
    middleware/
      auth.ts              # 登录检查和管理员检查
      error.ts             # 将错误转成统一响应
    modules/
      auth/                # 登录、会话、退出
      users/               # 用户管理
      shelters/            # 避难场所
      airlines/            # 航线
      key-units/           # 重点单位
  migrations/              # 按编号保存建表和改表 SQL
  scripts/seed.ts           # 显式初始化账号和演示数据
  data/                    # 本地数据库，排除 Git 提交
  tests/                   # 接口与关键业务规则测试
  .env.example             # 配置名称和用途，不包含真实密码
  package.json
  tsconfig.json
  README.md
```

每个模块先用 `routes.ts`、`service.ts`、`types.ts` 三个文件。`routes.ts` 读取请求、调用业务方法、返回响应；`service.ts` 完成校验、计算和 SQL；`types.ts` 写接口字段及中文注释。

这样拆分的价值是能分别读懂 HTTP 流程与业务逻辑；成本是一次请求需要跨两个文件跟踪。暂不再增加 controller、repository、依赖注入或通用 CRUD 基类。简单 SQL 可以先留在 service，出现明显重复后再调整。

数据库访问先选一种 SQLite 驱动并使用参数化 SQL，不同时引入 ORM。驱动版本在正式搭建时与选定的 Node.js LTS 版本一起核验和锁定。这样先学会表、查询和事务，之后有需要再使用 ORM。

## 5. 第一版数据库：五张表

| 表 | 主要字段 | 设计说明 |
| --- | --- | --- |
| `users` | id、username、password_hash、nickname、status、gender、department、role、phone、email、created_at、updated_at | 登录账号与用户管理共用；用户名唯一 |
| `sessions` | id、user_id、token_hash、expires_at、created_at | 保存登录状态，关联 users；退出删除会话 |
| `shelters` | id、name、facility_type、shelter_usage、operation_status、capacity、available_capacity、facilities_json、address、longitude、latitude、height、management_unit、contact_name、contact_phone、description、时间字段 | 接口仍返回原来的 location 对象 |
| `airlines` | id、name、speed、remark、waypoints_json、waypoint_count、length、时间字段 | 航点整体保存；列表只查摘要字段 |
| `key_units` | id、name、longitude、latitude、address、remark、rings_json、时间字段 | 三个圈整体保存 |

`facilities_json`、`waypoints_json`、`rings_json` 在数据库中保存为 JSON 文本，接口读取后还原为数组或对象。当前页面都是整体保存和读取，先这样存能减少表和关联查询。代价是按单个航点或圈层做 SQL 查询不方便；将来真的需要时再拆子表。

表结构和接口结构不必完全相同。例如避难场所表分别存 longitude、latitude，后端返回时组成 `location`。省略 height 时保存为 NULL，返回时按原接口省略该可选字段。

所有编号和时间由服务器生成，更新保留创建时间。数据库建议保存 UTC 时间；航线、重点单位等现有接口仍按约定返回北京时间 `YYYY-MM-DD HH:mm:ss`，不能直接依赖服务器所在时区。

开启外键约束；为 username 建唯一索引，为会话 token_hash 建唯一索引。列表先按现有排序规则实现，数据量增加后根据实际查询增加索引。

迁移是“有顺序地修改表结构”，用迁移记录避免重复执行。seed 是“放入初始数据”，只在明确执行时运行，不在每次启动时覆盖业务数据。涉及用户删除与会话删除等多步操作，用事务保证一起成功或一起失败。

## 6. 接口尽量沿用现有契约

| 方法 | 完整路径 | 用途 |
| --- | --- | --- |
| POST | `/api/auth/login` | 返回 accessToken、user、routes |
| GET | `/api/auth/session` | 返回 user、routes |
| POST | `/api/auth/logout` | 撤销当前会话，返回 true |
| GET、POST | `/api/system-management/users` | 列表、新增 |
| PUT、DELETE | `/api/system-management/users/:id` | 修改、删除 |
| PUT              | `/api/system-management/users/:id/password` | 管理员重置密码并撤销会话 |
| GET、POST | `/api/system-management/shelters` | 列表、新增 |
| GET、PUT、DELETE | `/api/system-management/shelters/:id` | 详情、修改、删除 |
| GET、POST | `/api/system-management/airlines` | 列表、新增 |
| GET、PUT、DELETE | `/api/system-management/airlines/:id` | 详情、修改、删除 |
| GET、POST | `/api/system-management/key-units` | 列表、新增 |
| GET、PUT、DELETE | `/api/system-management/key-units/:id` | 详情、修改、删除 |

成功仍返回 `{ code: 0, message, data }`；列表 data 为 `{ list, total }`；删除 data 为 true；失败 data 为 null。沿用已有筛选字段和业务错误码，具体以 API 文件、类型及独立后端实现为准。

第一版建议真正使用 HTTP 状态：400 参数错误、401 会话失效、403 无权限、404 记录不存在、409 用户名冲突、500 服务端异常。航线和重点单位的原文档采用 HTTP 200 搭配业务码，迁移时要同步修订文档和请求拦截器，不能只改后端。

阶段 2 已在 `src/utils/request.ts` 补齐 HTTP 错误消息读取，认证 store 处理 401 并清理登录状态、回到登录页；403 只提示无权限，不当作退出登录。取消请求继续保留原有处理。

分页默认 page=1、pageSize=10，限制 pageSize 为 1～100，先筛选再统计和分页。沿用航线与重点单位的更新时间倒序、编号升序规则；其他模块也明确稳定排序。列表为空与查询失败要区分。

## 7. 登录、用户与权限需要先统一

本分支已移除模拟登录与模拟列表，登录与用户管理统一使用真实后端的 users 表。

第一版建议只保留 `admin`、`viewer` 两种角色编码，界面显示“管理员”“普通用户”。管理员可以访问四个管理模块；普通用户仅访问目前允许的示例页面。对应调整用户表单里现有的四种角色选项、用户类型与展示文案。这是明确的范围简化，不自动推断运营专员等现有名称的权限。

阶段 3 已补齐“新增时必填初始密码”，新增请求与编辑请求分开，编辑普通资料不修改密码。`PUT /api/system-management/users/:id/password` 供管理员重置密码，成功撤销该用户已有会话。密码长度为 15～128 个字符，与管理员初始化一致。第一版不开放自行注册。

建议使用随机、不可预测的会话 token，继续走现有 `Authorization: Bearer ...`，不用先引入 JWT。数据库只保存 token 的哈希和过期时间；建议默认有效期 8 小时，不做自动续期。每次请求检查会话期限、用户状态和当前角色。退出删除会话；停用账号、删除账号或改密码撤销会话，角色调整按数据库中的最新权限生效。

密码保存带随机盐的密码哈希，可以使用 Node.js 的异步 scrypt；普通 SHA-256 不适合直接存密码。密码、密码哈希和完整 token 不出现在响应和日志中。初始管理员通过显式初始化步骤设置密码，不把 Mock 固定密码搬到生产。禁止删除、停用或降级最后一个启用的管理员。

菜单权限与接口权限使用同一套角色规则：隐藏菜单只影响显示；后端仍要在每个管理接口执行管理员检查。直接用 viewer token 请求管理接口应返回 403。

## 8. 动态路由怎么处理

后端 `src/available-routes.ts` 维护已开放页面的静态配置，按角色筛选后随 login/session 返回。不需要单独建立菜单表或菜单编辑页面。

`component: "system-management/airline-management"` 仍只是前端页面的标识。后端返回 JSON，前端 `transform.tsx` 使用本地 `import.meta.glob` 查找已经打包的页面。后端不会返回 React 组件，也不会让前端执行任意远程代码。

保留 path、name、component、redirect、meta、children 等已有字段；图标和 titleKey 由前端解释。新增页面时协调前端文件、语言资源及后端配置；筛选子路由后要保证默认 redirect 仍指向可访问的页面。

独立后端不直接 import 前端仓库的类型或工具文件。先在后端明确声明简单类型，把经过核对的纯计算与校验逻辑迁入后端，并保留契约测试；确实出现频繁同步成本后再考虑共享包。

## 9. 各模块必须保留的校验

| 模块 | 必要规则 |
| --- | --- |
| 用户 | 用户名唯一、角色和状态限定取值、字段长度限制、密码单独处理、保护最后一个管理员 |
| 避难场所 | 容量是非负整数、可用容量不超过总容量、设施和用途等属于规定枚举、经纬度合法 |
| 航线 | 至少两个航点、速度大于 0、高度不小于 0、经纬度合法、相邻点不能三项完全相同 |
| 重点单位 | 三个固定圈完整、半径严格递增、高度上下界合法、外层高度区间包含内层 |

航线长度沿用 `src/utils/airline.ts` 的水平大圆距离算法，单位米，不叠加高度差，不自动闭合。航点数量、order 和 length 由后端计算，客户端提交的计算值不能覆盖它们。

航线与重点单位高度继续使用当前统一地面零平面的约定，不擅自换成海拔或相对地形高度。位置使用 WGS84，经度范围 -180～180，纬度 -90～90，数值必须有限；null 不能自动转成 0。

业务字段按白名单读取，不直接把整个 body 合并到记录。系统编号、创建时间和权限相关字段只能通过指定业务流程修改。查询使用 SQL 参数绑定，排序字段也采用固定值。

设置请求体大小和字段长度上限；航点数上限在实施时结合实际页面明确，超过限制返回可理解的错误。异常日志记录请求路径、耗时和原因，响应不泄漏 SQL 和堆栈。登录增加基础频率限制。

## 10. 前后端如何一起运行

本地前端仍用 `pnpm dev`；后端也提供 `pnpm dev`，监听例如 3000 端口。后端另提供 build、start、test、lint、db:migrate、db:seed 命令，README 按实际实现写清楚执行顺序。

前端在 `frontend_single` 分支运行 `pnpm dev`，默认在 `vite.config.ts` 中启用 `/api` 到 `http://127.0.0.1:3000` 的代理。后端端口不同时通过 `VITE_API_PROXY_TARGET` 指定目标。后端本身也使用 `/api` 前缀，因此不删除此前缀。`request.ts` 的 baseURL 保持 `/api`。

生产环境使用同一个 HTTPS 域名：静态文件交给 Web 服务，`/api` 反向代理到 Node.js。Vite 开发代理在生产构建后不会生效；若继续把前端放在 GitHub Pages，需要另设后端地址并配置明确允许的跨域来源。

当前后端 `.env.example` 说明 PORT、HOST、DATABASE_PATH 和管理员初始化配置；会话固定有效 8 小时，尚未提供 SESSION_TTL_HOURS 配置。真实环境变量和数据库文件排除 Git。数据库放在持久目录，备份时使用一致性备份方式或停服备份，并验证能够恢复。部署先保持单实例。

## 11. 原始实施概览与验收

以下是整体规划时的粗粒度分组；执行时采用[后端分阶段实施任务](./后端分阶段实施任务.md)的阶段 0～7。其中错误处理与首次前端联调提前到登录阶段，航线与重点单位拆为两个独立阶段。

| 阶段 | 工作 | 完成标准 |
| --- | --- | --- |
| 1 | 独立项目、健康检查、数据库连接、迁移与初始化 | 能独立启动，明确知道数据库文件在哪里 |
| 2 | users 与 sessions、登录、会话、退出、路由配置 | 真实账号登录成功，刷新可恢复，退出后旧 token 不可用，viewer 不能调用管理接口 |
| 3 | 用户管理，新增密码与重置密码，角色统一 | 用户列表中的启停实际影响登录；重复用户名失败；密码不出现在响应 |
| 4 | 避难场所 CRUD，统一请求错误处理 | 搜索、分页、详情和保存正常；重启后数据保留；错误显示后端信息 |
| 5 | 航线、重点单位 CRUD 和规则迁移 | 长度由后端计算，航点顺序正确，非法圈层无法保存 |
| 6 | 联调、持久化备份与简单部署 | Mock 关闭后全流程可用，迁移可重复运行且不丢数据，备份可恢复 |

建议接口测试直接用临时 SQLite 数据库。重点验证未登录 401、普通用户 403、会话失效、唯一约束、分页边界、非法容量/航点/圈层、系统字段保护和写入持久化。事务测试要证明中途失败不会留下半份数据。

前端联调后执行现有 `pnpm test`、`pnpm lint`、`pnpm build`，并手动验证登录、各页面 CRUD、路由刷新和语言切换。仓库当前 package.json 已有 test 脚本；旧文档关于测试不存在或历史失败的描述不作为当前执行结果。

独立骨架的检查记录和后续各阶段状态见分阶段任务文档；本文列出的业务接口仍是目标设计，不表示已经实现。
