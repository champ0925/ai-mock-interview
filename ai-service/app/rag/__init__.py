"""RAG 模块：题库向量化 + 相似题检索

公开入口：
- embedder.embed_texts / embed_query
- vector_store.get_collection
- retriever.retrieve
- ingest（CLI 入口，python -m app.rag.ingest）
"""