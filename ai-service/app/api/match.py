import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.llm_client import llm_client
from app.prompts.match_analysis import MATCH_ANALYSIS_PROMPT

router = APIRouter()


class MatchRequest(BaseModel):
    resume_json: dict
    jd_json: dict


@router.post("/analyze_match")
async def analyze_match(req: MatchRequest):
    try:
        return llm_client.generate_json(
            system_prompt=MATCH_ANALYSIS_PROMPT,
            user_prompt="请分析",
            model="turbo",
            input_vars={
                "resume_json": json.dumps(req.resume_json, ensure_ascii=False),
                "jd_json": json.dumps(req.jd_json, ensure_ascii=False),
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"AI返回格式异常: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"匹配分析失败: {e}")