# 纸片人男友

一个基于 Next.js 的 AI 虚拟角色聊天小项目，支持角色聊天、用户登录、会话持久化和简单后台查看。

## 项目简介

这是一个轻量级 AI 虚拟角色聊天项目。用户可以选择不同角色进行聊天，服务端负责调用 AI 模型，并将用户、会话和消息保存到 PostgreSQL。

项目还提供一个简单后台，用于查看用户、会话和聊天记录。当前版本主要聚焦聊天、登录、数据持久化和后台查看这几条核心链路。

## 功能特性

- 角色选择：内置多个虚拟角色
- AI 聊天：通过服务端 API 调用 OpenRouter
- 会话持久化：聊天会话和消息写入 PostgreSQL
- 历史消息恢复：刷新页面后可以恢复当前角色的历史聊天
- 用户注册登录：支持邮箱密码注册、登录、退出
- 游客聊天：未登录用户也可以体验聊天
- 后台管理：可查看用户、会话和消息记录
- 管理员登录：后台使用独立 `admin_session`
- 可选扩展：TTS、图片生成、ASR 按环境变量启用
- 工程验证：包含 TypeScript 检查和基础测试

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui / Radix UI
- Zustand
- Neon PostgreSQL
- Drizzle ORM
- bcryptjs
- httpOnly Cookie Session
- OpenRouter Chat Completions API
- 可选：Minimax TTS、Ark Image API、Groq ASR
- node:test / tsx

## 本地启动

本项目使用 pnpm。

```bash
pnpm install
pnpm dev
```

Windows 环境可以使用 `pnpm.cmd`：

```powershell
pnpm.cmd install
pnpm.cmd dev
```

由于当前 `dev/build/start` 脚本会调用 `scripts/*.sh`，Windows 本地需要安装 Git Bash 或其他可执行 bash 的环境。

开发服务默认运行在：

```text
http://localhost:5000
```

生产构建和启动：

```bash
pnpm build
pnpm start
```

Windows：

```powershell
pnpm.cmd build
pnpm.cmd start
```

## 环境变量

在 `.env.local` 中配置环境变量。`.env.local` 只用于本地配置，不要提交到 GitHub。可以参考 `.env.example` 创建本地环境变量文件。

### 必填

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` 或 `POSTGRES_URL` | PostgreSQL 连接串，Drizzle 和后台查询使用 |
| `OPENROUTER_API_KEY` | `/api/chat` 调用 OpenRouter 的 API Key |
| `ADMIN_PASSWORD` | `/admin/login` 后台登录密码 |

### 建议配置

| 变量 | 说明 |
| --- | --- |
| `ADMIN_SESSION_SECRET` | 后台 `admin_session` 签名密钥 |
| `USER_SESSION_SECRET` | 普通用户 `user_session` 签名密钥 |

### 可选

| 变量 | 说明 |
| --- | --- |
| `MINIMAX_API_KEY` | `/api/tts` 语音合成 |
| `MINIMAX_API_BASE_URL` | Minimax API Base URL，默认 `https://api.minimax.io` |
| `ARK_API_KEY` | `/api/image` 图片生成 |
| `GROQ_API_KEY` | `/api/asr` 语音识别 |
| `PORT` | 本地服务端口，默认 `5000` |

示例：

```env
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-...
ADMIN_PASSWORD=demo-admin-password
ADMIN_SESSION_SECRET=replace-with-random-secret
USER_SESSION_SECRET=replace-with-another-random-secret
```

## 数据库

项目使用 Drizzle ORM 管理 schema。schema 位于：

```text
src/db/schema.ts
```

当前核心表：

- `users`
- `chat_sessions`
- `chat_messages`

迁移和同步命令：

```bash
pnpm db:generate
pnpm db:push
pnpm db:verify
```

Windows：

```powershell
pnpm.cmd db:generate
pnpm.cmd db:push
pnpm.cmd db:verify
```

## 测试

```bash
pnpm ts-check
pnpm tsx --test tests/*.test.ts
```

Windows：

```powershell
pnpm.cmd ts-check
pnpm.cmd tsx --test tests/*.test.ts
```

## 页面入口

- 首页：`/`
- 注册：`/register`
- 登录：`/login`
- 后台登录：`/admin/login`
- 后台首页：`/admin`
- 用户管理：`/admin/users`
- 聊天记录：`/admin/chats`

## 使用说明

1. 配置 `.env.local`
2. 启动项目
3. 打开首页选择角色
4. 发送消息
5. 注册或登录用户
6. 刷新页面查看历史消息恢复
7. 进入 `/admin/login` 登录后台
8. 查看用户和聊天记录

普通用户可以通过 `/register` 注册，也可以不登录直接以游客身份聊天。

后台管理员通过 `/admin/login` 登录，使用 `.env.local` 中的 `ADMIN_PASSWORD`。

`/admin/orders` 当前是预留页面，不作为核心功能使用。

## 项目结构

```text
src/app
  页面和 API Route

src/components
  前端组件

src/lib
  业务逻辑、认证、AI 请求封装、后台查询

src/db
  Drizzle schema 和数据库连接

tests
  基础测试

docs
  项目文档
```

## 当前限制

当前版本暂未覆盖：

- 暂未接入 OAuth 登录
- 暂未实现邮箱验证和找回密码
- 暂未实现完整角色后台配置
- 暂未实现完整权限系统
- AI 调用暂未做完整成本统计
- 后台统计能力较简单

## 后续计划

- 支持用户会话列表
- 支持新建 / 删除会话
- 支持角色配置后台化
- 支持长期记忆
- 支持流式输出
- 支持 token 成本统计
- 支持更完整的后台数据看板

## License

MIT License
