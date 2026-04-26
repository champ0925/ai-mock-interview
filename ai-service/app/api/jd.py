import os
import json
import hashlib
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from app.core.llm_client import llm_client
from app.core.ocr_engine import ocr_engine
from app.core.db_pool import get_db
from app.prompts.jd_parser import JD_PARSE_PROMPT

router = APIRouter()


def get_file_hash(file_path: str) -> str:
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha.update(chunk)
    return sha.hexdigest()


def _parse_jd_with_llm(text: str) -> dict:
    """统一的 JD 文本 → 结构化 JSON 的 LLM 调用，封装了异常处理"""
    try:
        return llm_client.generate_json(
            system_prompt=JD_PARSE_PROMPT,
            user_prompt="{jd_text}",
            model="turbo",
            input_vars={"jd_text": text},
        )
    except ValueError as e:
        # JSON 格式异常（含重试失败）
        raise HTTPException(status_code=500, detail=f"AI返回格式异常: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI解析失败: {e}")


class JDTextRequest(BaseModel):
    jd_text: str


@router.post("/parse_jd_text")
async def parse_jd_text(req: JDTextRequest):
    text = req.jd_text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="JD文本不能为空")
    return _parse_jd_with_llm(text)


@router.post("/parse_jd_image")
async def parse_jd_image(file: UploadFile = File(...), user_id: str = Form("1")):
    filename = file.filename.lower()
    if not any(filename.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".bmp", ".webp"]):
        raise HTTPException(status_code=400, detail="仅支持 PNG、JPG、JPEG、BMP、WebP 格式")

    os.makedirs("uploads/jd_screenshots", exist_ok=True)
    temp_path = f"uploads/jd_screenshots/{file.filename}"
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # 计算文件哈希
    file_hash = get_file_hash(temp_path)

    # 查 OCR 缓存
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT ocr_text FROM ocr_cache WHERE user_id = %s AND file_hash = %s",
            (int(user_id), file_hash)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if row:
            text = row[0]
            print(f"OCR缓存命中: {file_hash[:16]}...")
            # 命中缓存：跳过 OCR，直接走 LLM 提取
            return _parse_jd_with_llm(text)
    except HTTPException:
        raise
    except Exception as e:
        print(f"OCR缓存查询失败: {e}")

    # 缓存未命中，调 OCR（使用统一的 ocr_engine 单例，懒加载）
    try:
        text = ocr_engine.extract_text(temp_path)
        if not text.strip():
            raise HTTPException(status_code=400, detail="OCR未能识别到文字")
        print(f"OCR识别文本长度: {len(text)}")

        # 写入 OCR 缓存
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO ocr_cache (user_id, file_hash, ocr_text, image_name) VALUES (%s, %s, %s, %s)",
                (int(user_id), file_hash, text, file.filename)
            )
            conn.commit()
            cursor.close()
            conn.close()
            print(f"OCR缓存已写入: {file_hash[:16]}...")
        except Exception as e:
            print(f"OCR缓存写入失败: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR识别失败: {e}")

    # LLM 提取结构化 JD
    return _parse_jd_with_llm(text)