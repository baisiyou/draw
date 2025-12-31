# 部署说明

本项目已改造为微信小程序前端 + Render 后端架构。

## 项目结构

```
excalidraw/
├── server/              # 后端 API 服务器
│   ├── server.js        # Express 服务器主文件
│   ├── package.json     # 后端依赖
│   └── README.md        # 后端说明文档
├── miniprogram/         # 微信小程序前端
│   ├── app.js          # 小程序入口
│   ├── app.json        # 小程序配置
│   ├── pages/          # 页面目录
│   └── utils/          # 工具函数
└── render.yaml         # Render 部署配置
```

## 后端部署到 Render

### 1. 准备工作

- 确保代码已推送到 GitHub 仓库
- 在 Render 注册账号并连接 GitHub

### 2. 创建 Web Service

1. 登录 Render Dashboard
2. 点击 "New +" -> "Web Service"
3. 连接你的 GitHub 仓库
4. 配置服务：
   - **Name**: excalidraw-backend
   - **Environment**: Node
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment Variables**:
     - `PORT`: 10000
     - `NODE_ENV`: production

### 3. 使用 render.yaml（推荐）

也可以直接使用 `render.yaml` 文件进行部署：

1. 在 Render Dashboard 中选择 "New +" -> "Blueprint"
2. 连接 GitHub 仓库
3. Render 会自动读取 `render.yaml` 配置

### 4. 获取部署地址

部署完成后，Render 会提供一个 URL，例如：
```
https://excalidraw-backend.onrender.com
```

## 微信小程序配置

### 1. 配置后端 API 地址

编辑 `miniprogram/app.js`，将 `apiBaseUrl` 设置为你的 Render 部署地址：

```javascript
globalData: {
  apiBaseUrl: 'https://your-app-name.onrender.com'
}
```

### 2. 配置 AppID

编辑 `miniprogram/project.config.json`，设置你的微信小程序 AppID：

```json
{
  "appid": "your-appid"
}
```

### 3. 使用微信开发者工具

1. 打开微信开发者工具
2. 选择 "导入项目"
3. 选择 `miniprogram` 目录
4. 输入 AppID（测试可以使用测试号）
5. 点击 "编译" 预览

## API 端点说明

### POST /v2/post
保存绘图数据

**请求**:
- Content-Type: `application/octet-stream`
- Body: 二进制数据（ArrayBuffer）

**响应**:
```json
{
  "id": "uuid-string"
}
```

### GET /v2/get/:id
获取绘图数据

**响应**: 二进制数据（ArrayBuffer）

### DELETE /v2/delete/:id
删除绘图数据

**响应**:
```json
{
  "success": true
}
```

### GET /health
健康检查

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 本地开发

### 后端

```bash
cd server
npm install
npm run dev  # 开发模式（使用 nodemon）
# 或
npm start    # 生产模式
```

服务器将在 `http://localhost:10000` 启动

### 前端

使用微信开发者工具打开 `miniprogram` 目录进行开发。

## 注意事项

1. **数据存储**: 当前后端使用内存和文件系统存储，生产环境建议使用数据库（如 MongoDB、PostgreSQL）

2. **CORS**: 后端已配置 CORS，允许跨域请求

3. **文件大小限制**: 默认限制为 50MB，可在 `server.js` 中调整

4. **安全性**: 生产环境建议添加：
   - 身份验证（JWT）
   - 请求限流
   - HTTPS
   - 数据加密

5. **微信小程序限制**: 
   - 需要配置服务器域名白名单
   - 在微信公众平台 -> 开发 -> 开发管理 -> 开发设置 -> 服务器域名中添加你的 Render 域名

## 后续优化建议

1. 使用数据库替代文件系统存储
2. 添加用户认证系统
3. 实现实时协作功能（WebSocket）
4. 添加图片上传和存储功能
5. 优化微信小程序画布性能
6. 集成完整的 Excalidraw 核心库（需要适配小程序环境）

