require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const { closeRedis } = require('./services/sessionStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/resume', require('./routes/resume'));
app.use('/api/jd', require('./routes/jd'));
app.use('/api/match', require('./routes/match'));
app.use('/api/question', require('./routes/question'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/report', require('./routes/report'));
app.use('/api/session', require('./routes/session'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

(async () => {
  try {
    await sequelize.authenticate();
    const p = sequelize.poolConfig || {};
    console.log(
      `[DB] 数据库连接成功 (pool: max=${p.max}, min=${p.min}, ` +
      `acquire=${p.acquire}ms, idle=${p.idle}ms, evict=${p.evict}ms)`
    );
    // 仅校验模型与表结构是否吻合，不做 alter（alter:true 会反复重建索引导致 ER_TOO_MANY_KEYS）。
    // 表结构由 database/init.sql 维护，迁移建议后续走 sequelize-cli migrations
    await sequelize.sync();
    console.log('[DB] 数据库模型校验完成');

    const server = app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });

    // 优雅关闭：收到 SIGINT / SIGTERM 时先停接新请求，再关闭连接池，避免野连接/慢查询被 kill -9
    const shutdown = async (signal) => {
      console.log(`\n[Shutdown] 收到 ${signal}，开始优雅关闭...`);
      server.close(async () => {
        try {
          await Promise.all([
            sequelize.close(),
            closeRedis(),
          ]);
          console.log('[Shutdown] 数据库与 Redis 连接已释放，进程退出');
          process.exit(0);
        } catch (err) {
          console.error('[Shutdown] 关闭连接时出错:', err);
          process.exit(1);
        }
      });
      // 兜底：10 秒内没完成关闭就强退，避免无限挂起
      setTimeout(() => {
        console.warn('[Shutdown] 10 秒超时，强制退出');
        process.exit(1);
      }, 10000).unref();
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
})();