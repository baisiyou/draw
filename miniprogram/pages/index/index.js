const app = getApp()
const api = require('../../utils/api.js')
const i18n = require('../../utils/i18n.js')

Page({
  data: {
    drawings: [],
    loading: false,
    backendConnected: false,
    language: 'zh-CN'
  },

  onLoad() {
    const lang = i18n.getLanguage()
    this.setData({ language: lang })
    this.updateTexts()
    this.checkBackend()
    this.loadDrawings()
  },

  onShow() {
    // 每次显示页面时刷新列表和语言
    const lang = i18n.getLanguage()
    if (this.data.language !== lang) {
      this.setData({ language: lang })
      this.updateTexts()
    }
    this.loadDrawings()
  },

  // 更新所有文本
  updateTexts() {
    const lang = this.data.language
    this.setData({
      texts: {
        myDrawings: i18n.t('myDrawings', lang),
        newDrawing: i18n.t('newDrawing', lang),
        connected: i18n.t('connected', lang),
        disconnected: i18n.t('disconnected', lang),
        share: i18n.t('share', lang),
        delete: i18n.t('delete', lang),
        noDrawings: i18n.t('noDrawings', lang),
        loading: i18n.t('loading', lang),
        untitled: i18n.t('untitled', lang)
      }
    })
  },

  // 切换语言
  switchLanguage() {
    const newLang = this.data.language === 'zh-CN' ? 'en-US' : 'zh-CN'
    app.switchLanguage(newLang)
    this.setData({ language: newLang })
    this.updateTexts()
    this.loadDrawings() // 刷新列表以更新日期格式等
  },


  // 检查后端连接
  async checkBackend() {
    try {
      console.log('开始检查后端连接...')
      await api.checkBackendHealth()
      console.log('后端连接成功')
      this.setData({ backendConnected: true })
    } catch (err) {
      console.log('后端连接失败:', err)
      this.setData({ backendConnected: false })
    }
  },

  // 加载绘图列表
  loadDrawings() {
    this.setData({ loading: true })
    // 从本地存储加载
    const drawings = wx.getStorageSync('drawings') || []
    // 按时间排序（兼容 iOS 日期格式）
    drawings.sort((a, b) => {
      const dateA = this.parseDate(a.time)
      const dateB = this.parseDate(b.time)
      return dateB - dateA
    })
    this.setData({ drawings, loading: false })
  },

  // 解析日期（兼容 iOS）
  parseDate(dateString) {
    if (!dateString) return new Date(0)
    // 尝试解析 ISO 格式
    if (dateString.includes('T') || dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(dateString)
    }
    // 尝试解析其他格式
    try {
      // 将 "12/30/2025, 11:25:50 PM" 转换为 ISO 格式
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        return date
      }
    } catch (e) {
      console.warn('Date parse error:', dateString, e)
    }
    return new Date(0)
  },

  // 创建新绘图
  createNewDrawing() {
    wx.navigateTo({
      url: '/pages/canvas/canvas'
    })
  },

  // 打开已有绘图
  openDrawing(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/canvas/canvas?id=${id}`
    })
  },

  // 删除绘图
  async deleteDrawing(e) {
    const { id } = e.currentTarget.dataset
    const lang = this.data.language
    wx.showModal({
      title: i18n.t('confirmDelete', lang),
      content: i18n.t('deleteConfirm', lang),
      success: async (res) => {
        if (res.confirm) {
          try {
            // 尝试从后端删除
            await api.deleteDrawingFromBackend(id)
          } catch (err) {
            console.log('从后端删除失败:', err)
            // 继续删除本地数据
          }
          
          // 删除本地数据
          const drawings = this.data.drawings.filter(d => d.id !== id)
          wx.setStorageSync('drawings', drawings)
          this.setData({ drawings })
          wx.showToast({
            title: i18n.t('deleteSuccess', lang),
            icon: 'success'
          })
        }
      }
    })
  },

  // 分享绘图 - 触发分享
  shareDrawing(e) {
    const { id } = e.currentTarget.dataset
    const drawing = this.data.drawings.find(d => d.id === id)
    if (drawing) {
      // 保存当前要分享的绘图ID
      this.shareDrawingId = id
      // 触发分享
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
    }
  },

  // 分享给朋友
  onShareAppMessage(res) {
    const lang = this.data.language
    let shareId = this.shareDrawingId
    
    // 如果没有指定分享ID，尝试从页面参数获取
    if (!shareId && res && res.from === 'button') {
      shareId = res.target.dataset.id
    }
    
    const drawing = shareId ? this.data.drawings.find(d => d.id === shareId) : null
    const title = drawing 
      ? (drawing.name || i18n.t('drawing', lang) + ' - ' + i18n.t('appName', lang))
      : i18n.t('myDrawings', lang) + ' - ' + i18n.t('appName', lang)
    
    return {
      title: title,
      path: shareId ? `/pages/canvas/canvas?id=${shareId}` : '/pages/index/index',
      imageUrl: '' // 可以添加分享图片
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const lang = this.data.language
    const shareId = this.shareDrawingId
    const drawing = shareId ? this.data.drawings.find(d => d.id === shareId) : null
    const title = drawing 
      ? (drawing.name || i18n.t('drawing', lang) + ' - ' + i18n.t('appName', lang))
      : i18n.t('myDrawings', lang) + ' - ' + i18n.t('appName', lang)
    
    return {
      title: title,
      query: shareId ? `id=${shareId}` : '',
      imageUrl: '' // 可以添加分享图片
    }
  }
})

