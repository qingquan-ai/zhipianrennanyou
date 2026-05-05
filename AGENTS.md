# 纸片人男友 - 项目规范

## 项目概述
这是一个面向年轻女性用户的虚拟恋爱陪伴聊天产品，用户可以选择预设男性角色进行自由聊天，体验文字、语音、图片三种互动形式。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **LLM**: Doubao-seed 系列 (coze-coding-dev-sdk)
- **TTS**: Coze TTS API

## 目录结构
```
├── public/images/characters/    # 角色头像图片
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts   # 流式聊天 API
│   │   │   └── tts/route.ts    # TTS 语音合成 API
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 角色选择页
│   │   └── globals.css         # 全局样式
│   ├── components/
│   │   ├── CharacterCard.tsx   # 角色卡片组件
│   │   ├── ChatPage.tsx        # 聊天页面组件
│   │   ├── MessageBubble.tsx   # 消息气泡组件
│   │   └── ChatInput.tsx       # 输入框组件
│   ├── lib/
│   │   └── characters.ts       # 角色配置数据
│   ├── store/
│   │   └── chatStore.ts        # 状态管理
│   └── types/
│       └── index.ts            # 类型定义
├── .coze                       # 项目配置
└── package.json                # 依赖管理
```

## 核心功能

### 1. 角色系统
- 4 位预设男性角色：顾冽、林屿、沈默、苏晨
- 每个角色有独立 system prompt、性格设定、说话风格
- 绑定专属 TTS 音色

### 2. 聊天功能
- 流式文字输出（打字机效果）
- 语音播放功能（TTS 合成）
- 图片气泡展示
- 关系阶段系统（stranger → familiar → ambiguous → intimate）
- 情绪状态系统

### 3. API 接口
- POST /api/chat - 流式聊天
- POST /api/tts - 语音合成

## 开发命令
```bash
pnpm install      # 安装依赖
pnpm dev          # 开发模式（端口 5000）
pnpm build        # 构建生产版本
pnpm lint         # ESLint 检查
pnpm ts-check     # TypeScript 检查
```

## 角色配置
角色配置位于 `src/lib/characters.ts`，包含：
- 基本信息（id, name, age, role）
- 性格设定（personality, speakingStyle）
- 人设关键词（keywords）
- TTS 配置（ttsSpeaker, speechRate）
- System Prompt（角色行为规范）

## 状态管理
使用 Zustand 管理：
- currentCharacter - 当前角色
- messages - 聊天消息列表
- conversationState - 对话状态
- isTyping - 打字状态

## 注意事项
1. zustand 必须作为生产依赖安装
2. axios 必须作为开发依赖安装（用于 TTS 音频下载）
3. 角色图片存储在 public/images/characters/
4. API 调用需要 coze-coding-dev-sdk 配置
