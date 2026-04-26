"""
题库检索器：根据岗位 + 查询文本，返回 top-k 相似题。

检索策略：
1. 若提供了 category 且该 category 在题库中存在，则用 where 过滤只在该岗位内检索；
2. 否则全库检索；
3. 结果按相似度（1 - cosine_distance）排序，过滤低于阈值的题；
4. 去重：同一 text 只保留一条。
"""
import os
from dataclasses import dataclass
from typing import List, Optional

from app.rag.embedder import embed_query
from app.rag.vector_store import get_collection


@dataclass
class RetrievedQuestion:
    text: str
    category: str
    source_file: str
    score: float  # 相似度，越大越相似（0~1）


def _threshold() -> float:
    try:
        return float(os.getenv("RAG_SCORE_THRESHOLD", "0.25"))
    except ValueError:
        return 0.25


def _default_top_k() -> int:
    try:
        return int(os.getenv("RAG_TOP_K", "5"))
    except ValueError:
        return 5


def _list_categories() -> List[str]:
    """从 collection 里统计已存在的 category 列表（用于判断某 category 是否存在）"""
    coll = get_collection()
    try:
        # chroma 没有直接的 distinct，拉全部 metadata 做集合
        data = coll.get(include=["metadatas"])
        cats = {m.get("category") for m in (data.get("metadatas") or []) if m}
        return [c for c in cats if c]
    except Exception:
        return []


def retrieve(
    query: str,
    category: Optional[str] = None,
    top_k: Optional[int] = None,
) -> List[RetrievedQuestion]:
    if not query or not query.strip():
        return []
    top_k = top_k or _default_top_k()
    coll = get_collection()
    if coll.count() == 0:
        print("[RAG] 题库为空，请先运行 `python -m app.rag.ingest` 入库")
        return []

    # category 兜底：若传入的 category 不存在于题库，则走全库
    where = None
    if category:
        existing = _list_categories()
        if category in existing:
            where = {"category": category}
        else:
            print(f"[RAG] 未找到岗位「{category}」匹配的题库，改为全库检索（已有: {existing}）")

    q_vec = embed_query(query)
    # 多取一些再过滤去重，保证 top_k 数量
    n_results = max(top_k * 2, top_k + 3)
    resp = coll.query(
        query_embeddings=[q_vec],
        n_results=min(n_results, coll.count()),
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    docs = resp.get("documents", [[]])[0]
    metas = resp.get("metadatas", [[]])[0]
    dists = resp.get("distances", [[]])[0]
    th = _threshold()

    seen: set[str] = set()
    out: List[RetrievedQuestion] = []
    for doc, meta, dist in zip(docs, metas, dists):
        score = 1.0 - float(dist)
        if score < th:
            continue
        if doc in seen:
            continue
        seen.add(doc)
        out.append(RetrievedQuestion(
            text=doc,
            category=(meta or {}).get("category", ""),
            source_file=(meta or {}).get("source_file", ""),
            score=round(score, 4),
        ))
        if len(out) >= top_k:
            break

    print(f"[RAG] 检索命中 {len(out)}/{top_k} 条 (category={category}, th={th})")
    return out