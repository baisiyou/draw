const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// 中间件
app.use(cors());
app.use(express.raw({ limit: '50mb', type: 'application/octet-stream' }));
app.use(express.json({ limit: '50mb' }));

// 确保数据目录存在
const DATA_DIR = path.join(__dirname, 'data');
const ensureDataDir = async () => {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
};

// 存储绘图数据的内存缓存（生产环境应使用数据库）
const drawings = new Map();

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 保存绘图数据
// POST /v2/post
app.post('/v2/post', async (req, res) => {
  try {
    const id = uuidv4();
    const buffer = req.body;
    
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ 
        error_class: 'InvalidRequestError',
        error: 'Empty request body' 
      });
    }

    // 检查大小限制（50MB）
    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(413).json({ 
        error_class: 'RequestTooLargeError',
        error: 'Request body too large' 
      });
    }

    // 存储数据（生产环境应使用数据库）
    drawings.set(id, buffer);
    
    // 可选：持久化到文件系统
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, `${id}.bin`);
    await fs.writeFile(filePath, buffer);

    res.json({ id });
  } catch (error) {
    console.error('Error saving drawing:', error);
    res.status(500).json({ 
      error_class: 'ServerError',
      error: 'Failed to save drawing' 
    });
  }
});

// 获取绘图数据
// GET /v2/get/:id
app.get('/v2/get/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先从内存缓存查找
    let buffer = drawings.get(id);
    
    // 如果内存中没有，尝试从文件系统读取
    if (!buffer) {
      const filePath = path.join(DATA_DIR, `${id}.bin`);
      try {
        buffer = await fs.readFile(filePath);
        // 存入内存缓存
        drawings.set(id, buffer);
      } catch (fileError) {
        return res.status(404).json({ 
          error_class: 'NotFoundError',
          error: 'Drawing not found' 
        });
      }
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error retrieving drawing:', error);
    res.status(500).json({ 
      error_class: 'ServerError',
      error: 'Failed to retrieve drawing' 
    });
  }
});

// 删除绘图数据
app.delete('/v2/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    drawings.delete(id);
    
    const filePath = path.join(DATA_DIR, `${id}.bin`);
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      // 文件不存在也视为成功
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting drawing:', error);
    res.status(500).json({ 
      error_class: 'ServerError',
      error: 'Failed to delete drawing' 
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  ensureDataDir();
});

