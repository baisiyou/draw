App({
  onLaunch() {
    // 初始化应用
    console.log('Excalidraw Mini Program launched');
  },
  globalData: {
    // 后端 API 地址，需要替换为实际的 Render 部署地址
    apiBaseUrl: 'https://your-app-name.onrender.com',
    userInfo: null
  }
})

