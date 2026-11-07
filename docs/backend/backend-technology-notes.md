# 独立后端基础技术核验

核验日期：2026-11-05。本文保留初期技术选型依据，不作为当前实施进度。独立后端已实现 SQLite、登录与用户管理，当前进度以[后端分阶段实施任务](./后端分阶段实施任务.md)为准。

## 建议组合

建议第一版使用 Node.js + TypeScript + Express 5 + SQLite。这里 Node.js 是运行环境，TypeScript 是代码语言，Express 负责接收 HTTP 请求，SQLite 负责持久保存数据。这是面向当前学习项目的选型建议，不是唯一方案。

Express 的路由按 HTTP 方法和路径处理请求，`Router` 可以把用户、避难场所、航线、重点单位等接口分别组织；无需先建立复杂的框架层级。[Express 路由文档](https://expressjs.com/en/guide/routing/)

Express 5 会把路由处理函数返回的 Promise 的拒绝传递给错误处理中间件。因此可以保留清晰的 `async` 请求处理流程，并在末尾集中返回错误 JSON；脱离请求流程的异步任务仍需自行处理错误。[Express 错误处理文档](https://expressjs.com/en/guide/error-handling/)

## SQLite 的适用边界

SQLite 不需要单独运行数据库服务，适合先在本机启动一个后端进程、保存少量管理业务数据。数据库文件放在后端所在机器，由后端接收浏览器请求后执行 SQL，浏览器不直接打开数据库文件。这一建议基于 SQLite 官方对网站和应用服务器场景的说明。[SQLite 使用场景](https://www.sqlite.org/whentouse.html)

同一个 SQLite 数据库文件同一时刻只有一个写入者。如果后续出现大量并发写入、多个后端实例共同访问数据库的需求，再评估 PostgreSQL 或 MySQL；不应把 SQLite 文件放到网络共享目录让多台应用服务器直接写入。[SQLite 并发和网络存储边界](https://www.sqlite.org/whentouse.html)

## 登录密码的最小正确做法

建议使用 Node.js 内置的异步 `crypto.scrypt` 派生密码校验值，每个密码生成独立随机盐，数据库保存盐、派生结果及计算参数；登录时重新计算后比较。官方文档说明 scrypt 是面向密码的派生函数，并建议盐随机且至少 16 字节。第一版也不应照搬 mock 中的明文密码存储。[Node.js scrypt 文档](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback)

比较派生结果可使用 `crypto.timingSafeEqual`，并保证两边字节长度一致。它并不自动保证周围所有登录逻辑都没有时序泄漏，仍需统一处理账号或密码错误。[Node.js timingSafeEqual 文档](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)

上述文档核验没有决定数据库驱动、登录令牌方案或具体目录拆分；这些应结合现有前端接口契约在实施时确定。
