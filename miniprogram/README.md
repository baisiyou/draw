# Excalidraw 微信小程序

这是 Excalidraw 的微信小程序版本，使用 Render 作为后端服务。

## 功能特性

- 创建和编辑绘图
- 保存绘图到 Render 后端和本地存储（双重备份）
- 从后端或本地加载绘图
- 导出绘图为图片
- 分享绘图
- 后端连接状态显示

## 项目结构

```
miniprogram/
├── app.js              # 小程序入口文件
├── app.json            # 小程序全局配置
├── app.wxss            # 小程序全局样式
├── pages/              # 页面目录
│   ├── index/          # 首页（绘图列表）
│   └── canvas/         # 画布页面
├── utils/              # 工具函数
│   └── api.js          # API 调用工具（与 Render 后端通信）
└── project.config.json # 项目配置
```

## 部署步骤

### 1. 部署后端到 Render

1. 将代码推送到 GitHub 仓库
2. 登录 [Render](https://render.com)
3. 创建新的 Web Service
4. 连接你的 GitHub 仓库
5. 配置如下：
   - **Name**: `excalidraw-backend`（或你喜欢的名称）
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment Variables**:
     - `PORT`: `10000`
     - `NODE_ENV`: `production`
6. 点击 "Create Web Service"
7. 等待部署完成，记下分配的域名（例如：`https://excalidraw-backend.onrender.com`）

### 2. 配置微信小程序

1. **配置后端 API 地址**

   编辑 `app.js`，将 `apiBaseUrl` 设置为你的 Render 后端地址：

```javascript
globalData: {
     apiBaseUrl: 'https://excalidraw-backend.onrender.com',  // 替换为你的 Render 域名
     userInfo: null
}
```

2. **配置 AppID**

   编辑 `project.config.json`，设置你的微信小程序 AppID：

   ```json
   {
     "appid": "your-appid-here"
   }
   ```

3. **配置服务器域名**

   在微信公众平台配置服务器域名：
   - 登录 [微信公众平台](https://mp.weixin.qq.com)
   - 进入"开发" -> "开发管理" -> "开发设置"
   - 在"服务器域名"中添加你的 Render 后端域名（例如：`excalidraw-backend.onrender.com`）

### 3. 使用微信开发者工具

1. 打开微信开发者工具
2. 导入项目，选择 `miniprogram` 目录
3. 配置 AppID（测试可以使用测试号）
4. 编译并预览

## API 接口说明

后端提供以下 API 接口：

- `GET /health` - 健康检查
- `POST /v2/post` - 保存绘图数据
- `GET /v2/get/:id` - 获取绘图数据
- `DELETE /v2/delete/:id` - 删除绘图数据

## 数据存储

- **后端存储**：绘图数据保存在 Render 后端服务器
- **本地存储**：同时保存到微信小程序本地存储作为备份
- **加载策略**：优先从后端加载，失败时从本地加载

## 注意事项

1. **域名配置**：必须在微信公众平台配置服务器域名，否则无法访问后端 API
2. **HTTPS 要求**：微信小程序要求所有网络请求使用 HTTPS，Render 默认提供 HTTPS
3. **数据格式**：绘图数据以二进制格式（ArrayBuffer）传输
4. **网络错误处理**：如果后端不可用，会自动降级到本地存储模式
5. **Render 免费计划限制**：免费计划的服务在 15 分钟无活动后会休眠，首次请求可能需要等待唤醒

## 开发建议

1. 开发时可以使用本地后端服务器进行测试
2. 建议在 `app.js` 中添加环境变量来区分开发和生产环境
3. 可以添加更多错误处理和用户提示
4. 考虑添加数据同步功能，在恢复网络连接时同步本地数据到后端

## 故障排查

1. **无法连接后端**：
   - 检查 `app.js` 中的 `apiBaseUrl` 是否正确
   - 检查微信公众平台的服务器域名配置
   - 检查 Render 服务是否正常运行

2. **保存失败**：
   - 检查网络连接
   - 查看微信开发者工具的控制台错误信息
   - 检查后端服务日志

3. **数据丢失**：
   - 数据同时保存在本地和后端，可以从本地恢复
   - 检查本地存储是否被清除

