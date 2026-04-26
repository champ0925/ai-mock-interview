const { Sequelize } = require('sequelize');
require('dotenv').config();

// 池参数从 .env 读取，提供合理默认值。
// max:     最大并发连接数；建议 = 业务并发 P95 上限的 1.2 倍，过大会拖垮 MySQL
// min:     最小常驻连接数；保持几个热连接，避免每个请求都付建连成本
// acquire: 抢不到空闲连接时的最长等待（毫秒）；超时会抛 SequelizeConnectionAcquireTimeoutError
// idle:    连接空闲多久后被回收（毫秒）；要 < MySQL 的 wait_timeout（默认 28800s，但 Docker/RDS 常 60s）
// evict:   后台多久扫一次过期连接（毫秒）；定时主动剔除已被 MySQL 单方面断开的死连接
const pool = {
  max:     Number(process.env.DB_POOL_MAX     || 10),
  min:     Number(process.env.DB_POOL_MIN     || 2),
  acquire: Number(process.env.DB_POOL_ACQUIRE || 10000),
  idle:    Number(process.env.DB_POOL_IDLE    || 10000),
  evict:   Number(process.env.DB_POOL_EVICT   || 5000),
};

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
    },
    pool,
    // mysql2 驱动级超时，防止网络抖动时连接挂起到 acquire 超时才被发现
    dialectOptions: {
      connectTimeout: 10000,   // 单次握手最长 10s
    },
    // 启动期/失败时自动重试 3 次，避免容器编排冷启动时 MySQL 还没就绪就 crash
    retry: { max: 3 },
  }
);

// 暴露 pool 配置便于启动日志打印
sequelize.poolConfig = pool;

module.exports = sequelize;