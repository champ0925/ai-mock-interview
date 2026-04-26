const Redis = require('ioredis');

// ioredis 默认会无限重连，且 maxRetriesPerRequest 默认 20 会阻塞业务代码很久。
// 这里显式给一组生产可用的策略：
// - lazyConnect: false（默认）—— 启动期立刻建连，方便快速发现配置错误
// - maxRetriesPerRequest: 3 —— 单条命令最多重试 3 次就抛错，避免业务被吊死
// - enableOfflineQueue: false —— Redis 断连时直接快速失败，由业务降级处理
// - retryStrategy: 指数退避，封顶 5s
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 200, 5000),
  reconnectOnError: (err) => {
    // 仅在 READONLY 等明确可恢复错误时让 ioredis 主动重连
    return err.message.includes('READONLY');
  },
});

redis.on('connect', () => console.log('[Redis] 连接已建立'));
redis.on('ready',   () => console.log('[Redis] 已就绪可读写'));
redis.on('error',   (err) => console.error('[Redis] 连接错误:', err.message));
redis.on('end',     () => console.warn('[Redis] 连接已关闭'));

const SESSION_PREFIX = 'interview_session:';
const SESSION_TTL = 2 * 60 * 60; // 2 小时过期

// 保存面试会话
async function saveSession(userId, sessionData) {
  const key = `${SESSION_PREFIX}${userId}`;
  await redis.setex(key, SESSION_TTL, JSON.stringify(sessionData));
}

// 获取面试会话
async function getSession(userId) {
  const key = `${SESSION_PREFIX}${userId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

// 删除面试会话（面试完成后清理）
async function clearSession(userId) {
  const key = `${SESSION_PREFIX}${userId}`;
  await redis.del(key);
}

// 优雅关闭时调用，释放 Redis 连接
async function closeRedis() {
  try { await redis.quit(); } catch { /* 已断开则忽略 */ }
}

module.exports = { saveSession, getSession, clearSession, closeRedis, redis };