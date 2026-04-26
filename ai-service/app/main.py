import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

from fastapi import FastAPI
from app.api import resume, jd, match, question, chat, report

app = FastAPI(title="AI Interview System - AI Service", version="1.0.0")

app.include_router(resume.router)
app.include_router(jd.router)
app.include_router(match.router)
app.include_router(question.router)
app.include_router(chat.router)
app.include_router(report.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)