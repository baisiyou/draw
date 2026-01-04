const app = getApp()
const api = require('../../utils/api.js')
const i18n = require('../../utils/i18n.js')

Page({
  data: {
    canvasId: 'whiteboard-canvas',
    drawingId: null,
    drawingName: null,
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
    toolbarExpanded: false, // 工具栏是否展开
    toolNames: {},
    language: 'zh-CN',
    texts: {},
    // 预设颜色
    presetColors: [
      '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
      '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
      '#ffc0cb', '#a52a2a', '#808080', '#008000', '#000080'
    ],
    strokeWidths: [1, 2, 3, 4, 5, 8, 10, 12, 15, 20]
  },

  onLoad(options) {
    // 初始化语言和文本
    const lang = i18n.getLanguage()
    this.setData({ language: lang })
    this.updateTexts()
    
    if (options.id) {
      this.setData({ drawingId: options.id })
      this.loadDrawing(options.id)
    } else {
      this.initCanvas()
    }
  },

  onShow() {
    // 检查语言是否变化
    const lang = i18n.getLanguage()
    if (this.data.language !== lang) {
      this.setData({ language: lang })
      this.updateTexts()
    }
  },

  // 更新所有文本
  updateTexts() {
    const lang = this.data.language
    this.setData({
      toolNames: {
        'select': i18n.t('select', lang),
        'pen': i18n.t('pen', lang),
        'rectangle': i18n.t('rectangle', lang),
        'ellipse': i18n.t('ellipse', lang),
        'diamond': i18n.t('diamond', lang),
        'arrow': i18n.t('arrow', lang),
        'line': i18n.t('line', lang),
        'text': i18n.t('text', lang),
        'eraser': i18n.t('eraser', lang)
      },
      texts: {
        inputText: i18n.t('inputText', lang),
        confirm: i18n.t('confirm', lang),
        cancel: i18n.t('cancel', lang),
        saveSuccess: i18n.t('saveSuccess', lang),
        saveFailed: i18n.t('saveFailed', lang),
        exportSuccess: i18n.t('exportSuccess', lang),
        exportFailed: i18n.t('exportFailed', lang),
        loadSuccess: i18n.t('loadSuccess', lang),
        loadFailed: i18n.t('loadFailed', lang),
        loadFromLocal: i18n.t('loadFromLocal', lang),
        saveToLocal: i18n.t('saveToLocal', lang),
        clearConfirm: i18n.t('clearConfirm', lang),
        clearTitle: i18n.t('clearTitle', lang),
        clickToAddText: i18n.t('clickToAddText', lang),
        toolSelected: i18n.t('toolSelected', lang),
        selectColor: i18n.t('selectColor', lang),
        selectWidth: i18n.t('selectWidth', lang)
      }
    })
  },

  // 切换语言
  switchLanguage() {
    const newLang = this.data.language === 'zh-CN' ? 'en-US' : 'zh-CN'
    app.switchLanguage(newLang)
    this.setData({ language: newLang })
    this.updateTexts()
  },

  onReady() {
    console.log('Page ready, initializing canvas...')
    this.initCanvas()
    
    // 测试触摸事件绑定
    setTimeout(() => {
      const query = wx.createSelectorQuery().in(this)
      query.select('.canvas-wrapper').boundingClientRect().exec((res) => {
        console.log('Canvas wrapper ready:', res)
        if (res && res[0]) {
          console.log('Canvas wrapper size:', {
            width: res[0].width,
            height: res[0].height,
            left: res[0].left,
            top: res[0].top
          })
        }
      })
    }, 500)
  },

  initCanvas() {
    setTimeout(() => {
      // 设置 canvas 尺寸
      const query = wx.createSelectorQuery().in(this)
      query.select('.canvas').fields({
        node: true,
        size: true
      }).exec((res) => {
        console.log('Canvas initialized:', res)
        this.redrawCanvas()
        this.saveHistory()
      })
    }, 200)
  },

  redrawCanvas() {
    const ctx = wx.createCanvasContext(this.data.canvasId)
    // 获取 canvas wrapper 实际尺寸
    const query = wx.createSelectorQuery().in(this)
    query.select('.canvas-wrapper').boundingClientRect((rect) => {
      const width = rect ? rect.width : 750
      const height = rect ? rect.height : 1000
      console.log('Redraw canvas with size:', { width, height })
      ctx.clearRect(0, 0, width, height)
      this.data.elements.forEach(element => {
        this.drawElement(ctx, element)
      })
      ctx.draw()
    }).exec()
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
        drawingId: id,
        drawingName: data.name || null
      })
      this.redrawCanvas()
      this.saveHistory()
      wx.showToast({ title: this.data.texts.loadSuccess || '加载成功', icon: 'success' })
    } catch (err) {
      console.log('从后端加载失败，尝试从本地加载:', err)
    const drawings = wx.getStorageSync('drawings') || []
    const drawing = drawings.find(d => d.id === id)
    if (drawing) {
      this.setData({
        elements: drawing.elements || [],
        appState: drawing.appState || this.data.appState,
        drawingName: drawing.name || null
      })
        this.redrawCanvas()
        this.saveHistory()
        wx.showToast({ title: this.data.texts.loadFromLocal || '从本地加载', icon: 'none' })
      } else {
        wx.showToast({ title: this.data.texts.loadFailed || '加载失败', icon: 'error' })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  async saveDrawing() {
    if (this.data.saving) return
    this.setData({ saving: true })
    
    // 使用兼容 iOS 的日期格式
    const now = new Date()
    const timeString = this.formatDate(now)
    const drawingData = {
      id: this.data.drawingId || Date.now().toString(),
      name: `${i18n.t('myDrawings', this.data.language) || '绘图'} ${timeString}`,
      elements: this.data.elements,
      appState: this.data.appState,
      time: timeString
    }

    if (!this.data.drawingId) {
      this.setData({ drawingId: drawingData.id })
    }

    try {
      const result = await api.saveDrawingToBackend(drawingData)
      if (result.id) {
        drawingData.id = result.id
        this.setData({ 
          drawingId: result.id,
          drawingName: drawingData.name
        })
      } else {
        this.setData({ drawingName: drawingData.name })
      }
      
      const drawings = wx.getStorageSync('drawings') || []
      const index = drawings.findIndex(d => d.id === drawingData.id)
      if (index >= 0) {
        drawings[index] = drawingData
      } else {
        drawings.push(drawingData)
      }
      wx.setStorageSync('drawings', drawings)
      
      wx.showToast({ title: this.data.texts.saveSuccess || '保存成功', icon: 'success' })
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
      wx.showToast({ title: this.data.texts.saveToLocal || '已保存到本地', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  exportDrawing() {
    const lang = this.data.language
    wx.showActionSheet({
      itemList: [i18n.t('saveToAlbum', lang) || '保存到相册', i18n.t('share', lang) || '分享'],
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
    const lang = this.data.language
    const saveImage = () => {
      // 检查是否有内容
      if (!this.data.elements || this.data.elements.length === 0) {
        wx.showToast({
          title: i18n.t('noContent', lang) || '画布为空，无法保存',
          icon: 'none',
          duration: 2000
        })
        return
      }

      // 重新绘制画布确保内容最新
      const ctx = wx.createCanvasContext(this.data.canvasId)
      
      // 获取画布尺寸
      wx.createSelectorQuery().in(this).select('.canvas-wrapper').boundingClientRect((rect) => {
        const width = rect ? rect.width : 750
        const height = rect ? rect.height : 1000
        
        // 清空并重绘
        ctx.clearRect(0, 0, width, height)
        this.data.elements.forEach(element => {
          this.drawElement(ctx, element)
        })
        
        // 绘制完成后再导出
        ctx.draw(false, () => {
          // iOS 和 Android 需要等待绘制完成
          setTimeout(() => {
            // 使用最简单的参数，让系统自动处理
            wx.canvasToTempFilePath({
              canvasId: this.data.canvasId,
              success: (res) => {
                console.log('canvasToTempFilePath 成功:', res)
                if (res.tempFilePath) {
                  // 验证文件是否存在
                  wx.getFileSystemManager().access({
                    path: res.tempFilePath,
                    success: () => {
                      // 文件存在，保存到相册
                      wx.saveImageToPhotosAlbum({
                        filePath: res.tempFilePath,
                        success: () => {
                          wx.showToast({ 
                            title: this.data.texts.saveSuccess || i18n.t('saveSuccess', lang) || '保存成功', 
                            icon: 'success',
                            duration: 2000
                          })
                        },
                        fail: (err) => {
                          console.error('saveImageToPhotosAlbum 失败:', err)
                          let errorMsg = i18n.t('saveFailed', lang) || '保存失败'
                          if (err.errMsg) {
                            console.error('错误信息:', err.errMsg)
                            if (err.errMsg.includes('auth deny') || err.errMsg.includes('permission') || err.errMsg.includes('authorize')) {
                              errorMsg = i18n.t('permissionDenied', lang) || '未获得授权，无法保存图片'
                            } else if (err.errMsg.includes('fail')) {
                              errorMsg = i18n.t('saveFailed', lang) || '保存失败，请重试'
                            }
                          }
                          wx.showToast({ 
                            title: errorMsg, 
                            icon: 'none',
                            duration: 2000
                          })
                        }
                      })
                    },
                    fail: (err) => {
                      console.error('文件不存在或无法访问:', err)
                      wx.showToast({ 
                        title: i18n.t('exportFailed', lang) || '导出失败，文件不存在', 
                        icon: 'none',
                        duration: 2000
                      })
                    }
                  })
                } else {
                  console.error('导出失败：未返回临时文件路径')
                  wx.showToast({ 
                    title: i18n.t('exportFailed', lang) || '导出失败', 
                    icon: 'none',
                    duration: 2000
                  })
                }
              },
              fail: (err) => {
                console.error('canvasToTempFilePath 失败:', err)
                let errorMsg = i18n.t('exportFailed', lang) || '导出失败'
                if (err.errMsg) {
                  console.error('错误详情:', err.errMsg)
                  // 尝试使用备用方法
                  if (err.errMsg.includes('canvas') || err.errMsg.includes('fail')) {
                    // 再次尝试，使用更长的延迟
                    setTimeout(() => {
                      wx.canvasToTempFilePath({
                        canvasId: this.data.canvasId,
                        success: (res2) => {
                          if (res2.tempFilePath) {
                            wx.saveImageToPhotosAlbum({
                              filePath: res2.tempFilePath,
                              success: () => {
                                wx.showToast({ 
                                  title: this.data.texts.saveSuccess || i18n.t('saveSuccess', lang) || '保存成功', 
                                  icon: 'success' 
                                })
                              },
                              fail: (err2) => {
                                console.error('保存到相册失败:', err2)
                                wx.showToast({ 
                                  title: i18n.t('saveFailed', lang) || '保存失败', 
                                  icon: 'none' 
                                })
                              }
                            })
                          }
                        },
                        fail: (err2) => {
                          console.error('备用方法也失败:', err2)
                          wx.showToast({ 
                            title: errorMsg, 
                            icon: 'none',
                            duration: 2000
                          })
                        }
                      })
                    }, 1000)
                    return
                  }
                }
                wx.showToast({ 
                  title: errorMsg, 
                  icon: 'none',
                  duration: 2000
                })
              }
            })
          }, 800) // iOS 和 Android 需要更长的延迟
        })
      }).exec()
    }

    // 检查权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum']) {
          // 已授权，直接保存
          saveImage()
        } else if (res.authSetting['scope.writePhotosAlbum'] === false) {
          // 用户之前拒绝过，需要引导打开设置
          wx.showModal({
            title: i18n.t('confirm', lang) || '提示',
            content: i18n.t('needPhotoPermission', lang) || '需要授权保存到相册，请在设置中开启权限',
            showCancel: true,
            confirmText: i18n.t('goToSettings', lang) || '去设置',
            cancelText: i18n.t('cancel', lang) || '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.writePhotosAlbum']) {
                      // 用户已授权，执行保存
                      saveImage()
                    } else {
                      wx.showToast({
                        title: i18n.t('permissionDenied', lang) || '未获得授权，无法保存图片',
                        icon: 'none'
                      })
                    }
                  }
                })
              }
            }
          })
        } else {
          // 未授权，请求授权
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => {
              // 用户同意授权，执行保存
              saveImage()
            },
            fail: () => {
              // 用户拒绝授权，提示并引导打开设置
              wx.showModal({
                title: i18n.t('confirm', lang) || '提示',
                content: i18n.t('needPhotoPermission', lang) || '需要授权保存到相册，请在设置中开启权限',
                showCancel: true,
                confirmText: i18n.t('goToSettings', lang) || '去设置',
                cancelText: i18n.t('cancel', lang) || '取消',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting['scope.writePhotosAlbum']) {
                          // 用户已授权，执行保存
                          saveImage()
                        } else {
                          wx.showToast({
                            title: i18n.t('permissionDenied', lang) || '未获得授权，无法保存图片',
                            icon: 'none'
                          })
                        }
                      }
                    })
                  }
                }
              })
            }
          })
        }
      },
      fail: (err) => {
        console.error('获取设置失败:', err)
        // 直接尝试保存，让系统提示权限
        saveImage()
      }
    })
  },

  drawElement(ctx, element) {
    // 检查元素是否有效
    if (!element || !element.type) {
      console.warn('Invalid element:', element)
      return
    }

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
        // 检查 points 是否存在且有效
        if (!element.points || !Array.isArray(element.points) || element.points.length < 2) {
          console.warn('Invalid line element points:', element)
          break
        }
        ctx.beginPath()
        ctx.moveTo(element.points[0], element.points[1])
        for (let i = 2; i < element.points.length; i += 2) {
          if (i + 1 < element.points.length) {
          ctx.lineTo(element.points[i], element.points[i + 1])
          }
        }
        ctx.stroke()
        break
      case 'arrow':
        this.drawArrow(ctx, element)
        break
      case 'text':
        // 检查 text 属性是否存在
        if (!element.text) {
          console.warn('Text element without text property:', element)
          break
        }
        ctx.setFillStyle(element.strokeColor || '#000000')
        ctx.setFontSize(element.fontSize || 20)
        ctx.fillText(element.text, element.x || 0, element.y || 0)
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
    // 如果正在显示文字输入框，不处理触摸事件
    if (this.data.showTextInput) {
      console.log('Touch ignored, text input is showing')
      return
    }
    
    console.log('=== touchStart called ===', {
      event: e,
      touches: e.touches,
      currentTool: this.data.currentTool
    })
    
    const touch = e.touches && e.touches[0]
    if (!touch) {
      console.error('No touch data in event:', e)
      return
    }
    
    console.log('Touch data:', {
      clientX: touch.clientX,
      clientY: touch.clientY,
      x: touch.x,
      y: touch.y,
      pageX: touch.pageX,
      pageY: touch.pageY
    })
    
    // 使用 query 获取 canvas-wrapper 位置并计算坐标
    const query = wx.createSelectorQuery().in(this)
    query.select('.canvas-wrapper').boundingClientRect().exec((res) => {
      console.log('Query result:', res)
      const rect = res && res[0]
      if (!rect) {
        console.error('Canvas wrapper not found, query result:', res)
        return
      }
      
      // 计算相对于 canvas 的坐标
      const x = (touch.clientX || touch.x || touch.pageX || 0) - rect.left
      const y = (touch.clientY || touch.y || touch.pageY || 0) - rect.top
      
      console.log('touchStart processed:', { 
        tool: this.data.currentTool, 
        x, 
        y,
        touch: { 
          clientX: touch.clientX, 
          clientY: touch.clientY, 
          x: touch.x, 
          y: touch.y,
          pageX: touch.pageX,
          pageY: touch.pageY
        },
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      })
      
      if (this.data.currentTool === 'text') {
        // 计算相对于页面的绝对位置
        const absoluteX = rect.left + x
        const absoluteY = rect.top + y
        console.log('Text input position:', { x, y, absoluteX, absoluteY, rect })
        
        // 延迟显示输入框，确保触摸事件处理完成
        // 先阻止后续的触摸事件
        this.setData({ 
          showTextInput: true,
          textInputX: absoluteX,
          textInputY: absoluteY,
          textInputValue: ''
        })
        
        // 延迟设置焦点，确保 DOM 已更新
        setTimeout(() => {
          console.log('Text input shown:', {
            showTextInput: true,
            textInputX: absoluteX,
            textInputY: absoluteY
          })
          // 强制设置焦点
          const query = wx.createSelectorQuery().in(this)
          query.select('.text-input').fields({ node: true, size: true }).exec((res) => {
            if (res && res[0]) {
              console.log('Text input element found, focusing...')
            }
          })
        }, 300)
        return
      }
      
      if (this.data.currentTool === 'select') {
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
        // 开始绘画时收起工具栏
        if (this.data.toolbarExpanded) {
          this.setData({ toolbarExpanded: false })
        }
    this.setData({
      isDrawing: true,
      startX: x,
      startY: y
    })
        console.log('Shape tool started:', this.data.currentTool, { x, y })
        return
      }
      
      // 画笔工具
      // 开始绘画时收起工具栏
      if (this.data.toolbarExpanded) {
        this.setData({ toolbarExpanded: false })
      }
      
      // 缓存 rect 以提高性能
      this.canvasRect = rect
      
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
      console.log('Pen tool started:', { x, y })
    })
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
    // 如果正在显示文字输入框，不处理移动事件
    if (this.data.currentTool === 'text' || this.data.showTextInput) return
    
    if (this.data.currentTool === 'select' && this.data.isDrawing && this.data.selectedElementId) {
      const touch = e.touches && e.touches[0]
      if (!touch) return
      
      const query = wx.createSelectorQuery().in(this)
      query.select('.canvas-wrapper').boundingClientRect().exec((res) => {
        const rect = res && res[0]
        if (!rect) return
        const x = (touch.clientX || touch.x || 0) - rect.left
        const y = (touch.clientY || touch.y || 0) - rect.top
        
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
      })
      return
    }
    
    if (['rectangle', 'ellipse', 'diamond', 'arrow', 'line'].includes(this.data.currentTool)) {
    if (!this.data.isDrawing) return

      const touch = e.touches && e.touches[0]
      if (!touch) return
      
      const query = wx.createSelectorQuery().in(this)
      query.select('.canvas-wrapper').boundingClientRect().exec((res) => {
        const rect = res && res[0]
        if (!rect) return
        const x = (touch.clientX || touch.x || 0) - rect.left
        const y = (touch.clientY || touch.y || 0) - rect.top
        
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
      })
      return
    }
    
    // 画笔工具处理
    if (this.data.currentTool === 'pen') {
      if (!this.data.isDrawing || !this.data.currentPath) return

      // iOS 上使用 changedTouches 或 touches，优先使用 changedTouches
      const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
      if (!touch) return
      
      // 缓存 rect 以减少查询次数（iOS 性能优化）
      if (!this.canvasRect) {
        const query = wx.createSelectorQuery().in(this)
        query.select('.canvas-wrapper').boundingClientRect().exec((res) => {
          this.canvasRect = res && res[0]
          if (this.canvasRect) {
            this.processPenMove(touch)
          }
        })
      } else {
        this.processPenMove(touch)
      }
      return
    }
    
    if (!this.data.isDrawing || !this.data.currentPath) return

    const touch = e.touches && e.touches[0]
    if (!touch) return
    
    const query = wx.createSelectorQuery().in(this)
    query.select('.canvas-wrapper').boundingClientRect().exec((res) => {
      const rect = res && res[0]
      if (!rect) return
      const x = (touch.clientX || touch.x || 0) - rect.left
      const y = (touch.clientY || touch.y || 0) - rect.top
      
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
    })
  },

  // 处理画笔移动（iOS 优化）
  processPenMove(touch) {
    if (!this.canvasRect || !this.data.isDrawing || !this.data.currentPath) return
    
    const x = (touch.clientX || touch.x || touch.pageX || 0) - this.canvasRect.left
    const y = (touch.clientY || touch.y || touch.pageY || 0) - this.canvasRect.top
    
    // 直接更新路径，减少 setData 调用
    const currentPath = {
      ...this.data.currentPath,
      points: [...this.data.currentPath.points, x, y]
    }
    
    // 批量更新，减少渲染次数
    this.setData({ currentPath })

    // 立即绘制，不等待查询
    const ctx = wx.createCanvasContext(this.data.canvasId)
    this.data.elements.forEach(element => {
      this.drawElement(ctx, element)
    })
    ctx.setStrokeStyle(currentPath.strokeColor)
    ctx.setLineWidth(currentPath.strokeWidth)
    ctx.beginPath()
    ctx.moveTo(currentPath.points[0], currentPath.points[1])
    for (let i = 2; i < currentPath.points.length; i += 2) {
      if (i + 1 < currentPath.points.length) {
        ctx.lineTo(currentPath.points[i], currentPath.points[i + 1])
      }
    }
    ctx.stroke()
    ctx.draw(false) // 使用 false 参数，立即绘制
  },

  touchEnd(e) {
    // 如果正在显示文字输入框，不处理结束事件
    if (this.data.currentTool === 'text' || this.data.showTextInput) return
    
    // 清除缓存的 rect
    this.canvasRect = null
    
    if (this.data.currentTool === 'select') {
      this.setData({ isDrawing: false })
      return
    }
    
    if (['rectangle', 'ellipse', 'diamond', 'arrow', 'line'].includes(this.data.currentTool)) {
      if (!this.data.isDrawing) {
        this.setData({ isDrawing: false })
        return
      }
      
      const touch = e.changedTouches && e.changedTouches[0]
      if (!touch) return
      
      const query = wx.createSelectorQuery().in(this)
      query.select('.canvas-wrapper').boundingClientRect().exec((res) => {
        const rect = res && res[0]
        if (!rect) return
        const x = (touch.clientX || touch.x || 0) - rect.left
        const y = (touch.clientY || touch.y || 0) - rect.top
        
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
      })
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

  onTextInputFocus(e) {
    console.log('Text input focused:', e)
  },

  onTextInput(e) {
    // 实时更新输入值
    console.log('Text input changed:', e.detail.value)
    this.setData({
      textInputValue: e.detail.value
    })
  },

  onTextInputConfirm(e) {
    // 防止重复调用
    if (!this.data.showTextInput) {
      console.log('Text input already closed, ignoring confirm')
      return
    }
    
    // 从事件或 data 中获取文字
    const text = (e && e.detail && e.detail.value ? e.detail.value : this.data.textInputValue || '').trim()
    console.log('Text input confirm:', { text, event: e, dataValue: this.data.textInputValue })
    
    // 立即关闭输入框，避免重复触发
    this.setData({
      showTextInput: false,
      textInputValue: ''
    })
    
    if (!text) {
      console.log('Text is empty, cancelling')
      return
    }
    
    // 使用保存的绝对坐标，避免查询 DOM
    const absoluteX = this.data.textInputX
    const absoluteY = this.data.textInputY
    
    // 计算相对于 canvas 的坐标
    try {
      const query = wx.createSelectorQuery().in(this)
      query.select('.canvas-wrapper').boundingClientRect().exec((res) => {
        const rect = res && res[0]
        if (!rect) {
          console.error('Canvas wrapper not found, using absolute coordinates')
          // 使用绝对坐标作为后备
          this.addTextElement(text, absoluteX, absoluteY)
          return
        }
        
        const x = absoluteX - rect.left
        const y = absoluteY - rect.top
        
        this.addTextElement(text, x, y)
      })
    } catch (err) {
      console.error('Error in text confirm query:', err)
      // 使用绝对坐标作为后备
      this.addTextElement(text, absoluteX, absoluteY)
    }
  },

  addTextElement(text, x, y) {
    try {
      const newElement = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'text',
        text: text,
        strokeColor: this.data.appState.currentItemStrokeColor,
        fontSize: this.data.appState.currentItemFontSize,
        x: x,
        y: y
      }
      
      console.log('Adding text element:', newElement)
      
      const elements = [...this.data.elements, newElement]
      this.setData({ elements }, () => {
        // 在 setData 完成后执行
        this.saveHistory()
        this.redrawCanvas()
        // 延迟执行 autoSave，避免阻塞
        setTimeout(() => {
          this.autoSave()
        }, 100)
      })
    } catch (err) {
      console.error('Error adding text element:', err)
    }
  },

  stopPropagation(e) {
    // 阻止事件冒泡和默认行为
    console.log('stopPropagation called')
    if (e) {
      if (e.stopPropagation) {
        e.stopPropagation()
      }
      if (e.preventDefault) {
        e.preventDefault()
      }
    }
  },

  confirmTextInput(e) {
    console.log('confirmTextInput called', e)
    // 防止重复调用
    if (!this.data.showTextInput) {
      console.log('Text input already closed, ignoring confirm button')
      return
    }
    
    // 按钮点击确认
    const text = this.data.textInputValue.trim()
    console.log('Confirm text input button clicked, value:', text, 'showTextInput:', this.data.showTextInput)
    
    if (text) {
      // 创建一个模拟事件对象
      this.onTextInputConfirm({ detail: { value: text } })
    } else {
      this.onTextInputCancel()
    }
  },

  onTextInputBlur(e) {
    // blur 事件延迟处理，避免立即取消
    console.log('Text input blur:', e, 'current value:', this.data.textInputValue)
    // 延迟更长时间，让用户有机会点击确定按钮
    setTimeout(() => {
      // 如果输入框仍然显示且没有值，才取消
      // 但不要立即取消，给用户时间点击确定按钮
      if (this.data.showTextInput && !this.data.textInputValue.trim()) {
        console.log('Text input blurred with no value, will cancel after delay')
        // 再延迟一点，确保用户点击确定按钮的事件能先处理
        setTimeout(() => {
          if (this.data.showTextInput && !this.data.textInputValue.trim()) {
            console.log('Text input cancelled after blur delay')
            this.onTextInputCancel()
          }
        }, 300)
      }
    }, 800)
  },

  onTextInputCancel(e) {
    console.log('onTextInputCancel called', e)
    console.log('Text input cancelled')
    this.setData({
      showTextInput: false,
      textInputValue: ''
    })
  },

  clearCanvas() {
    const lang = this.data.language
    wx.showModal({
      title: i18n.t('clearTitle', lang) || '确认清空',
      content: i18n.t('clearConfirm', lang) || '确定要清空画布吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ elements: [], selectedElementId: null })
          this.saveHistory()
          this.redrawCanvas()
        }
      }
    })
  },

  toggleToolbar() {
    this.setData({
      toolbarExpanded: !this.data.toolbarExpanded
    })
  },

  selectTool(e) {
    const tool = e.currentTarget.dataset.tool
    console.log('Tool selected:', tool)
    this.setData({ currentTool: tool, selectedElementId: null })
    
    if (tool === 'text') {
      wx.showToast({
        title: this.data.texts.clickToAddText || '点击画布添加文字',
        icon: 'none',
        duration: 2000
      })
    } else {
      wx.showToast({
        title: `${this.data.texts.toolSelected || '已选择'}${this.getToolName(tool)}`,
        icon: 'none',
        duration: 1000
      })
    }
    this.redrawCanvas()
  },

  getToolName(tool) {
    return this.data.toolNames[tool] || tool
  },

  // 显示颜色选择器
  showColorPicker() {
    this.setData({ showColorPicker: !this.data.showColorPicker })
  },

  // 选择颜色
  selectColor(e) {
    const color = e.currentTarget.dataset.color
    this.setData({
      'appState.currentItemStrokeColor': color,
      showColorPicker: false
    })
  },

  // 显示画笔粗细选择器
  showStrokeWidthPicker() {
    this.setData({ showStrokeWidthPicker: !this.data.showStrokeWidthPicker })
  },

  // 选择画笔粗细
  selectStrokeWidth(e) {
    const width = e.currentTarget.dataset.width
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
    // 触发分享菜单
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 分享给朋友
  onShareAppMessage(res) {
    const lang = this.data.language
    const drawingId = this.data.drawingId
    const drawingName = this.data.drawingName || i18n.t('drawing', lang)
    const appName = i18n.t('appName', lang)
    
    return {
      title: `${drawingName} - ${appName}`,
      path: drawingId ? `/pages/canvas/canvas?id=${drawingId}` : '/pages/canvas/canvas',
      imageUrl: '' // 可以添加分享图片
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const lang = this.data.language
    const drawingId = this.data.drawingId
    const drawingName = this.data.drawingName || i18n.t('drawing', lang)
    const appName = i18n.t('appName', lang)
    
    return {
      title: `${drawingName} - ${appName}`,
      query: drawingId ? `id=${drawingId}` : '',
      imageUrl: '' // 可以添加分享图片
    }
  },

  // 格式化日期（兼容 iOS）
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    // 使用 ISO 格式，兼容所有平台
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
})

