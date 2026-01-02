# Saves - 个人记账应用

一个简洁的个人记账应用，支持 Web、Android 和 iOS 平台。

## 功能特性

- 📝 记录收入和支出
- 📊 本月收支概览和统计
- 📈 月度趋势分析
- 🏷️ 12 个预设分类（餐饮、交通、购物等）
- 👤 用户注册和登录
- 🔒 数据隔离，每个用户只能看到自己的数据

## 技术栈

**后端**
- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless 运行时
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - SQLite 数据库
- [Hono](https://hono.dev/) - 轻量级 Web 框架
- [Zod](https://zod.dev/) - 数据验证

**前端**
- [Expo](https://expo.dev/) / React Native - 跨平台框架
- [Expo Router](https://docs.expo.dev/router/introduction/) - 文件路由
- TypeScript

## 项目结构

```
saves/
├── saves-api/              # 后端 API
│   ├── src/
│   │   └── index.ts        # API 路由
│   ├── schema.sql          # 数据库初始化脚本
│   ├── migration-users.sql # 用户表迁移脚本
│   ├── wrangler.toml       # Cloudflare Workers 配置
│   └── package.json
│
├── saves-app/              # 前端应用
│   ├── app/                # 页面 (Expo Router)
│   │   ├── _layout.tsx     # 根布局
│   │   ├── index.tsx       # 入口页面
│   │   ├── login.tsx       # 登录页
│   │   ├── register.tsx    # 注册页
│   │   └── (tabs)/         # Tab 页面
│   │       ├── index.tsx   # 首页
│   │       ├── add.tsx     # 记账页
│   │       └── profile.tsx # 个人中心
│   ├── src/
│   │   ├── api/            # API 客户端
│   │   ├── types/          # TypeScript 类型
│   │   └── utils/          # 工具函数
│   └── package.json
│
└── README.md
```

## 部署指南

### 前置要求

- Node.js 18+
- npm 或 yarn
- [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
- Wrangler CLI（会自动安装）

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd saves
```

### 2. 部署后端 API

#### 2.1 安装依赖

```bash
cd saves-api
npm install
```

#### 2.2 登录 Cloudflare

```bash
npx wrangler login
```

#### 2.3 创建 D1 数据库

```bash
npx wrangler d1 create saves-db
```

执行后会输出类似以下内容：

```
✅ Successfully created DB 'saves-db'

[[d1_databases]]
binding = "DB"
database_name = "saves-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### 2.4 配置 wrangler.toml

复制示例配置文件：

```bash
cp wrangler.toml.example wrangler.toml
```

编辑 `wrangler.toml`，将 `database_id` 替换为上一步获取的 ID：

```toml
name = "saves-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[d1_databases]]
binding = "DB"
database_name = "saves-db"
database_id = "你的数据库ID"
```

#### 2.5 初始化数据库

```bash
# 创建表和预设数据
npx wrangler d1 execute saves-db --remote --file=./schema.sql

# 添加用户表
npx wrangler d1 execute saves-db --remote --file=./migration-users.sql
```

#### 2.6 部署 API

```bash
npx wrangler deploy
```

部署成功后会输出 API 地址，例如：
```
https://saves-api.your-subdomain.workers.dev
```

### 3. 部署前端应用

#### 3.1 安装依赖

```bash
cd ../saves-app
npm install
```

#### 3.2 配置 API 地址

编辑 `src/api/client.ts`，将 `API_BASE` 修改为你的后端 API 地址：

```typescript
const API_BASE = 'https://saves-api.your-subdomain.workers.dev';
```

#### 3.3 本地开发（可选）

```bash
# Web
npm run web

# Android
npm run android

# iOS (需要 macOS)
npm run ios
```

#### 3.4 构建并部署到 Cloudflare Pages

```bash
# 构建 Web 版本
npx expo export --platform web

# 创建 Pages 项目（首次部署）
npx wrangler pages project create saves-app --production-branch main

# 部署
npx wrangler pages deploy dist --project-name saves-app
```

部署成功后会输出前端地址，例如：
```
https://saves-app.pages.dev
```

## 本地开发

### 后端

```bash
cd saves-api
npm run dev
```

API 将在 `http://localhost:8787` 运行。

### 前端

```bash
cd saves-app
npm start
```

然后按提示选择运行平台（Web/Android/iOS）。

## 环境变量

### 后端 (saves-api)

后端配置通过 `wrangler.toml` 管理，主要配置项：

| 配置项 | 说明 |
|--------|------|
| `name` | Worker 名称 |
| `d1_databases.database_id` | D1 数据库 ID |

### 前端 (saves-app)

| 配置项 | 文件 | 说明 |
|--------|------|------|
| `API_BASE` | `src/api/client.ts` | 后端 API 地址 |

## API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户 |

### 分类

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/categories` | 获取所有分类 |
| POST | `/api/categories` | 创建分类 |

### 交易记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/transactions` | 获取交易记录 |
| POST | `/api/transactions` | 创建交易记录 |
| PUT | `/api/transactions/:id` | 更新交易记录 |
| DELETE | `/api/transactions/:id` | 删除交易记录 |

### 统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 获取统计数据 |
| GET | `/api/stats/monthly` | 获取月度统计 |

## 许可证

MIT License
