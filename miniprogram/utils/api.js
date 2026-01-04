// API 工具函数
const app = getApp()

/**
 * 保存绘图到后端
 */
function saveDrawingToBackend(drawingData) {
  return new Promise((resolve, reject) => {
    // 将数据转换为二进制格式
    const jsonString = JSON.stringify(drawingData)
    
    // 微信小程序中需要将字符串转换为 ArrayBuffer
    const stringToArrayBuffer = (str) => {
      const buf = new ArrayBuffer(str.length)
      const bufView = new Uint8Array(buf)
      for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i)
      }
      return buf
    }
    
    const buffer = stringToArrayBuffer(jsonString)

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
          try {
            // 将 ArrayBuffer 转换为字符串
            const uint8Array = new Uint8Array(res.data)
            let jsonString = ''
            for (let i = 0; i < uint8Array.length; i++) {
              jsonString += String.fromCharCode(uint8Array[i])
            }
          const result = JSON.parse(jsonString)
          resolve(result)
          } catch (e) {
            console.error('Parse response error:', e)
            reject(new Error('解析响应失败'))
          }
        } else {
          reject(new Error(`保存失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        console.error('Request error:', err)
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
          try {
            // 将 ArrayBuffer 转换为字符串
            const uint8Array = new Uint8Array(res.data)
            let jsonString = ''
            for (let i = 0; i < uint8Array.length; i++) {
              jsonString += String.fromCharCode(uint8Array[i])
            }
          const data = JSON.parse(jsonString)
          resolve(data)
          } catch (e) {
            console.error('Parse response error:', e)
            reject(new Error('解析响应失败'))
          }
        } else if (res.statusCode === 404) {
          reject(new Error('绘图不存在'))
        } else {
          reject(new Error(`加载失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        console.error('Request error:', err)
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
          reject(new Error(`删除失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        console.error('Request error:', err)
        reject(err)
      }
    })
  })
}

/**
 * 检查后端健康状态
 */
function checkBackendHealth() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/health`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error('后端服务异常'))
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
  deleteDrawingFromBackend,
  checkBackendHealth
}

