const express = require('express');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { resume_json, jd_json, match_analysis } = req.body;
    if (!resume_json || !jd_json) {
      return res.status(400).json({ message: '请提供简历和JD数据' });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/generate_questions`, {
      resume_json,
      jd_json,
      match_analysis: match_analysis || {},
    });

    res.json({ message: '生成成功', questions: response.data.questions });
  } catch (err) {
    console.error('面试题生成错误:', err.message);
    res.status(500).json({ message: '面试题生成失败', error: err.message });
  }
});

module.exports = router;