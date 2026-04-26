"""
MySQL 连接池单例（基于 DBUtils.PooledDB 包装 pymysql）。

为什么需要这个模块？
- 此前 jd.py / resume.py 各自维护一份 DB_CONFIG 与 get_db()，每次 SQL 调用都
  pymysql.connect() 新建短连接、用完 close()。在并发场景下：
  * 每次握手 ~30ms，叠加在面试链路上明显拖慢
  * 高并发时容易触发 MySQL 的 max_connections 上限
  * 没有重连兜底，连接被防火墙/keep-alive 时间单方面断开后业务就 500

PooledDB 提供：
- 连接复用：mincached 个连接常驻、maxcached 个上限缓存
- 连接预校验：ping=1 在借出前 ping 一次，确保拿到的是活连接
- 阻塞排队：blocking=True，并发抢不到连接时排队而非立即抛错
- 线程安全：FastAPI 多 worker / 异步线程池都安全

调用方式（与原来 get_db() 完全一致，业务层零改动）：
    from app.core.db_pool import get_db
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(...)
    cursor.close()
    conn.close()    # 这里的 close 实际是把连接归还给池，并不真断开
"""
import os
from dbutils.pooled_db import PooledDB
import pymysql


_pool: PooledDB | None = None


def _build_pool() -> PooledDB:
    return PooledDB(
        creator=pymysql,                                 # 底层驱动
        maxconnections=int(os.getenv("DB_POOL_MAX", 10)),  # 池上限
        mincached=int(os.getenv("DB_POOL_MIN", 2)),        # 启动期热连接数
        maxcached=int(os.getenv("DB_POOL_MAX_IDLE", 5)),   # 最多缓存的空闲连接
        blocking=True,                                     # 抢不到连接时阻塞排队
        ping=1,                                            # 借出前 ping，避免拿到死连接
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "ai_interview"),
        charset="utf8mb4",
        connect_timeout=int(os.getenv("DB_CONNECT_TIMEOUT", 10)),
        autocommit=False,
    )


def get_db():
    """
    从连接池借一个连接出来。返回的对象用法与 pymysql.connect() 完全一致：
    支持 cursor() / commit() / close()。close() 会把连接归还给池而非真断开。
    """
    global _pool
    if _pool is None:
        _pool = _build_pool()
        print(
            f"[DB Pool] 已初始化: "
            f"max={os.getenv('DB_POOL_MAX', 10)}, "
            f"min={os.getenv('DB_POOL_MIN', 2)}, "
            f"max_idle={os.getenv('DB_POOL_MAX_IDLE', 5)}, ping=1, "
            f"target={os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
        )
    return _pool.connection()


def close_pool() -> None:
    """关闭整个池（仅在进程退出时调用）"""
    global _pool
    if _pool is not None:
        try:
            _pool.close()
        except Exception:
            pass
        _pool = None