const app = getApp()

Page({
  data: {
    drawings: [],
    loading: false
  },

  onLoad() {
    this.loadDrawings()
  },

  // 加载绘图列表
  loadDrawings() {
    // 从本地存储加载
    const drawings = wx.getStorageSync('drawings') || []
    this.setData({ drawings })
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
  deleteDrawing(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个绘图吗？',
      success: (res) => {
        if (res.confirm) {
          const drawings = this.data.drawings.filter(d => d.id !== id)
          wx.setStorageSync('drawings', drawings)
          this.setData({ drawings })
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  },

  // 分享绘图
  shareDrawing(e) {
    const { id } = e.currentTarget.dataset
    const drawing = this.data.drawings.find(d => d.id === id)
    if (drawing) {
      wx.showShareMenu({
        withShareTicket: true
      })
    }
  }
})

