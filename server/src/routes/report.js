const express = require('express');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

router.post('/generate', authMiddleware, async (req, res) => {
    try {
      console.log('请求AI服务:', `${AI_SERVICE_URL}/generate_report`);
      const response = await axios.post(`${AI_SERVICE_URL}/generate_report`, req.body);
      res.json({ message: '生成成功', report: response.data });
    } catch (err) {
      console.error('报告生成失败:', err.message);
      res.status(500).json({ message: '报告生成失败', error: err.message });
    }
  });

module.exports = router;