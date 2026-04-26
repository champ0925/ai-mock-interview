"""
Chroma 向量数据库客户端（持久化模式 + 单例）。

设计要点：
- PersistentClient 写入磁盘：路径来自 .env 的 CHROMA_PERSIST_DIR
- collection 名称：CHROMA_COLLECTION，cosine 相似度
- 我们自己提供 embedding（不用 chroma 内置 embedding_function），所以传 embedding_function=None
- 路径用 ai-service 项目根做基准（与 .env 中相对路径保持一致）
"""
import os
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.config import Settings


_AI_SERVICE_ROOT = Path(__file__).resolve().parents[2]  # ai-service/


class _ChromaSingleton:
    _client: Optional[chromadb.PersistentClient] = None

    @classmethod
    def client(cls) -> chromadb.PersistentClient:
        if cls._client is None:
            persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
            persist_path = (_AI_SERVICE_ROOT / persist_dir).resolve()
            persist_path.mkdir(parents=True, exist_ok=True)

            cls._client = chromadb.PersistentClient(
                path=str(persist_path),
                settings=Settings(anonymized_telemetry=False, allow_reset=True),
            )
            print(f"[Chroma] 已初始化: persist_dir={persist_path}")
        return cls._client


def get_collection(reset: bool = False):
    """
    获取（必要时创建）题库 collection。

    :param reset: True 时删除已有 collection 重建，用于全量重新入库。
    """
    client = _ChromaSingleton.client()
    name = os.getenv("CHROMA_COLLECTION", "interview_questions")

    if reset:
        try:
            client.delete_collection(name)
            print(f"[Chroma] 已删除旧 collection: {name}")
        except Exception:
            pass  # 不存在时忽略

    # cosine 距离（向量已归一化时与点积等价），后续相似度 = 1 - distance
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
        embedding_function=None,  # 我们自己提供 embedding，不让 chroma 内置 ef 介入
    )


def collection_count() -> int:
    return get_collection().count()