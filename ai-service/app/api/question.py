"""
面试题生成接口：RAG 5 题 + LLM 3 题的混合方案。

流程：
1. 从 jd_json 提取岗位名作为 category 候选
2. 构造检索 query（JD 技能关键词 + 简历核心技能）
3. 从向量题库检索出 top-K 道题（默认 5）
4. 把题库已选题作为"上下文"传给 LLM，让它再生成 N 道互补题（默认 3）
5. 合并返回，每题带 source 字段：rag 或 llm
"""
import json
import os
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.llm_client import llm_client
from app.prompts.question_generation import QUESTION_GENERATION_PROMPT
from app.rag.retriever import retrieve, RetrievedQuestion

router = APIRouter()


class QuestionRequest(BaseModel):
    resume_json: dict
    jd_json: dict
    match_analysis: dict


def _rag_top_k() -> int:
    try:
        return int(os.getenv("RAG_TOP_K", "5"))
    except ValueError:
        return 5


def _llm_count() -> int:
    try:
        return int(os.getenv("LLM_QUESTIONS_COUNT", "3"))
    except ValueError:
        return 3


def _build_query(resume_json: dict, jd_json: dict) -> str:
    """把 JD 关键点 + 简历核心技能拼成一段检索文本"""
    parts: List[str] = []
    title = (jd_json or {}).get("title") or ""
    if title:
        parts.append(f"岗位: {title}")
    reqs = (jd_json or {}).get("requirements") or []
    if isinstance(reqs, list) and reqs:
        parts.append("任职要求: " + "; ".join(str(r) for r in reqs[:6]))
    resps = (jd_json or {}).get("responsibilities") or []
    if isinstance(resps, list) and resps:
        parts.append("岗位职责: " + "; ".join(str(r) for r in resps[:4]))

    skills = (resume_json or {}).get("skills") or []
    if isinstance(skills, list) and skills:
        parts.append("候选人技能: " + ", ".join(str(s) for s in skills[:10]))

    return " | ".join(parts) if parts else (title or "面试题")


def _match_category(jd_title: str) -> str | None:
    """
    根据 JD 岗位名匹配题库 category。
    策略：任一题库 category 是 jd_title 的子串，或 jd_title 是 category 的子串，即视为命中。
    """
    if not jd_title:
        return None

    # 扫描题库目录已有的 category（即 txt 文件名）
    from app.rag.loader import _bank_dir  # 复用路径解析
    bank = _bank_dir()
    if not bank.exists():
        return None

    for path in bank.glob("*.txt"):
        cat = path.stem
        if cat and (cat in jd_title or jd_title in cat):
            return cat
    return None


def _to_question_dict(rq: RetrievedQuestion) -> dict:
    return {
        "text": rq.text,
        "type": "knowledge_base",
        "target_jd_point": "",
        "source": "rag",
        "category": rq.category,
        "score": rq.score,
    }


@router.post("/generate_questions")
async def generate_questions(req: QuestionRequest):
    try:
        rag_k = _rag_top_k()
        llm_n = _llm_count()

        # 1) RAG 检索
        query = _build_query(req.resume_json, req.jd_json)
        jd_title = (req.jd_json or {}).get("title", "")
        category = _match_category(jd_title)
        rag_hits: List[RetrievedQuestion] = retrieve(query, category=category, top_k=rag_k)
        rag_questions = [_to_question_dict(r) for r in rag_hits]

        # 2) LLM 补题（基于已有题上下文）
        existing_text = "\n".join(f"- {r.text}" for r in rag_hits) if rag_hits else "（题库未命中，无已选题）"
        llm_resp = llm_client.generate_json(
            system_prompt=QUESTION_GENERATION_PROMPT,
            user_prompt="请生成与上述已选题互补的面试题",
            model="plus",
            input_vars={
                "resume_json": json.dumps(req.resume_json, ensure_ascii=False),
                "jd_json": json.dumps(req.jd_json, ensure_ascii=False),
                "match_analysis": json.dumps(req.match_analysis, ensure_ascii=False),
                "existing_questions": existing_text,
                "llm_count": str(llm_n),
            }
        )
        llm_questions = llm_resp.get("questions", []) if isinstance(llm_resp, dict) else []
        for q in llm_questions:
            q["source"] = "llm"

        # 3) 合并
        all_questions = rag_questions + llm_questions
        return {
            "questions": all_questions,
            "stats": {
                "rag_count": len(rag_questions),
                "llm_count": len(llm_questions),
                "total": len(all_questions),
                "category_matched": category,
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"AI返回格式异常: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"面试题生成失败: {e}")