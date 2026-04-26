const express = require('express');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { resume_json, jd_json } = req.body;
    if (!resume_json || !jd_json) {
      return res.status(400).json({ message: '请提供简历和JD数据' });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/analyze_match`, {
      resume_json,
      jd_json,
    });

    res.json({ message: '分析完成', match_result: response.data });
  } catch (err) {
    console.error('匹配分析错误:', err.message);
    res.status(500).json({ message: '匹配分析失败', error: err.message });
  }
});

module.exports = router;