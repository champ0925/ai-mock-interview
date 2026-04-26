import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.llm_client import llm_client
from app.prompts.report_generation import REPORT_GENERATION_PROMPT

router = APIRouter()


class ReportRequest(BaseModel):
    resume_json: dict = {}
    jd_json: dict = {}
    match_analysis: dict = {}
    questions: list = []
    chat_history: list = []


def _is_valid_user_answer(msg: dict) -> bool:
    """只有候选人的实质性回答才算有效，开场白/跳过标记/空串都不算。"""
    if msg.get("role") != "user":
        return False
    content = (msg.get("content") or "").strip()
    if not content:
        return False
    if content in ("[跳过]", "跳过", "skip", "pass"):
        return False
    return True


def _format_qa_pairs(questions: list, chat_history: list) -> str:
    """
    把题目数组 + 对话历史整理为「问→答」对形式的纯文本，
    让 LLM 不再需要自己从 role/content 里推断对应关系。

    策略：按题目顺序依次匹配，从上次匹配位置之后查找下一条非空、非跳过的用户回答作为该题答案。
    同一题可能对应多条 interviewer 消息（追问 + 下一题），
    只要命中一次 user 回答就认为该题被回答过。
    """
    lines: list[str] = []
    history = chat_history or []
    cursor = 0  # 在 chat_history 中推进的游标
    answered_count = 0

    for idx, q in enumerate(questions or [], start=1):
        q_text = q.get("text", "") if isinstance(q, dict) else str(q)
        # 从 cursor 之后找到第一条有效用户回答作为该题的作答
        user_answer = ""
        j = cursor
        while j < len(history):
            m = history[j]
            if _is_valid_user_answer(m):
                user_answer = (m.get("content") or "").strip()
                cursor = j + 1
                break
            j += 1
        if user_answer:
            answered_count += 1
            lines.append(f"【题目{idx}】{q_text}\n【候选人回答{idx}】{user_answer}")
        else:
            lines.append(f"【题目{idx}】{q_text}\n【候选人回答{idx}】（未作答或已跳过）")

    lines.append(f"\n【统计】共 {len(questions or [])} 道题，有效作答 {answered_count} 道。")
    return "\n\n".join(lines)


@router.post("/generate_report")
async def generate_report(req: ReportRequest):
    # 必须有候选人的有效回答，否则不调用 LLM，直接返回提示性空报告。
    valid_answers = [m for m in (req.chat_history or []) if _is_valid_user_answer(m)]

    if not req.chat_history or len(valid_answers) == 0:
        return {
            "overall_score": 0,
            "question_scores": [],
            "strengths": [],
            "weaknesses": ["检测到本次面试没有任何有效回答，无法生成评估报告。"],
            "suggestions": [
                "请至少回答 1 道题目后再结束面试。",
                "如果已开始作答但未提交，请返回面试页面完成答题。"
            ]
        }

    # 结构化的「题目-回答」配对文本，显著提升 LLM 逐题评分的准确性
    qa_pairs_text = _format_qa_pairs(req.questions, req.chat_history)

    # 后端日志：便于排障「LLM 拿到的究竟是什么」
    print(
        f"[Report] 生成开始：题目 {len(req.questions or [])} 道，"
        f"有效回答 {len(valid_answers)} 条，chat_history {len(req.chat_history or [])} 条"
    )
    # 打印前 600 字的 qa_pairs，用于核对结构化结果是否符合预期（不会打印太长，避免刷屏）
    qa_preview = qa_pairs_text[:600] + ("..." if len(qa_pairs_text) > 600 else "")
    print(f"[Report] qa_pairs 预览:\n{qa_preview}")

    try:
        result = llm_client.generate_json(
            system_prompt=REPORT_GENERATION_PROMPT,
            user_prompt="请严格按顺序对每一道题目评分，不得遗漏任何一题",
            use_max=True,
            input_vars={
                "resume_json": json.dumps(req.resume_json, ensure_ascii=False),
                "jd_json": json.dumps(req.jd_json, ensure_ascii=False),
                "match_analysis": json.dumps(req.match_analysis, ensure_ascii=False),
                "qa_pairs": qa_pairs_text,
                "total_questions": str(len(req.questions or [])),
            }
        )
        # 防御：若 LLM 仍然没有给出逐题评分，按 qa_pairs 补齐空壳，避免前端显示"已回答 0 题"
        scores = result.get("question_scores") or []
        if not scores:
            print("[Report] ⚠️ LLM 返回 question_scores 为空，按题目数补占位")
            result["question_scores"] = [
                {
                    "question": (q.get("text") if isinstance(q, dict) else str(q)),
                    "score": 0,
                    "comment": "未能生成评估（LLM 输出异常）",
                }
                for q in (req.questions or [])
            ]
        elif len(scores) < len(req.questions or []):
            # LLM 给的题数不够：按已有顺序保留，不够的题补占位
            print(
                f"[Report] ⚠️ LLM 仅返回 {len(scores)} 条评分，少于题目总数 "
                f"{len(req.questions or [])}，补占位"
            )
            need = len(req.questions or []) - len(scores)
            for i in range(need):
                q = req.questions[len(scores) + i]
                scores.append({
                    "question": (q.get("text") if isinstance(q, dict) else str(q)),
                    "score": 0,
                    "comment": "LLM 未对此题评分（已自动补齐）",
                })
            result["question_scores"] = scores

        print(
            f"[Report] 生成完成：question_scores={len(result.get('question_scores') or [])} 条，"
            f"overall={result.get('overall_score')}，"
            f"strengths={len(result.get('strengths') or [])}，"
            f"weaknesses={len(result.get('weaknesses') or [])}"
        )
        return result
    except ValueError as e:
        print(f"[Report] ❌ AI 返回非合法 JSON：{e}")
        raise HTTPException(status_code=500, detail=f"AI返回格式异常: {e}")
    except Exception as e:
        print(f"[Report] ❌ 报告生成失败：{e}")
        raise HTTPException(status_code=500, detail=f"报告生成失败: {e}")