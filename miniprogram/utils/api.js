// API 工具函数
const app = getApp()

/**
 * 保存绘图到后端
 */
function saveDrawingToBackend(drawingData) {
  return new Promise((resolve, reject) => {
    // 将数据转换为 ArrayBuffer
    const jsonString = JSON.stringify(drawingData)
    const encoder = new TextEncoder()
    const buffer = encoder.encode(jsonString).buffer

    wx.request({
      url: `${app.globalData.apiBaseUrl}/v2/post`,
      method: 'POST',
      data: buffer,
      header: {
        'Content-Type': 'application/octet-stream'
      },
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode === 200) {
          const decoder = new TextDecoder()
          const jsonString = decoder.decode(new Uint8Array(res.data))
          const result = JSON.parse(jsonString)
          resolve(result)
        } else {
          reject(new Error('保存失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 从后端加载绘图
 */
function loadDrawingFromBackend(id) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/v2/get/${id}`,
      method: 'GET',
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode === 200) {
          const decoder = new TextDecoder()
          const jsonString = decoder.decode(new Uint8Array(res.data))
          const data = JSON.parse(jsonString)
          resolve(data)
        } else {
          reject(new Error('加载失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 删除后端绘图
 */
function deleteDrawingFromBackend(id) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/v2/delete/${id}`,
      method: 'DELETE',
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error('删除失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

module.exports = {
  saveDrawingToBackend,
  loadDrawingFromBackend,
  deleteDrawingFromBackend
}

