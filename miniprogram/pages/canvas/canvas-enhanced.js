const app = getApp()
const api = require('../../utils/api.js')

Page({
  data: {
    canvasId: 'whiteboard-canvas',
    drawingId: null,
    elements: [],
    history: [], // 历史记录用于撤销/重做
    historyIndex: -1, // 当前历史记录索引
    appState: {
      viewBackgroundColor: '#ffffff',
      currentItemStrokeColor: '#000000',
      currentItemBackgroundColor: 'transparent',
      currentItemFillStyle: 'hachure',
      currentItemStrokeWidth: 2,
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
    currentPath: null,
    saving: false,
    loading: false,
    currentTool: 'pen', // pen, rectangle, ellipse, text, arrow, line, diamond, eraser, select
    showTextInput: false,
    textInputX: 0,
    textInputY: 0,
    textInputValue: '',
    showColorPicker: false,
    showStrokeWidthPicker: false,
    selectedElementId: null, // 选中的元素ID
    // 预设颜色
    presetColors: [
      '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
      '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
      '#ffc0cb', '#a52a2a', '#808080', '#008000', '#000080'
    ],
    strokeWidths: [1, 2, 3, 4, 5, 8, 10, 12, 15, 20]
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ drawingId: options.id })
      this.loadDrawing(options.id)
    } else {
      this.initCanvas()
    }
  },

  onReady() {
    this.initCanvas()
  },

  initCanvas() {
    setTimeout(() => {
      this.redrawCanvas()
      this.saveHistory()
    }, 100)
  },

  redrawCanvas() {
    const ctx = wx.createCanvasContext(this.data.canvasId)
    ctx.clearRect(0, 0, 1000, 1000)
    this.data.elements.forEach(element => {
      this.drawElement(ctx, element)
    })
    ctx.draw()
  },

  onUnload() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (this.data.elements.length > 0) {
      this.saveDrawing()
    }
  },

  // 保存历史记录
  saveHistory() {
    const history = this.data.history.slice(0, this.data.historyIndex + 1)
    history.push(JSON.parse(JSON.stringify(this.data.elements)))
    this.setData({
      history: history.slice(-50), // 最多保存50步
      historyIndex: history.length - 1
    })
  },

  // 撤销
  undo() {
    if (this.data.historyIndex > 0) {
      const newIndex = this.data.historyIndex - 1
      this.setData({
        elements: JSON.parse(JSON.stringify(this.data.history[newIndex])),
        historyIndex: newIndex,
        selectedElementId: null
      })
      this.redrawCanvas()
    }
  },

  // 重做
  redo() {
    if (this.data.historyIndex < this.data.history.length - 1) {
      const newIndex = this.data.historyIndex + 1
      this.setData({
        elements: JSON.parse(JSON.stringify(this.data.history[newIndex])),
        historyIndex: newIndex,
        selectedElementId: null
      })
      this.redrawCanvas()
    }
  },

  async loadDrawing(id) {
    this.setData({ loading: true })
    try {
      const data = await api.loadDrawingFromBackend(id)
      this.setData({
        elements: data.elements || [],
        appState: data.appState || this.data.appState,
        drawingId: id
      })
      this.redrawCanvas()
      this.saveHistory()
      wx.showToast({ title: '加载成功', icon: 'success' })
    } catch (err) {
      console.log('从后端加载失败，尝试从本地加载:', err)
      const drawings = wx.getStorageSync('drawings') || []
      const drawing = drawings.find(d => d.id === id)
      if (drawing) {
        this.setData({
          elements: drawing.elements || [],
          appState: drawing.appState || this.data.appState
        })
        this.redrawCanvas()
        this.saveHistory()
        wx.showToast({ title: '从本地加载', icon: 'none' })
      } else {
        wx.showToast({ title: '加载失败', icon: 'error' })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  async saveDrawing() {
    if (this.data.saving) return
    this.setData({ saving: true })
    
    const drawingData = {
      id: this.data.drawingId || Date.now().toString(),
      name: `绘图 ${new Date().toLocaleString()}`,
      elements: this.data.elements,
      appState: this.data.appState,
      time: new Date().toLocaleString()
    }

    if (!this.data.drawingId) {
      this.setData({ drawingId: drawingData.id })
    }

    try {
      const result = await api.saveDrawingToBackend(drawingData)
      if (result.id) {
        drawingData.id = result.id
        this.setData({ drawingId: result.id })
      }
      
      const drawings = wx.getStorageSync('drawings') || []
      const index = drawings.findIndex(d => d.id === drawingData.id)
      if (index >= 0) {
        drawings[index] = drawingData
      } else {
        drawings.push(drawingData)
      }
      wx.setStorageSync('drawings', drawings)
      
      wx.showToast({ title: '保存成功', icon: 'success' })
    } catch (err) {
      console.error('保存到后端失败:', err)
      const drawings = wx.getStorageSync('drawings') || []
      const index = drawings.findIndex(d => d.id === drawingData.id)
      if (index >= 0) {
        drawings[index] = drawingData
      } else {
        drawings.push(drawingData)
      }
      wx.setStorageSync('drawings', drawings)
      wx.showToast({ title: '已保存到本地', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

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

  saveToAlbum() {
    const ctx = wx.createCanvasContext(this.data.canvasId)
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
              wx.showToast({ title: '保存成功', icon: 'success' })
            }
          })
        }
      })
    })
  },

  drawElement(ctx, element) {
    ctx.setStrokeStyle(element.strokeColor || '#000000')
    ctx.setFillStyle(element.backgroundColor || 'transparent')
    ctx.setLineWidth(element.strokeWidth || 2)

    // 如果是选中的元素，绘制选中框
    if (element.id === this.data.selectedElementId) {
      ctx.setStrokeStyle('#4a90e2')
      ctx.setLineWidth(2)
      ctx.setLineDash([5, 5])
    } else {
      ctx.setLineDash([])
    }

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
          0, 0, 2 * Math.PI
        )
        ctx.stroke()
        if (element.backgroundColor !== 'transparent') {
          ctx.fill()
        }
        break
      case 'diamond':
        ctx.beginPath()
        const centerX = element.x + element.width / 2
        const centerY = element.y + element.height / 2
        ctx.moveTo(centerX, element.y)
        ctx.lineTo(element.x + element.width, centerY)
        ctx.lineTo(centerX, element.y + element.height)
        ctx.lineTo(element.x, centerY)
        ctx.closePath()
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
      case 'arrow':
        this.drawArrow(ctx, element)
        break
      case 'text':
        ctx.setFillStyle(element.strokeColor || '#000000')
        ctx.setFontSize(element.fontSize || 20)
        ctx.fillText(element.text, element.x, element.y)
        break
    }
  },

  drawArrow(ctx, element) {
    const x1 = element.x
    const y1 = element.y
    const x2 = element.x + element.width
    const y2 = element.y + element.height
    
    // 绘制线条
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    
    // 绘制箭头
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const arrowLength = 15
    const arrowAngle = Math.PI / 6
    
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(
      x2 - arrowLength * Math.cos(angle - arrowAngle),
      y2 - arrowLength * Math.sin(angle - arrowAngle)
    )
    ctx.moveTo(x2, y2)
    ctx.lineTo(
      x2 - arrowLength * Math.cos(angle + arrowAngle),
      y2 - arrowLength * Math.sin(angle + arrowAngle)
    )
    ctx.stroke()
  },

  touchStart(e) {
    const touch = e.touches[0]
    const query = wx.createSelectorQuery()
    query.select('.canvas').boundingClientRect((rect) => {
      const x = touch.clientX - (rect ? rect.left : 0)
      const y = touch.clientY - (rect ? rect.top : 0)
      
      if (this.data.currentTool === 'text') {
        this.setData({
          showTextInput: true,
          textInputX: x,
          textInputY: y,
          textInputValue: ''
        })
        return
      }
      
      if (this.data.currentTool === 'select') {
        // 查找点击的元素
        const clickedElement = this.findElementAt(x, y)
        this.setData({ selectedElementId: clickedElement ? clickedElement.id : null })
        if (clickedElement) {
          this.setData({ 
            isDrawing: true,
            startX: x,
            startY: y,
            dragOffsetX: x - clickedElement.x,
            dragOffsetY: y - clickedElement.y
          })
        }
        this.redrawCanvas()
        return
      }
      
      if (this.data.currentTool === 'eraser') {
        this.eraseAt(x, y)
        return
      }
      
      if (['rectangle', 'ellipse', 'diamond', 'arrow', 'line'].includes(this.data.currentTool)) {
        this.setData({
          isDrawing: true,
          startX: x,
          startY: y
        })
        return
      }
      
      // 画笔工具
      this.setData({
        isDrawing: true,
        startX: x,
        startY: y,
        currentPath: {
          points: [x, y],
          strokeColor: this.data.appState.currentItemStrokeColor,
          strokeWidth: this.data.appState.currentItemStrokeWidth
        }
      })
    }).exec()
  },

  findElementAt(x, y) {
    // 从后往前查找（后绘制的在上层）
    for (let i = this.data.elements.length - 1; i >= 0; i--) {
      const element = this.data.elements[i]
      if (this.isPointInElement(x, y, element)) {
        return element
      }
    }
    return null
  },

  isPointInElement(x, y, element) {
    switch (element.type) {
      case 'rectangle':
        return x >= element.x && x <= element.x + element.width &&
               y >= element.y && y <= element.y + element.height
      case 'ellipse':
        const centerX = element.x + element.width / 2
        const centerY = element.y + element.height / 2
        const rx = element.width / 2
        const ry = element.height / 2
        return Math.pow((x - centerX) / rx, 2) + Math.pow((y - centerY) / ry, 2) <= 1
      case 'line':
        // 简化：检查是否在边界框内
        return x >= element.x && x <= element.x + element.width &&
               y >= element.y && y <= element.y + element.height
      case 'text':
        return x >= element.x && x <= element.x + 100 &&
               y >= element.y - 20 && y <= element.y
      default:
        return x >= element.x && x <= element.x + element.width &&
               y >= element.y && y <= element.y + element.height
    }
  },

  eraseAt(x, y) {
    const element = this.findElementAt(x, y)
    if (element) {
      const elements = this.data.elements.filter(e => e.id !== element.id)
      this.setData({ elements })
      this.saveHistory()
      this.redrawCanvas()
      this.autoSave()
    }
  },

  touchMove(e) {
    if (this.data.currentTool === 'text') return
    
    if (this.data.currentTool === 'select' && this.data.isDrawing && this.data.selectedElementId) {
      const touch = e.touches[0]
      const query = wx.createSelectorQuery()
      query.select('.canvas').boundingClientRect((rect) => {
        const x = touch.clientX - (rect ? rect.left : 0)
        const y = touch.clientY - (rect ? rect.top : 0)
        
        const elements = this.data.elements.map(element => {
          if (element.id === this.data.selectedElementId) {
            return {
              ...element,
              x: x - this.data.dragOffsetX,
              y: y - this.data.dragOffsetY
            }
          }
          return element
        })
        this.setData({ elements })
        this.redrawCanvas()
      }).exec()
      return
    }
    
    if (['rectangle', 'ellipse', 'diamond', 'arrow', 'line'].includes(this.data.currentTool)) {
      if (!this.data.isDrawing) return
      
      const touch = e.touches[0]
      const query = wx.createSelectorQuery()
      query.select('.canvas').boundingClientRect((rect) => {
        const x = touch.clientX - (rect ? rect.left : 0)
        const y = touch.clientY - (rect ? rect.top : 0)
        
        const ctx = wx.createCanvasContext(this.data.canvasId)
        this.data.elements.forEach(element => {
          this.drawElement(ctx, element)
        })
        
        ctx.setStrokeStyle(this.data.appState.currentItemStrokeColor)
        ctx.setLineWidth(this.data.appState.currentItemStrokeWidth)
        ctx.beginPath()
        
        if (this.data.currentTool === 'rectangle') {
          ctx.rect(
            Math.min(this.data.startX, x),
            Math.min(this.data.startY, y),
            Math.abs(x - this.data.startX),
            Math.abs(y - this.data.startY)
          )
        } else if (this.data.currentTool === 'ellipse') {
          ctx.ellipse(
            (this.data.startX + x) / 2,
            (this.data.startY + y) / 2,
            Math.abs(x - this.data.startX) / 2,
            Math.abs(y - this.data.startY) / 2,
            0, 0, 2 * Math.PI
          )
        } else if (this.data.currentTool === 'diamond') {
          const centerX = (this.data.startX + x) / 2
          const centerY = (this.data.startY + y) / 2
          ctx.moveTo(centerX, Math.min(this.data.startY, y))
          ctx.lineTo(Math.max(this.data.startX, x), centerY)
          ctx.lineTo(centerX, Math.max(this.data.startY, y))
          ctx.lineTo(Math.min(this.data.startX, x), centerY)
          ctx.closePath()
        } else if (this.data.currentTool === 'arrow' || this.data.currentTool === 'line') {
          ctx.moveTo(this.data.startX, this.data.startY)
          ctx.lineTo(x, y)
        }
        
        ctx.stroke()
        ctx.draw()
      }).exec()
      return
    }
    
    if (!this.data.isDrawing || !this.data.currentPath) return

    const touch = e.touches[0]
    const query = wx.createSelectorQuery()
    query.select('.canvas').boundingClientRect((rect) => {
      const x = touch.clientX - (rect ? rect.left : 0)
      const y = touch.clientY - (rect ? rect.top : 0)
      
      const currentPath = {
        ...this.data.currentPath,
        points: [...this.data.currentPath.points, x, y]
      }
      
      this.setData({ currentPath })

      const ctx = wx.createCanvasContext(this.data.canvasId)
      this.data.elements.forEach(element => {
        this.drawElement(ctx, element)
      })
      ctx.setStrokeStyle(currentPath.strokeColor)
      ctx.setLineWidth(currentPath.strokeWidth)
      ctx.beginPath()
      ctx.moveTo(currentPath.points[0], currentPath.points[1])
      for (let i = 2; i < currentPath.points.length; i += 2) {
        ctx.lineTo(currentPath.points[i], currentPath.points[i + 1])
      }
      ctx.stroke()
      ctx.draw()
    }).exec()
  },

  touchEnd(e) {
    if (this.data.currentTool === 'text') return
    
    if (this.data.currentTool === 'select') {
      this.setData({ isDrawing: false })
      return
    }
    
    if (['rectangle', 'ellipse', 'diamond', 'arrow', 'line'].includes(this.data.currentTool)) {
      if (!this.data.isDrawing) {
        this.setData({ isDrawing: false })
        return
      }
      
      const touch = e.changedTouches[0]
      const query = wx.createSelectorQuery()
      query.select('.canvas').boundingClientRect((rect) => {
        const x = touch.clientX - (rect ? rect.left : 0)
        const y = touch.clientY - (rect ? rect.top : 0)
        
        let newElement
        if (this.data.currentTool === 'arrow' || this.data.currentTool === 'line') {
          newElement = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: this.data.currentTool,
            strokeColor: this.data.appState.currentItemStrokeColor,
            strokeWidth: this.data.appState.currentItemStrokeWidth,
            x: this.data.startX,
            y: this.data.startY,
            width: x - this.data.startX,
            height: y - this.data.startY
          }
        } else {
          newElement = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: this.data.currentTool,
            strokeColor: this.data.appState.currentItemStrokeColor,
            strokeWidth: this.data.appState.currentItemStrokeWidth,
            backgroundColor: this.data.appState.currentItemBackgroundColor,
            x: Math.min(this.data.startX, x),
            y: Math.min(this.data.startY, y),
            width: Math.abs(x - this.data.startX),
            height: Math.abs(y - this.data.startY)
          }
        }
        
        const elements = [...this.data.elements, newElement]
        this.setData({ elements, isDrawing: false })
        this.saveHistory()
        this.redrawCanvas()
        this.autoSave()
      }).exec()
      return
    }
    
    if (!this.data.isDrawing || !this.data.currentPath) {
      this.setData({ isDrawing: false, currentPath: null })
      return
    }

    if (this.data.currentPath.points.length >= 4) {
      const points = this.data.currentPath.points
      const newElement = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'line',
        strokeColor: this.data.currentPath.strokeColor,
        strokeWidth: this.data.currentPath.strokeWidth,
        points: points,
        x: Math.min(...points.filter((_, i) => i % 2 === 0)),
        y: Math.min(...points.filter((_, i) => i % 2 === 1)),
        width: Math.max(...points.filter((_, i) => i % 2 === 0)) - Math.min(...points.filter((_, i) => i % 2 === 0)),
        height: Math.max(...points.filter((_, i) => i % 2 === 1)) - Math.min(...points.filter((_, i) => i % 2 === 1))
      }

      const elements = [...this.data.elements, newElement]
      this.setData({ elements, isDrawing: false, currentPath: null })
      this.saveHistory()
      this.redrawCanvas()
      this.autoSave()
    } else {
      this.setData({ isDrawing: false, currentPath: null })
    }
  },

  onTextInputConfirm(e) {
    const text = e.detail.value.trim()
    if (text) {
      const newElement = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'text',
        text: text,
        strokeColor: this.data.appState.currentItemStrokeColor,
        fontSize: this.data.appState.currentItemFontSize,
        x: this.data.textInputX,
        y: this.data.textInputY
      }
      
      const elements = [...this.data.elements, newElement]
      this.setData({
        elements,
        showTextInput: false,
        textInputValue: ''
      })
      this.saveHistory()
      this.redrawCanvas()
      this.autoSave()
    } else {
      this.setData({
        showTextInput: false,
        textInputValue: ''
      })
    }
  },

  onTextInputCancel() {
    this.setData({
      showTextInput: false,
      textInputValue: ''
    })
  },

  clearCanvas() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空画布吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ elements: [], selectedElementId: null })
          this.saveHistory()
          this.redrawCanvas()
        }
      }
    })
  },

  selectTool(e) {
    const tool = e.currentTarget.dataset.tool
    this.setData({ currentTool: tool, selectedElementId: null })
    
    if (tool === 'text') {
      wx.showToast({
        title: '点击画布添加文字',
        icon: 'none',
        duration: 2000
      })
    }
    this.redrawCanvas()
  },

  // 选择颜色
  selectColor(color) {
    this.setData({
      'appState.currentItemStrokeColor': color,
      showColorPicker: false
    })
  },

  // 选择画笔粗细
  selectStrokeWidth(width) {
    this.setData({
      'appState.currentItemStrokeWidth': width,
      showStrokeWidthPicker: false
    })
  },

  // 切换填充颜色
  toggleFill() {
    const newColor = this.data.appState.currentItemBackgroundColor === 'transparent' 
      ? this.data.appState.currentItemStrokeColor 
      : 'transparent'
    this.setData({
      'appState.currentItemBackgroundColor': newColor
    })
  },

  // 删除选中的元素
  deleteSelected() {
    if (this.data.selectedElementId) {
      const elements = this.data.elements.filter(e => e.id !== this.data.selectedElementId)
      this.setData({ elements, selectedElementId: null })
      this.saveHistory()
      this.redrawCanvas()
      this.autoSave()
    }
  },

  // 自动保存
  autoSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
    this.saveTimer = setTimeout(() => {
      this.saveDrawing()
    }, 1000)
  },

  shareDrawing() {
    wx.showShareMenu({
      withShareTicket: true
    })
  }
})

