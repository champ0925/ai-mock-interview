const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const { parseResume } = require('../services/aiService');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/resumes'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PDF、DOC、DOCX 格式'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传简历文件' });
    }
    const parsedData = await parseResume(req.file.path, req.file.originalname, req.userId);
    res.json({
      message: '解析成功',
      resume_id: req.file.filename,
      parsed_data: parsedData,
    });
  } catch (err) {
    console.error('简历解析错误:', err.message);
    res.status(500).json({ message: '简历解析失败', error: err.message });
  }
});

module.exports = router;