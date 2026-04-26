const express = require('express');
const authMiddleware = require('../middleware/auth');
const { saveSession, getSession, clearSession } = require('../services/sessionStore');

const router = express.Router();

// 保存会话状态
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { questions, current_index, messages, is_follow_up, has_followed_up } = req.body;
    await saveSession(req.userId, {
      questions,
      current_index,
      messages,
      is_follow_up,
      has_followed_up,
      saved_at: new Date().toISOString(),
    });
    res.json({ message: '会话已保存' });
  } catch (err) {
    console.error('保存会话失败:', err.message);
    res.status(500).json({ message: '保存失败', error: err.message });
  }
});

// 恢复会话状态
router.get('/restore', authMiddleware, async (req, res) => {
  try {
    const session = await getSession(req.userId);
    if (session) {
      res.json({ message: '会话已恢复', session });
    } else {
      res.json({ message: '无保存的会话', session: null });
    }
  } catch (err) {
    console.error('恢复会话失败:', err.message);
    res.status(500).json({ message: '恢复失败', error: err.message });
  }
});

// 清除会话（面试完成）
router.delete('/clear', authMiddleware, async (req, res) => {
  try {
    await clearSession(req.userId);
    res.json({ message: '会话已清除' });
  } catch (err) {
    console.error('清除会话失败:', err.message);
    res.status(500).json({ message: '清除失败', error: err.message });
  }
});

module.exports = router;