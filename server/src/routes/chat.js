const express = require('express');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

router.post('/send', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/chat`,
      req.body,
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    response.data.pipe(res);
  } catch (err) {
    console.error('对话引擎错误:', err.message);
    res.status(500).json({ message: '对话生成失败', error: err.message });
  }
});

router.post('/check_follow_up', authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/check_follow_up`, req.body);
    res.json(response.data);
  } catch (err) {
    console.error('追问检测失败:', err.message);
    res.status(500).json({ message: '追问检测失败', error: err.message });
  }
});

module.exports = router;