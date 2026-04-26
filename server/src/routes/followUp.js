const express = require('express');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

router.post('/check_follow_up', authMiddleware, async (req, res) => {
  try {
    const { resume_json, jd_json, questions, current_index, user_answer, chat_history } = req.body;

    const response = await axios.post(`${AI_SERVICE_URL}/check_follow_up`, {
      resume_json,
      jd_json,
      questions,
      current_index,
      user_answer,
      chat_history,
    });

    res.json(response.data);
  } catch (err) {
    console.error('追问检测失败:', err.message);
    res.status(500).json({ message: '追问检测失败', error: err.message });
  }
});

module.exports = router;