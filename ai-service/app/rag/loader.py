"""
题库加载器：扫描 question_bank/*.txt，按空行切分为独立题目。

约定：
- 每个文件名（去扩展名）作为该批题的 category，例如 "前端工程师.txt" -> category="前端工程师"
- 题目之间用一个或多个空行分隔；题目内部允许换行（题干较长时）
- 自动忽略 # 开头的整行（作为题库注释）
"""
import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List


_AI_SERVICE_ROOT = Path(__file__).resolve().parents[2]


@dataclass
class QuestionChunk:
    id: str            # chroma 文档 id，用 hash 保证幂等
    text: str          # 题目正文
    category: str      # 岗位分类（文件名）
    source_file: str   # 来源文件名
    chunk_index: int   # 该文件内第几道


def _bank_dir() -> Path:
    bank = os.getenv("QUESTION_BANK_DIR", "./question_bank")
    return (_AI_SERVICE_ROOT / bank).resolve()


def _split_into_questions(raw: str) -> List[str]:
    """按空行切分，同时去掉 # 注释行"""
    # 先按空行分段
    blocks = []
    current: List[str] = []
    for line in raw.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            continue  # 注释行
        if stripped == "":
            if current:
                blocks.append("\n".join(current).strip())
                current = []
        else:
            current.append(line)
    if current:
        blocks.append("\n".join(current).strip())
    return [b for b in blocks if b]


def _make_id(category: str, index: int, text: str) -> str:
    """hash(category + index + text) 作为文档 id，重复入库时覆盖同一 id"""
    h = hashlib.md5(f"{category}::{index}::{text}".encode("utf-8")).hexdigest()
    return f"{category}-{index}-{h[:8]}"


def load_all() -> List[QuestionChunk]:
    """扫描题库目录，返回所有题目 chunk"""
    bank = _bank_dir()
    if not bank.exists():
        raise FileNotFoundError(f"题库目录不存在: {bank}")

    chunks: List[QuestionChunk] = []
    for path in sorted(bank.glob("*.txt")):
        category = path.stem
        raw = path.read_text(encoding="utf-8")
        questions = _split_into_questions(raw)
        for i, q in enumerate(questions):
            chunks.append(QuestionChunk(
                id=_make_id(category, i, q),
                text=q,
                category=category,
                source_file=path.name,
                chunk_index=i,
            ))
        print(f"[Loader] {path.name}: 解析 {len(questions)} 道题")
    return chunks