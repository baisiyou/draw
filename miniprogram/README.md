# Excalidraw 微信小程序

这是 Excalidraw 的微信小程序版本前端。

## 功能特性

- 创建和编辑绘图
- 保存绘图到本地存储
- 导出绘图为图片
- 分享绘图
- 与后端 API 集成（可选）

## 项目结构

```
miniprogram/
├── app.js              # 小程序入口文件
├── app.json            # 小程序全局配置
├── app.wxss            # 小程序全局样式
├── pages/            # 页面目录
│   ├── index/        # 首页（绘图列表）
│   └── canvas/        # 画布页面
├── utils/             # 工具函数
│   └── api.js         # API 调用工具
└── project.config.json # 项目配置
```

## 配置

1. 在 `app.js` 中设置后端 API 地址：
```javascript
globalData: {
  apiBaseUrl: 'https://your-app-name.onrender.com'
}
```

2. 在 `project.config.json` 中设置你的 AppID

## 使用说明

1. 使用微信开发者工具打开此项目
2. 配置 AppID（测试可以使用测试号）
3. 编译并预览

## 注意事项

- 当前版本使用本地存储保存绘图数据
- 如需使用后端 API，需要在 `app.js` 中配置正确的 API 地址
- 画布功能为简化版本，完整功能需要集成 Excalidraw 核心库（需要适配微信小程序环境）

