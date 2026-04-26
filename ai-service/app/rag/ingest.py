"""
题库入库 CLI。

用法：
    cd ai-service
    venv\\Scripts\\python.exe -m app.rag.ingest             # 增量（按 hash id 覆盖同题）
    venv\\Scripts\\python.exe -m app.rag.ingest --reset     # 全量重建（先删 collection 再写）

注意：必须先 load .env，否则取不到 DASHSCOPE_API_KEY 等。
"""
import argparse
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

# 自动加载 ai-service/.env（与 main.py 一致）
_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_env_path)

from app.rag.embedder import embed_texts            # noqa: E402
from app.rag.loader import load_all                 # noqa: E402
from app.rag.vector_store import get_collection     # noqa: E402


def run(reset: bool = False) -> None:
    print(f"[Ingest] 开始入库 (reset={reset})")
    t0 = time.perf_counter()

    chunks = load_all()
    if not chunks:
        print("[Ingest] 题库为空，退出")
        return

    coll = get_collection(reset=reset)
    texts = [c.text for c in chunks]
    vectors = embed_texts(texts)

    ids = [c.id for c in chunks]
    metadatas = [
        {
            "category": c.category,
            "source_file": c.source_file,
            "chunk_index": c.chunk_index,
        }
        for c in chunks
    ]

    # upsert 保证幂等：同 id 覆盖
    coll.upsert(
        ids=ids,
        documents=texts,
        embeddings=vectors,
        metadatas=metadatas,
    )

    elapsed = time.perf_counter() - t0
    print(f"[Ingest] 完成 ✅  共 {len(chunks)} 道题，collection 现有 {coll.count()} 条，耗时 {elapsed:.1f}s")


def main() -> None:
    parser = argparse.ArgumentParser(description="RAG 题库入库")
    parser.add_argument("--reset", action="store_true", help="清空已有 collection 后重建")
    args = parser.parse_args()
    try:
        run(reset=args.reset)
    except Exception as e:
        print(f"[Ingest] 失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()