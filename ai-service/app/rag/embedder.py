"""
通义千问 text-embedding-v4 嵌入封装。

特点：
- 模型名走 .env 配置（EMBEDDING_MODEL，默认 text-embedding-v4）
- 批量调用：v4 单次最大 25 条文本，自动分批
- 失败自动重试（指数退避，最多 3 次）
- 输入文本为空时返回空向量列表，避免 dashscope 抛错
"""
import os
import time
from typing import List

import dashscope
from dashscope import TextEmbedding


_BATCH_SIZE = 10  # text-embedding-v4 单次最多 10 条
_MAX_RETRIES = 3


def _ensure_api_key() -> None:
    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY 未配置，无法调用通义嵌入模型")
    dashscope.api_key = api_key


def _model_name() -> str:
    return os.getenv("EMBEDDING_MODEL", "text-embedding-v4")


def _call_once(texts: List[str]) -> List[List[float]]:
    """单次调用 dashscope 批量接口，返回向量列表（与输入顺序一致）"""
    resp = TextEmbedding.call(
        model=_model_name(),
        input=texts,
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"[Embedding] 调用失败 status={resp.status_code} code={resp.code} msg={resp.message}"
        )
    # dashscope 返回结构: resp.output['embeddings'] = [{'text_index': i, 'embedding': [...]}]
    items = resp.output["embeddings"]
    items_sorted = sorted(items, key=lambda x: x["text_index"])
    return [it["embedding"] for it in items_sorted]


def embed_texts(texts: List[str]) -> List[List[float]]:
    """批量向量化，自动分批 + 重试"""
    if not texts:
        return []
    _ensure_api_key()

    results: List[List[float]] = []
    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i:i + _BATCH_SIZE]
        last_err: Exception | None = None
        for attempt in range(_MAX_RETRIES):
            try:
                start = time.perf_counter()
                vectors = _call_once(batch)
                elapsed = time.perf_counter() - start
                print(
                    f"[Embedding] batch {i // _BATCH_SIZE + 1} "
                    f"({len(batch)} texts) -> {_model_name()} ({elapsed:.2f}s)"
                )
                results.extend(vectors)
                break
            except Exception as e:
                last_err = e
                wait = 2 ** attempt
                print(f"[Embedding] 第 {attempt + 1} 次失败: {e}，{wait}s 后重试...")
                time.sleep(wait)
        else:
            raise RuntimeError(f"[Embedding] 批次 {i} 重试 {_MAX_RETRIES} 次仍失败: {last_err}")
    return results


def embed_query(query: str) -> List[float]:
    """单条查询向量化（检索时使用）"""
    if not query or not query.strip():
        raise ValueError("query 不能为空")
    return embed_texts([query])[0]