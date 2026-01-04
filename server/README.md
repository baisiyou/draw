# Excalidraw Backend Server

后端 API 服务器，用于存储和管理 Excalidraw 绘图数据。设计用于部署到 Render 平台，为微信小程序提供数据存储服务。

## 环境要求

- Node.js >= 18.0.0

## 安装

```bash
cd server
npm install
```

## 运行

开发模式（使用 nodemon 自动重启）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务器默认运行在端口 10000（可通过环境变量 `PORT` 配置）。

## API 端点

### POST /v2/post
保存绘图数据到服务器

**请求**:
- Method: `POST`
- Content-Type: `application/octet-stream`
- Body: 二进制数据（ArrayBuffer），最大 50MB

**响应**:
```json
{
  "id": "uuid-v4"
}
```

### GET /v2/get/:id
从服务器获取绘图数据

**请求**:
- Method: `GET`
- URL 参数: `id` - 绘图数据的唯一标识符

**响应**:
- Content-Type: `application/octet-stream`
- Body: 二进制数据（ArrayBuffer）

**错误响应** (404):
```json
{
  "error_class": "NotFoundError",
  "error": "Drawing not found"
}
```

### DELETE /v2/delete/:id
从服务器删除绘图数据

**请求**:
- Method: `DELETE`
- URL 参数: `id` - 绘图数据的唯一标识符

**响应**:
```json
{
  "success": true
}
```

### GET /health
健康检查端点

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 数据存储

当前实现使用：
- **内存缓存**：使用 Map 存储最近访问的数据
- **文件系统**：数据持久化到 `server/data/` 目录

**注意**：生产环境建议使用数据库（如 MongoDB、PostgreSQL）替代文件系统存储。

## 部署到 Render

### 使用 render.yaml（推荐）

项目根目录已包含 `render.yaml` 配置文件，可以直接使用：

1. 将代码推送到 GitHub
2. 在 Render 控制台选择 "New" -> "Blueprint"
3. 连接 GitHub 仓库
4. Render 会自动读取 `render.yaml` 并创建服务

### 手动部署

1. 在 Render 创建新的 Web Service
2. 连接 GitHub 仓库
3. 配置如下：
   - **Name**: `excalidraw-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment Variables**:
     - `PORT`: `10000`
     - `NODE_ENV`: `production`

### 环境变量

- `PORT`: 服务器端口（默认: 10000）
- `NODE_ENV`: 运行环境（`development` 或 `production`）

## CORS 配置

服务器已启用 CORS，允许来自任何域的请求。在生产环境中，建议限制允许的域名：

```javascript
app.use(cors({
  origin: 'https://your-allowed-domain.com'
}));
```

## 限制

- 单个请求最大 50MB
- 免费 Render 计划在 15 分钟无活动后会休眠
- 文件系统存储不适合大规模生产环境

## 故障排查

1. **端口冲突**：确保环境变量 `PORT` 正确设置
2. **数据目录权限**：确保服务器有权限创建和写入 `data/` 目录
3. **内存不足**：大量数据可能导致内存问题，建议使用数据库

## 安全建议

1. 添加身份验证（JWT、OAuth 等）
2. 实现请求频率限制
3. 添加输入验证和清理
4. 使用 HTTPS（Render 默认提供）
5. 限制允许的域名（CORS）

