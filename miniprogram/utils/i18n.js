// 语言配置文件
const translations = {
  'zh-CN': {
    appName: '白板',
    appNameEn: 'White Board',
    myDrawings: '我的绘图',
    newDrawing: '新建绘图',
    drawing: '绘图',
    connected: '✓ 已连接',
    disconnected: '✗ 未连接',
    share: '分享',
    delete: '删除',
    confirmDelete: '确认删除',
    deleteConfirm: '确定要删除这个绘图吗？',
    deleteSuccess: '删除成功',
    noDrawings: '还没有绘图，点击"新建绘图"开始吧',
    loading: '加载中...',
    untitled: '未命名绘图',
    
    // 工具名称
    select: '选择',
    pen: '画笔',
    rectangle: '矩形',
    ellipse: '圆形',
    diamond: '菱形',
    arrow: '箭头',
    line: '直线',
    text: '文字',
    eraser: '橡皮',
    
    // 操作
    save: '保存',
    export: '导出',
    clear: '清空',
    undo: '撤销',
    redo: '重做',
    
    // 文字输入
    inputText: '输入文字',
    confirm: '确定',
    cancel: '取消',
    
    // 颜色
    color: '颜色',
    strokeWidth: '线宽',
    fill: '填充',
    
    // 提示
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
    exportSuccess: '导出成功',
    exportFailed: '导出失败',
    loadSuccess: '加载成功',
    loadFailed: '加载失败',
    loadFromLocal: '从本地加载',
    saveToLocal: '已保存到本地',
    saveToAlbum: '保存到相册',
    clearTitle: '确认清空',
    clearConfirm: '确定要清空画布吗？',
    clickToAddText: '点击画布添加文字',
    toolSelected: '已选择',
    selectColor: '选择颜色',
    selectWidth: '选择粗细',
    needPhotoPermission: '需要授权保存到相册，请在设置中开启权限',
    goToSettings: '去设置',
    permissionDenied: '未获得授权，无法保存图片',
    noContent: '画布为空，无法保存'
  },
  'en-US': {
    appName: 'White Board',
    appNameEn: 'White Board',
    myDrawings: 'My Drawings',
    newDrawing: 'New Drawing',
    drawing: 'Drawing',
    connected: '✓ Connected',
    disconnected: '✗ Disconnected',
    share: 'Share',
    delete: 'Delete',
    confirmDelete: 'Confirm Delete',
    deleteConfirm: 'Are you sure you want to delete this drawing?',
    deleteSuccess: 'Deleted successfully',
    noDrawings: 'No drawings yet. Click "New Drawing" to start',
    loading: 'Loading...',
    untitled: 'Untitled Drawing',
    
    // 工具名称
    select: 'Select',
    pen: 'Pen',
    rectangle: 'Rectangle',
    ellipse: 'Ellipse',
    diamond: 'Diamond',
    arrow: 'Arrow',
    line: 'Line',
    text: 'Text',
    eraser: 'Eraser',
    
    // 操作
    save: 'Save',
    export: 'Export',
    clear: 'Clear',
    undo: 'Undo',
    redo: 'Redo',
    
    // 文字输入
    inputText: 'Enter text',
    confirm: 'Confirm',
    cancel: 'Cancel',
    
    // 颜色
    color: 'Color',
    strokeWidth: 'Stroke Width',
    fill: 'Fill',
    
    // 提示
    saveSuccess: 'Saved successfully',
    saveFailed: 'Save failed',
    exportSuccess: 'Exported successfully',
    exportFailed: 'Export failed',
    loadSuccess: 'Loaded successfully',
    loadFailed: 'Load failed',
    loadFromLocal: 'Loaded from local',
    saveToLocal: 'Saved to local',
    saveToAlbum: 'Save to Album',
    clearTitle: 'Confirm Clear',
    clearConfirm: 'Are you sure you want to clear the canvas?',
    clickToAddText: 'Click canvas to add text',
    toolSelected: 'Selected',
    selectColor: 'Select Color',
    selectWidth: 'Select Width',
    needPhotoPermission: 'Need permission to save to album, please enable in settings',
    goToSettings: 'Go to Settings',
    permissionDenied: 'Permission denied, cannot save image',
    noContent: 'Canvas is empty, cannot save'
  }
}

// 获取当前语言
function getLanguage() {
  try {
    const lang = wx.getStorageSync('language') || 'zh-CN'
    return lang
  } catch (e) {
    return 'zh-CN'
  }
}

// 设置语言
function setLanguage(lang) {
  try {
    wx.setStorageSync('language', lang)
    return true
  } catch (e) {
    console.error('Failed to set language:', e)
    return false
  }
}

// 获取翻译文本
function t(key, lang) {
  const currentLang = lang || getLanguage()
  const translation = translations[currentLang]
  if (!translation) {
    console.warn(`Translation not found for language: ${currentLang}`)
    return translations['zh-CN'][key] || key
  }
  return translation[key] || translations['zh-CN'][key] || key
}

module.exports = {
  getLanguage,
  setLanguage,
  t,
  translations
}

