const app = getApp()

Page({
  data: {
    canvasId: 'excalidraw-canvas',
    drawingId: null,
    elements: [],
    appState: {
      viewBackgroundColor: '#ffffff',
      currentItemStrokeColor: '#000000',
      currentItemBackgroundColor: 'transparent',
      currentItemFillStyle: 'hachure',
      currentItemStrokeWidth: 1,
      currentItemRoughness: 1,
      currentItemOpacity: 100,
      currentItemFontFamily: 1,
      currentItemFontSize: 20,
      currentItemTextAlign: 'left',
      currentItemStrokeStyle: 'solid',
      currentItemRoundness: 'round',
      gridSize: null,
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0
    },
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentPath: null
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ drawingId: options.id })
      this.loadDrawing(options.id)
    }
  },

  // 加载绘图
  loadDrawing(id) {
    const drawings = wx.getStorageSync('drawings') || []
    const drawing = drawings.find(d => d.id === id)
    if (drawing) {
      this.setData({
        elements: drawing.elements || [],
        appState: drawing.appState || this.data.appState
      })
    }
  },

  // 保存绘图
  saveDrawing() {
    const drawings = wx.getStorageSync('drawings') || []
    const drawingData = {
      id: this.data.drawingId || Date.now().toString(),
      name: `绘图 ${new Date().toLocaleString()}`,
      elements: this.data.elements,
      appState: this.data.appState,
      time: new Date().toLocaleString()
    }

    if (this.data.drawingId) {
      const index = drawings.findIndex(d => d.id === this.data.drawingId)
      if (index >= 0) {
        drawings[index] = drawingData
      } else {
        drawings.push(drawingData)
      }
    } else {
      this.setData({ drawingId: drawingData.id })
      drawings.push(drawingData)
    }

    wx.setStorageSync('drawings', drawings)
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
  },

  // 导出绘图
  exportDrawing() {
    wx.showActionSheet({
      itemList: ['保存到相册', '分享'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.saveToAlbum()
        } else if (res.tapIndex === 1) {
          this.shareDrawing()
        }
      }
    })
  },

  // 保存到相册
  saveToAlbum() {
    const ctx = wx.createCanvasContext(this.data.canvasId)
    // 绘制所有元素
    this.data.elements.forEach(element => {
      this.drawElement(ctx, element)
    })
    ctx.draw(false, () => {
      wx.canvasToTempFilePath({
        canvasId: this.data.canvasId,
        success: (res) => {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              })
            }
          })
        }
      })
    })
  },

  // 绘制元素
  drawElement(ctx, element) {
    ctx.setStrokeStyle(element.strokeColor || '#000000')
    ctx.setFillStyle(element.backgroundColor || 'transparent')
    ctx.setLineWidth(element.strokeWidth || 1)

    switch (element.type) {
      case 'rectangle':
        ctx.beginPath()
        ctx.rect(element.x, element.y, element.width, element.height)
        ctx.stroke()
        if (element.backgroundColor !== 'transparent') {
          ctx.fill()
        }
        break
      case 'ellipse':
        ctx.beginPath()
        ctx.ellipse(
          element.x + element.width / 2,
          element.y + element.height / 2,
          element.width / 2,
          element.height / 2,
          0,
          0,
          2 * Math.PI
        )
        ctx.stroke()
        if (element.backgroundColor !== 'transparent') {
          ctx.fill()
        }
        break
      case 'line':
        ctx.beginPath()
        ctx.moveTo(element.points[0], element.points[1])
        for (let i = 2; i < element.points.length; i += 2) {
          ctx.lineTo(element.points[i], element.points[i + 1])
        }
        ctx.stroke()
        break
      case 'text':
        ctx.setFillStyle(element.strokeColor || '#000000')
        ctx.setFontSize(element.fontSize || 20)
        ctx.fillText(element.text, element.x, element.y)
        break
    }
  },

  // 触摸开始
  touchStart(e) {
    const touch = e.touches[0]
    const x = touch.x
    const y = touch.y

    this.setData({
      isDrawing: true,
      startX: x,
      startY: y
    })
  },

  // 触摸移动
  touchMove(e) {
    if (!this.data.isDrawing) return

    const touch = e.touches[0]
    const x = touch.x
    const y = touch.y

    // 创建简单的线条元素
    const newElement = {
      id: Date.now().toString(),
      type: 'line',
      strokeColor: this.data.appState.currentItemStrokeColor,
      strokeWidth: this.data.appState.currentItemStrokeWidth,
      points: [this.data.startX, this.data.startY, x, y],
      x: Math.min(this.data.startX, x),
      y: Math.min(this.data.startY, y),
      width: Math.abs(x - this.data.startX),
      height: Math.abs(y - this.data.startY)
    }

    const elements = [...this.data.elements, newElement]
    this.setData({
      elements,
      startX: x,
      startY: y
    })

    // 实时绘制
    const ctx = wx.createCanvasContext(this.data.canvasId)
    ctx.setStrokeStyle(newElement.strokeColor)
    ctx.setLineWidth(newElement.strokeWidth)
    ctx.beginPath()
    ctx.moveTo(this.data.startX, this.data.startY)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.draw()
  },

  // 触摸结束
  touchEnd(e) {
    this.setData({ isDrawing: false })
    this.saveDrawing()
  },

  // 清空画布
  clearCanvas() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空画布吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ elements: [] })
          const ctx = wx.createCanvasContext(this.data.canvasId)
          ctx.clearRect(0, 0, 1000, 1000)
          ctx.draw()
        }
      }
    })
  },

  // 选择工具
  selectTool(e) {
    const tool = e.currentTarget.dataset.tool
    // 这里可以切换不同的绘图工具
    console.log('Selected tool:', tool)
  }
})

