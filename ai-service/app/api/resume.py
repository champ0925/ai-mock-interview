import os
import json
import hashlib
import PyPDF2
import docx
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.core.llm_client import llm_client
from app.core.db_pool import get_db
from app.prompts.resume_parser import RESUME_PARSE_PROMPT

router = APIRouter()


def get_file_hash(file_path: str) -> str:
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha.update(chunk)
    return sha.hexdigest()


def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


def extract_text_from_docx(file_path: str) -> str:
    doc = docx.Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs]).strip()


@router.post("/parse_resume")
async def parse_resume(file: UploadFile = File(...), user_id: str = Form(...)):
    filename = file.filename.lower()
    if not (filename.endswith(".pdf") or filename.endswith(".docx") or filename.endswith(".doc")):
        raise HTTPException(status_code=400, detail="仅支持 PDF、DOC、DOCX 格式")

    # 保存临时文件
    os.makedirs("uploads/resumes", exist_ok=True)
    temp_path = f"uploads/resumes/{file.filename}"
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # 计算文件哈希
    file_hash = get_file_hash(temp_path)

    # 查缓存
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT parsed_json FROM resume_cache WHERE user_id = %s AND file_hash = %s",
            (int(user_id), file_hash)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if row:
            print(f"简历缓存命中: {file_hash[:16]}...")
            return json.loads(row[0])
    except Exception as e:
        print(f"简历缓存查询失败: {e}")

    # 提取文本
    try:
        if filename.endswith(".pdf"):
            text = extract_text_from_pdf(temp_path)
        else:
            text = extract_text_from_docx(temp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析失败: {str(e)}")

    if not text:
        raise HTTPException(status_code=400, detail="无法从文件中提取文本，请确认文件不是扫描图片")

    # 调大模型提取结构化信息
    try:
        parsed = llm_client.generate_json(
            system_prompt=RESUME_PARSE_PROMPT,
            user_prompt="{resume_text}",
            model="turbo",
            input_vars={"resume_text": text}
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"AI返回格式异常: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI解析失败: {e}")

    # 写入缓存
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO resume_cache (user_id, file_hash, parsed_json, original_name) VALUES (%s, %s, %s, %s)",
            (int(user_id), file_hash, json.dumps(parsed, ensure_ascii=False), file.filename)
        )
        conn.commit()
        cursor.close()
        conn.close()
        print(f"简历缓存已写入: {file_hash[:16]}...")
    except Exception as e:
        print(f"简历缓存写入失败: {e}")

    return parsed