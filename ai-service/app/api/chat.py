import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.core.llm_client import llm_client
from app.prompts.interviewer import INTERVIEWER_SYSTEM_PROMPT
from app.prompts.answer_evaluator import ANSWER_EVALUATOR_PROMPT

router = APIRouter()


class ChatRequest(BaseModel):
    resume_json: dict = {}
    jd_json: dict = {}
    questions: list = []
    current_index: int = 1
    user_answer: str = ""
    chat_history: list = []
    # 分析Agent传入的评估结果（可选，不传则面试官自主判断）
    need_follow_up: bool = False
    follow_up_question: str = ""
    eval_reason: str = ""


class FollowUpRequest(BaseModel):
    resume_json: dict = {}
    jd_json: dict = {}
    questions: list = []
    current_index: int = 1
    user_answer: str = ""
    chat_history: list = []


@router.post("/chat")
async def chat(req: ChatRequest):
    # 仅保留最近 N 轮（1 轮 = 面试官 + 候选人 2 条），降低 token 消耗与延迟
    MAX_HISTORY_TURNS = 4
    recent_history = req.chat_history[-(MAX_HISTORY_TURNS * 2):] if req.chat_history else []

    history_text = ""
    for msg in recent_history:
        role = "面试官" if msg.get("role") == "interviewer" else "候选人"
        history_text += f"{role}：{msg.get('content', '')}\n"

    total = len(req.questions)
    # 边界处理：
    # - current_index <= 0：异常入参，按"开场"返回
    # - current_index == total + 1：用户刚答完最后一题，应触发"面试结束语"，
    #   而不是错误地返回欢迎语（早期 bug：会让前端在面试结束时看到 AI 又冒出开场白）
    # - current_index > total + 1：远超范围，直接返回结束语
    if req.current_index <= 0:
        return StreamingResponse(
            iter(["你好，欢迎参加今天的面试。请先简单介绍一下自己。"]),
            media_type="text/plain; charset=utf-8"
        )
    if req.current_index > total:
        return StreamingResponse(
            iter(["好的，今天的面试到这里就结束了，感谢你的回答，稍后会为你生成评估报告。面试结束。"]),
            media_type="text/plain; charset=utf-8"
        )

    current_q = req.questions[req.current_index - 1] if req.current_index > 0 else {"text": "请开始"}
    question_text = current_q.get("text", "") if isinstance(current_q, dict) else str(current_q)

    user_prompt = "请继续面试"
    if req.current_index == 1 and not req.user_answer:
        user_prompt = "请开始面试"

    # 只给 LLM 传递"必要的最小上下文"，不再把整套 questions_json 丢过去。
    # 原因：把全部题目列表给 LLM 时，它有时会把后续题目一次性说完，甚至伪造
    # "候选人：[假设候选人回答]" 的多轮对话，严重偏离单轮面试官角色。
    # 现在只传：当前题 + 下一题简介（如果存在），LLM 无从脑补后续流程。
    next_q_text = ""
    if req.current_index < total:
        nq = req.questions[req.current_index]
        next_q_text = nq.get("text", "") if isinstance(nq, dict) else str(nq)

    is_last_question = req.current_index == total

    try:
        stream = llm_client.stream(
            system_prompt=INTERVIEWER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            model="plus",
            input_vars={
                "resume_json": json.dumps(req.resume_json, ensure_ascii=False),
                "jd_json": json.dumps(req.jd_json, ensure_ascii=False),
                # 只给一个摘要，不给全部 questions
                "questions_json": json.dumps(
                    {
                        "total": total,
                        "current_index": req.current_index,
                        "current_question": question_text,
                        "next_question": next_q_text,
                        "is_last_question": is_last_question,
                    },
                    ensure_ascii=False,
                ),
                "current_index": str(req.current_index),
                "total_count": str(total),
                "current_question": question_text,
                "chat_history": history_text,
                # 注入分析Agent评估结果
                "need_follow_up": "true" if req.need_follow_up else "false",
                "follow_up_question": req.follow_up_question,
                "eval_reason": req.eval_reason,
            }
        )

        # 脑补安全网：一旦 LLM 开始生成"候选人："或"[假设候选人回答]"等模式，
        # 说明它又在伪造多轮对话，立即截断流。
        # 实现思路：
        # - 维护 emitted（已输出长度）和 buffer（累计内容）
        # - 每来一个 chunk 就把它加到 buffer，再扫描全文找最早命中的禁用模式
        # - 没命中：把 buffer[emitted:] 全部 yield 出去
        # - 命中：把 buffer[emitted:hit] 作为最后一段 yield 出去后中断
        STOP_PATTERNS = ("候选人：", "候选人:", "[假设候选人", "【假设候选人", "假设你回答", "假设候选人回答")

        async def generate():
            buffer = ""
            emitted = 0
            for chunk in stream:
                buffer += chunk
                # 找到最早命中的禁用模式位置
                hit_idx = -1
                hit_pat = ""
                for pat in STOP_PATTERNS:
                    idx = buffer.find(pat, emitted)
                    if idx != -1 and (hit_idx == -1 or idx < hit_idx):
                        hit_idx = idx
                        hit_pat = pat
                if hit_idx != -1:
                    # 把命中点之前的尚未输出部分 yield 出去后立即结束
                    safe_tail = buffer[emitted:hit_idx]
                    if safe_tail:
                        yield safe_tail
                    print(
                        f"[Chat] ⚠️ 检测到 LLM 脑补多轮对话，已截断 "
                        f"(命中模式: {hit_pat!r}，丢弃 {len(buffer) - hit_idx} 字)"
                    )
                    return
                # 没命中：把这次 chunk 引入的新内容全部输出
                yield buffer[emitted:]
                emitted = len(buffer)

        return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对话生成失败: {str(e)}")


@router.post("/check_follow_up")
async def check_follow_up(req: FollowUpRequest):
    """
    分析 Agent：用 qwen-turbo 语义理解回答质量，智能决策是否追问。
    快速跳过信号仍用规则前置拦截，避免浪费 LLM 调用。
    """
    answer = req.user_answer.strip()

    # 前置规则：明确跳过信号，直接返回，不调用 LLM
    skip_signals = ["下一题", "跳过", "不知道", "不会", "换个问题", "pass", "skip", "过"]
    if any(signal in answer.lower() for signal in skip_signals):
        return {"need_follow_up": False, "follow_up_question": "", "reason": "候选人明确表示跳过"}

    # 获取当前题目文本
    current_q = {}
    if req.questions and 0 < req.current_index <= len(req.questions):
        current_q = req.questions[req.current_index - 1]
    question_text = current_q.get("text", "") if isinstance(current_q, dict) else str(current_q)

    # 构建简历和JD摘要（只传关键字段，降低 token 消耗）
    resume = req.resume_json
    resume_summary = json.dumps({
        "name": resume.get("name", ""),
        "skills": resume.get("skills", []),
        "experience": [
            {"company": e.get("company", ""), "title": e.get("title", "")}
            for e in (resume.get("experience") or [])[:3]
        ],
    }, ensure_ascii=False)

    jd = req.jd_json
    jd_summary = json.dumps({
        "title": jd.get("title", ""),
        "requirements": (jd.get("requirements") or [])[:5],
    }, ensure_ascii=False)

    # 调用分析 Agent（qwen-turbo）进行语义评估：二分类小任务，turbo 已足够
    try:
        result = llm_client.generate_json(
            system_prompt=ANSWER_EVALUATOR_PROMPT,
            user_prompt="请评估",
            model="turbo",
            input_vars={
                "resume_summary": resume_summary,
                "jd_summary": jd_summary,
                "current_question": question_text,
                "user_answer": answer,
            }
        )
        return {
            "need_follow_up": result.get("need_follow_up", False),
            "follow_up_question": result.get("follow_up_question", ""),
            "scores": result.get("scores", {}),
            "reason": result.get("reason", ""),
        }
    except Exception as e:
        # LLM 调用失败时降级到简单规则，保证面试流程不中断
        print(f"[EvaluatorAgent] 调用失败，降级到规则判断: {e}")
        need = len(answer) < 20
        return {
            "need_follow_up": need,
            "follow_up_question": "能再详细说说吗？" if need else "",
            "scores": {},
            "reason": "降级规则：回答过短",
        }