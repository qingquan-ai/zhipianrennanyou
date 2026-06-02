# 面试 Demo 演示脚本

本文档用于 AI 应用工程师面试时快速讲清楚项目。建议提前确认 `.env.local`、Neon 连接和后台管理员密码已经配置好。

## 3 分钟演示流程

### 0:00 - 0:30 项目定位

可以这样开场：

> 这是一个 AI 虚拟角色聊天 Demo。我重点做了三件事：第一，前台可以选择角色并调用 AI 模型聊天；第二，用户、会话、消息会写入 Neon PostgreSQL；第三，后台可以查看真实用户和聊天记录。它不是完整商业产品，我把范围控制在面试可展示的全栈闭环上。

展示页面：

- 首页：`/`
- 登录/注册入口：`/login`、`/register`
- 后台入口：`/admin/login`

### 0:30 - 1:20 前台聊天

操作：

1. 打开首页，选择一个角色，例如顾冽。
2. 发送一条消息。
3. 展示 AI 回复。

讲解重点：

> 前端聊天页是 `ChatPage`，状态用 Zustand 管理，同时保留 localStorage 作为兜底。发送消息时调用 `/api/chat`，服务端会组装角色 system prompt、近期上下文和用户输入，再转发到 OpenRouter。模型返回后，前端展示回复。

### 1:20 - 2:10 数据入库和历史恢复

操作：

1. 说明第一次聊天会创建 `chat_sessions`。
2. 说明 user / assistant 两类消息会写入 `chat_messages`。
3. 刷新页面，展示历史消息恢复。

讲解重点：

> 这里不是只存在浏览器里。服务端会把会话和消息写入 Neon PostgreSQL。前端按 `characterId` 保存 `sessionId`，刷新后通过 `/api/chat/sessions/[id]/messages` 读取历史消息。数据库写入失败时，聊天主流程尽量不中断，这是为了保证 AI 交互体验。

### 2:10 - 3:00 后台查看真实数据

操作：

1. 打开 `/admin/login` 登录后台。
2. 打开 `/admin` 看用户数、会话数、消息数。
3. 打开 `/admin/chats` 查看会话列表。
4. 打开某条 `/admin/chats/[id]` 查看消息详情。

讲解重点：

> 后台是独立的 `admin_session`，没有和普通用户 cookie 混用。后台读取的是真实的 `users`、`chat_sessions`、`chat_messages`。我没有造订单数据，`/admin/orders` 目前保留空状态，这是刻意控制范围。

## 5 分钟演示流程

### 0:00 - 0:40 项目目标

> 这个 Demo 的目标是展示一个 AI 应用从交互到持久化再到后台运营查看的最小闭环。技术上我选择 Next.js 全栈、Neon PostgreSQL、Drizzle ORM 和 Cookie 登录态，尽量少引入额外后端服务。

### 0:40 - 1:40 注册登录和用户绑定

操作：

1. 打开 `/register` 注册一个用户。
2. 回到首页，顶部显示 nickname 或 email。
3. 进入聊天发送消息。

讲解重点：

> 普通用户登录使用 `user_session`，密码用 bcryptjs hash 后存入 `users.password_hash`。`/api/chat` 创建会话时会调用 `getCurrentUser`，如果用户已登录，就把 `chat_sessions.user_id` 绑定到当前用户；如果未登录，也允许游客继续聊天。

可以补充：

> 后台登录是另一套 `admin_session`，只用于 `/admin`，避免普通用户态和管理员态混用。

### 1:40 - 2:50 AI 聊天接口封装

操作：

1. 选择角色并发送消息。
2. 简要打开代码或口头说明 `/api/chat`。

讲解重点：

> 前端不直接访问模型供应商。`/api/chat` 在服务端读取 `OPENROUTER_API_KEY`，并负责角色校验、prompt 组装、上下文裁剪、超时控制和错误文案。这样 API Key 不会暴露给浏览器，也方便未来替换模型供应商。

### 2:50 - 3:50 数据库和 Drizzle

操作：

1. 展示 `src/db/schema.ts`。
2. 说明 `users`、`chat_sessions`、`chat_messages`。
3. 展示 Drizzle 命令。

讲解重点：

> 我用 Drizzle 显式建模三张核心表。`chat_sessions` 记录用户、角色和标题，`chat_messages` 记录每条消息的 role、content、图片/音频 URL 和时间。迁移由 `drizzle-kit generate` 生成，`drizzle-kit push` 同步到 Neon。这样比手写散乱 SQL 更容易维护类型和 schema 一致性。

### 3:50 - 4:40 后台管理

操作：

1. 登录 `/admin/login`。
2. 看 `/admin` 概览。
3. 看 `/admin/users` 用户列表和状态编辑。
4. 看 `/admin/chats` 和详情页。

讲解重点：

> 后台复用 Drizzle 查询真实数据，并做了最小管理员保护。用户管理支持搜索、状态筛选、分页和编辑 status。聊天记录页会 join `users`，展示用户昵称/邮箱或游客，并把 `character_id` 映射成角色名，便于面试现场读数据。

### 4:40 - 5:00 工程验证和边界

讲解重点：

> 我没有做 OAuth、验证码、支付、订阅、复杂图表和角色表，因为当前 Demo 的核心是 AI 聊天闭环。验证上保留了 `pnpm ts-check` 和 `pnpm tsx --test tests/*.test.ts`，测试覆盖 schema、ChatRequest、历史消息映射、后台映射和认证 helper。

## 重点讲解话术

### Next.js 全栈能力

> 我没有拆一个单独后端，而是用 Next.js App Router 做页面、API Route 和 Server Action。前台交互、登录注册、AI 转发、后台读取数据库都在同一个 TypeScript 工程里，适合小团队快速验证 AI 产品原型。

### Neon PostgreSQL + Drizzle ORM

> Neon 提供托管 PostgreSQL，适合 Demo 快速上线和面试展示。Drizzle 的好处是 schema 在 TypeScript 中可见，查询也有类型提示，迁移输出可追踪。这个项目里我避免手写散乱 SQL，后台查询和聊天入库都走 Drizzle。

### Cookie 登录态

> 普通用户用 `user_session`，管理员用 `admin_session`。两者 cookie 名称、作用路径和 helper 都分开。普通用户登录用于绑定聊天会话，管理员登录只保护后台页面。

### AI 聊天接口封装

> `/api/chat` 是项目的 AI gateway。它隐藏模型供应商 Key，集中处理 prompt、上下文、模型请求、超时和错误。未来如果要换模型，只需要改服务端封装，不需要改前端聊天 UI。

### 会话与消息入库

> 首次聊天没有 `sessionId` 时，服务端创建 `chat_sessions`，并写入 `character_id`、`user_id` 和标题。每轮聊天写入一条 user 消息和一条 assistant 消息。前端拿到 `sessionId` 后按角色保存，用于后续续聊和刷新恢复。

### 后台真实运营数据

> `/admin` 不是假数据页面，它读取真实的用户数、会话数、消息数。`/admin/chats` 可以查看某个角色、某个用户或游客产生的真实会话，再进入详情看消息流。

## 面试官可能追问的问题和回答

### Q1: 为什么不用 Prisma？

> Prisma 也可以。这里选 Drizzle 是因为它更轻量，schema 和 SQL 形态更接近，迁移文件比较直观。对这个 Demo 来说，我只需要三张核心表和少量 join，Drizzle 足够，而且类型体验也很好。

### Q2: 为什么不做完整用户权限系统？

> 当前是面试 Demo，我把权限范围控制在最小可用：普通用户和管理员登录态隔离，后台要求 `ADMIN_PASSWORD` 登录。真实生产环境会接入角色字段、权限表、审计日志和更完整的 session 管理。

### Q3: 如果数据库写入失败会怎样？

> 聊天入库是重要能力，但不应该让用户的 AI 对话直接崩掉。当前 `/api/chat` 对部分数据库写入做了 best-effort 处理，记录服务端错误，并尽量返回 AI 回复。后续可以加重试队列或事件日志。

### Q4: 怎么保证不会暴露模型 API Key？

> 前端只请求项目自己的 `/api/chat`。`OPENROUTER_API_KEY` 只在服务端 route 中读取，不传给浏览器。TTS、图片、ASR 也是同样思路。

### Q5: 历史聊天为什么还保留 localStorage？

> 数据库恢复是主方向，但 localStorage 保留为前端兜底，避免接口失败时用户界面完全丢状态。这个取舍适合 Demo 和早期产品验证。

### Q6: 当前有哪些生产化不足？

> 主要有：没有邮箱验证和找回密码，没有 OAuth，没有角色/权限表，没有限流和审计日志，AI 响应还不是严格流式，消息也没有 token 成本记录。这些都可以在现有 schema 和 API 封装上继续扩展。

### Q7: 如果要加角色表怎么做？

> 现在角色配置在 `src/lib/characters.ts`。如果要后台配置角色，可以新增 `characters` 表，把 `chat_sessions.character_id` 关联到角色表，同时保留本地配置作为种子数据或 fallback。

### Q8: 如果要统计成本或质量指标怎么做？

> 可以在 `chat_messages` 上补 `metadata`、`model_name`、`provider`、`token_usage` 等字段，或者新增独立请求日志表。当前没有加，是因为第一阶段只需要证明聊天和消息入库闭环。
