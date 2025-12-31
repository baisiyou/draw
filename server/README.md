# Excalidraw Backend Server

后端 API 服务器，用于存储和管理 Excalidraw 绘图数据。

## 环境要求

- Node.js >= 18.0.0

## 安装

```bash
npm install
```

## 运行

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API 端点

### POST /v2/post
保存绘图数据

请求体：二进制数据（ArrayBuffer）

响应：
```json
{
  "id": "uuid"
}
```

### GET /v2/get/:id
获取绘图数据

响应：二进制数据（ArrayBuffer）

### DELETE /v2/delete/:id
删除绘图数据

响应：
```json
{
  "success": true
}
```

### GET /health
健康检查

响应：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 部署到 Render

1. 在 Render 创建新的 Web Service
2. 连接 GitHub 仓库
3. 设置：
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment: `Node`
   - Environment Variables: `PORT=10000`

