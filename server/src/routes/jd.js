const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// 解析JD文本
router.post('/parse_text', authMiddleware, async (req, res) => {
  try {
    const { jd_text } = req.body;
    if (!jd_text || !jd_text.trim()) {
      return res.status(400).json({ message: 'JD文本不能为空' });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/parse_jd_text`, { jd_text });
    res.json({ message: '解析成功', parsed_jd: response.data });
  } catch (err) {
    console.error('JD文本解析错误:', err.message);
    res.status(500).json({ message: 'JD解析失败', error: err.message });
  }
});

// 上传JD截图
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/jd_screenshots'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.bmp', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PNG、JPG、JPEG、BMP、WebP 格式'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/upload_image', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传JD截图' });
    }

    const FormData = require('form-data');
    const fs = require('fs');
    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    const response = await axios.post(`${AI_SERVICE_URL}/parse_jd_image`, form, {
      headers: form.getHeaders(),
    });

    res.json({ message: '解析成功', parsed_jd: response.data });
  } catch (err) {
    console.error('JD截图解析错误:', err.message);
    res.status(500).json({ message: 'JD解析失败', error: err.message });
  }
});

module.exports = router;