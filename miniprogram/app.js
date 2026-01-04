const i18n = require('./utils/i18n.js')

App({
  onLaunch() {
    // 初始化应用
    const lang = i18n.getLanguage()
    console.log('White Board Mini Program launched', lang);
    
    // 检查网络状态
    wx.getNetworkType({
      success: (res) => {
        console.log('Network type:', res.networkType);
      }
    });
    
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: i18n.t('appName', lang)
    })
  },
  globalData: {
    // 后端 API 地址 - Render 部署地址
    apiBaseUrl: 'https://draw-kkmt.onrender.com',
    userInfo: null,
    language: 'zh-CN'
  },
  // 切换语言
  switchLanguage(lang) {
    this.globalData.language = lang
    i18n.setLanguage(lang)
    wx.setNavigationBarTitle({
      title: i18n.t('appName', lang)
    })
  }
})

