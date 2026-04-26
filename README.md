# AI 模拟面试系统 · 项目阅读文档

> 一份用于"5 分钟看清楚整个项目脉络"的导览。配合源代码一起看，可以从入门到深入。

---

## 1. 项目定位

一个端到端的"求职模拟面试"产品：

- 用户上传**简历** → 输入/截图**JD** → 系统做**匹配分析** → 生成**针对性面试题**
- 进入**模拟面试**：AI 面试官按题逐一提问、对薄弱回答自动**追问**
- 面试结束自动生成一份**结构化评估报告**（综合分 + 逐题评分 + 优势 / 不足 / 建议）

题目并非纯靠 LLM 生成，而是 **RAG 5 道（向量题库）+ LLM 3 道（针对简历差距/项目深挖）** 的混合策略，兼顾稳定性和针对性。

---

## 2. 顶层架构

```
┌────────────┐   HTTP/JSON    ┌─────────────┐   HTTP/JSON   ┌────────────────┐
│  client    │ ─────────────▶ │   server    │ ─────────────▶ │   ai-service   │
│ (Vite +    │                │ (Express +  │                │ (FastAPI +     │
│  React 19) │ ◀───────────── │  MySQL +    │ ◀───────────── │  通义千问 +     │
└────────────┘    JSON/Stream │  Redis)     │   JSON/Stream  │  Chroma + OCR) │
                              └─────────────┘                └────────────────┘
                                    │                                │
                                    ▼                                ▼
                              MySQL (用户/缓存)              Chroma (题库向量)
                              Redis (会话快照)                通义 Embedding/LLM
                                                            PaddleOCR (JD 截图)
```

三层职责清晰：

| 层 | 角色 | 关键能力 |
|---|---|---|
| **client** | 用户界面 + 状态机 | 路由守卫、流式渲染、面试状态机、本地兜底 |
| **server** | API 网关 + 鉴权 + 会话 | JWT 鉴权、Multer 上传、Redis 会话、转发 ai-service |
| **ai-service** | 真正的 AI 能力 | 简历/JD 解析、匹配分析、出题、对话、报告、RAG、OCR |

---

## 3. 目录结构总览

```
ai-mock-interview/
├── client/                  # 前端：Vite + React 19 + react-router 7
│   └── src/
│       ├── App.tsx          # 路由 + ProtectedRoute
│       ├── api/index.ts     # axios 实例 + 拦截器（自动带 token、401 跳登录）
│       └── pages/
│           ├── LoginPage.tsx           # 登录/注册
│           ├── ResumeUploadPage.tsx    # 上传简历
│           ├── JdInputPage.tsx         # 输入 JD（文本 / 截图）
│           ├── MatchResultPage.tsx     # 匹配分析结果展示
│           ├── InterviewPage.tsx       # 面试主页（状态机核心，~1100 行）
│           └── ReportPage.tsx          # 评估报告
├── server/                  # 后端：Node + Express + Sequelize + ioredis
│   └── src/
│       ├── app.js                       # 启动入口（含优雅关闭）
│       ├── config/database.js           # Sequelize 连接池
│       ├── middleware/auth.js           # JWT 中间件
│       ├── models/User.js               # 用户表 + bcrypt
│       ├── routes/                      # 业务路由（多数是转发到 ai-service）
│       │   ├── auth.js                  # 注册/登录/me
│       │   ├── resume.js                # 简历上传
│       │   ├── jd.js                    # JD 文本/截图
│       │   ├── match.js / question.js / chat.js / report.js
│       │   └── session.js               # Redis 会话 save/restore/clear
│       └── services/
│           ├── aiService.js             # axios 转发到 ai-service
│           └── sessionStore.js          # ioredis 单例 + 重连策略
├── ai-service/              # AI 服务：Python + FastAPI + LangChain + dashscope
│   └── app/
│       ├── main.py                      # FastAPI 入口，挂 6 大路由
│       ├── api/                         # HTTP 接口实现
│       │   ├── resume.py / jd.py        # 解析 + MySQL 缓存
│       │   ├── match.py                 # 匹配分析
│       │   ├── question.py              # ⭐ RAG + LLM 混合出题
│       │   ├── chat.py                  # ⭐ 流式对话 + 流式安全网
│       │   └── report.py                # ⭐ 结构化报告生成
│       ├── core/
│       │   ├── llm_client.py            # 通义千问统一封装（max/plus/turbo + JSON 解析 + 流式）
│       │   ├── ocr_engine.py            # PaddleOCR 单例
│       │   └── db_pool.py               # PooledDB 单例
│       ├── prompts/                     # 所有 Prompt 集中管理
│       │   ├── resume_parser.py / jd_parser.py
│       │   ├── match_analysis.py / question_generation.py
│       │   ├── interviewer.py           # ⭐ 面试官 Prompt（4 条最高优先级硬约束）
│       │   ├── answer_evaluator.py      # 追问决策 Agent
│       │   └── report_generation.py     # 报告生成
│       └── rag/                         # RAG 子模块
│           ├── embedder.py              # 通义 text-embedding-v4
│           ├── vector_store.py          # Chroma 持久化客户端
│           ├── loader.py                # 题库 .txt → QuestionChunk
│           ├── ingest.py                # CLI 入库脚本
│           └── retriever.py             # 检索 + 阈值过滤 + 去重
├── question_bank/                       # 5 个岗位题库（前端/后端/全栈/AI产品/AI应用）
├── chroma_db/                           # Chroma 持久化目录
├── database/init.sql                    # MySQL 表结构
└── docker-compose.yml                   # Redis 容器
```

---

## 4. 核心数据流（一次完整面试）

```
用户登录
   │
   ▼  POST /api/auth/login → JWT
[ResumeUploadPage]                                       [server/auth.js]
   │  POST /api/resume/upload (multipart)                [bcrypt + JWT]
   ▼                                                      │
[server/resume.js] ─→ multer 落盘 ─→ aiService.parseResume
                                            │
                                            ▼
                            [ai-service/resume.py]
                            ① sha256 计算文件哈希
                            ② resume_cache 命中则直接返回
                            ③ 未命中：PyPDF2/python-docx 取文本 → LLM(qwen-turbo) → JSON
                            ④ 写入 resume_cache (user_id + file_hash 唯一)
                                            │
                                            ▼
                                  resume_json 回到前端
[JdInputPage]
   │  文本：POST /api/jd/parse_text
   │  截图：POST /api/jd/upload_image (multipart)
   ▼
[server/jd.js] → ai-service/jd.py
                  ① 文本：直接 LLM 解析
                  ② 截图：sha256 → ocr_cache 命中复用 / 未命中 PaddleOCR → 再 LLM 解析
                          (OCR 单例懒加载，首调时才加载模型)

[MatchResultPage]
   POST /api/match/analyze → ai-service/match.py
                              MATCH_ANALYSIS_PROMPT (qwen-turbo)
                              产出 match_score / matched / missing / strengths / gaps

[InterviewPage] ── 进入面试 ──
   ① POST /api/question/generate → ai-service/question.py
        a. _build_query    把 JD title/requirements + 候选人 skills 拼成检索文本
        b. _match_category 根据 jd_title 匹配 question_bank/<岗位>.txt
        c. retrieve()      Chroma 向量检索 top-K (默认 5，带阈值过滤+去重)
        d. LLM 补 N 道（默认 3）：必须与已选题"互补"，含差距点 + 项目深挖 + 行为题
        e. 返回 questions[] 每条带 source: "rag"|"llm"

   ② 首条欢迎语：POST /api/chat/send（current_index=1, user_answer="")
                   流式返回 → 前端逐字渲染

   ③ 用户答题循环（直到答完所有题）：
        Step1. POST /api/chat/check_follow_up
                ↓ ANSWER_EVALUATOR_PROMPT (qwen-turbo)
                ↓ 返回 {need_follow_up, follow_up_question, scores, reason}
        Step2.a need_follow_up=true：前端直接把 follow_up_question 写入消息
                state 进入"追问中"，下一轮 Send 切回到下一题
        Step2.b need_follow_up=false：POST /api/chat/send 流式拉 AI 下一题
                进度立即 setCurrentIndex(nextIndex)
                流式末尾命中"面试结束"才进入结束态

   ④ 全程 autoSave → POST /api/session/save → Redis(SESSION_TTL=2h)
      切换/刷新页面会 GET /api/session/restore 回放

[ReportPage]
   POST /api/report/generate → ai-service/report.py
     ① _is_valid_user_answer 过滤空白/[跳过]
     ② _format_qa_pairs       按题号顺序游标推进，组装"题目X→候选人回答X"配对
     ③ REPORT_GENERATION_PROMPT (qwen-max) 生成结构化 JSON
     ④ 兜底：question_scores 不足题数自动补占位条目
     ⑤ 返回 overall_score / question_scores / strengths / weaknesses / suggestions

   前端兜底：localStorage 为空时自动 GET /api/session/restore 兜底
```

---

## 5. 三大子系统重点

### 5.1 ai-service：核心智能层

#### LLM 封装（[`llm_client.py`](ai-service/app/core/llm_client.py)）
- 单例 + 懒加载：max / plus / turbo 三档模型按需取用
- 注意 langchain `Tongyi` 的字段 alias 必须是 `model=`，别用 `model_name=`，否则会被静默忽略
- `generate_json()`：自动剥 Markdown 围栏 + 失败重试 + 强约束追加，最终拿不到合法 JSON 抛 `ValueError`
- `stream()`：带 TTFB / total 日志，便于排查首字节延迟

#### RAG 子模块（[`app/rag/`](ai-service/app/rag/)）
- `embedder.py` — 通义 `text-embedding-v4`，最多 10 条/批，指数退避重试
- `vector_store.py` — Chroma `PersistentClient`（cosine），单例，路径来自 `.env`
- `loader.py` — `question_bank/*.txt` 按空行切题，文件名作 category，hash 当 doc_id（幂等）
- `ingest.py` — CLI：`python -m app.rag.ingest [--reset]`
- `retriever.py` — 先 category 过滤、找不到回退全库，阈值 `RAG_SCORE_THRESHOLD` 默认 0.25

#### 出题策略（[`api/question.py`](ai-service/app/api/question.py)）
- 检索 query = "岗位:xx | 任职要求:... | 岗位职责:... | 候选人技能:..."
- top_k 默认 5（`RAG_TOP_K`），LLM 补 3（`LLM_QUESTIONS_COUNT`）
- 返回结构 `{ questions: [{text, source: "rag"|"llm", category?, score?, ...}], stats: {...} }`

#### 对话引擎（[`api/chat.py`](ai-service/app/api/chat.py)）
- 严格的入参收敛：只给 LLM 喂 `current_question + next_question + is_last_question`，**不**把整套 questions 丢过去（防 LLM 跳题）
- `STOP_PATTERNS` 流式安全网：一旦输出"候选人："/"[假设候选人..."/"假设你回答..."等模式，**截断流**并 return
- 边界处理：`current_index <= 0` → 欢迎语；`current_index > total` → 结束语

#### 面试官 Prompt（[`prompts/interviewer.py`](ai-service/app/prompts/interviewer.py)）
4 条最高优先级硬性规则：
1. **禁止跳题/跨题/回头**：只问 system 注入的 `{current_question}`
2. **追问 vs 推进必须严格按 `need_follow_up`**：true 只追问、false 直接说当前题
3. **只能扮演面试官**：禁前缀、禁脑补候选人、禁多轮对话
4. **不要自作主张结束面试**：只有最后一题且无需追问才允许说"面试结束"

#### 报告生成（[`api/report.py`](ai-service/app/api/report.py)）
- `_format_qa_pairs` 把题目数组 + 对话用游标算法配对成"题目X→候选人回答X"纯文本
- prompt 强约束 `question_scores` 长度必须 == `total_questions`、comment ≥ 20 字、strengths/weaknesses ≥ 15 字
- 兜底：LLM 给的题数不够时补占位条目，避免前端显示"已答 0 题"

### 5.2 server：薄网关层

- **80% 路由**只是 axios 转发到 ai-service：`resume / jd / match / question / chat / report`
- **真正自己实现的**：`auth`（JWT 注册/登录/me）+ `session`（Redis 会话）
- **Sequelize 连接池**（[`config/database.js`](server/src/config/database.js)）：max/min/acquire/idle/evict 全可调，启动期失败自动重试 3 次
- **ioredis 配置**（[`services/sessionStore.js`](server/src/services/sessionStore.js)）：`maxRetriesPerRequest=3` + `enableOfflineQueue=false` + 指数退避，避免业务被吊死
- **优雅关闭**（[`app.js`](server/src/app.js)）：SIGINT/SIGTERM 先 `server.close` 再释放 DB/Redis 连接，10s 兜底强退
- 流式转发：[`routes/chat.js`](server/src/routes/chat.js) 用 `responseType: 'stream'` + `pipe(res)` 把 ai-service 的字节流原样穿透到前端

### 5.3 client：前端状态机

#### [`InterviewPage.tsx`](client/src/pages/InterviewPage.tsx) — 整个项目最复杂的状态机
状态：
- `questions / messages / currentIndex / interviewOver`
- `isFollowUp / hasFollowedUp` —— 追问态机器
- `loading / aiTyping / aiBuffer` —— 流式 UI

关键设计：
- **进度立即推进**：`streamChat` 入口就 `setCurrentIndex(nextIndex)`，不等流结束（避免 LLM 异常时进度永远卡死）
- **isFollowUpRound 参数**：追问轮跳过进度推进 + 跳过结束态判定
- **结束态收紧判定**：`末题(nextIndex >= length) + 末尾80字命中正则` 才进入结束态
- **autoSave 显式状态 override**：避免 React 异步 state 导致 Redis 写入旧值
- **didInitRef 幂等守卫**：抗 React 18 StrictMode 双触发 + HMR 重入
- **handleEnd**：写 localStorage + autoSave，**不**清 Redis（留给 ReportPage 兜底）
- **流式渲染**：`fetch + reader.read()` 增量解码，按字符级追加 `messages[aiMsgIndex].content`

#### [`ReportPage.tsx`](client/src/pages/ReportPage.tsx)
- 优先 localStorage → 空了 fallback `/session/restore` → Redis 也空才传空数组（最后还有后端兜底）
- "重新生成"按钮 + "重新面试"按钮：**清理边界单一化**（重新面试要清 Redis 会话 + localStorage 两边）

#### 全局
- [`api/index.ts`](client/src/api/index.ts) axios 拦截器：自动带 token、401 跳登录
- [`App.tsx`](client/src/App.tsx) `ProtectedRoute` 守卫
- 所有页面采用毛玻璃风格 inline style，无第三方 UI 库

---

## 6. 数据存储

| 存储 | 用途 | 关键表/Key | 生命周期 |
|---|---|---|---|
| **MySQL** | 用户、解析缓存 | `users` / `resume_cache` (UNIQUE user_id+file_hash) / `ocr_cache` | 永久 |
| **Redis** | 面试会话快照 | `interview_session:<userId>` JSON 串 | TTL 2 小时 |
| **Chroma** | 题库向量 | collection `interview_questions` (cosine, hnsw) | 持久化文件 |
| **localStorage** | 前端态 + 缓存 | `token / resume_data / jd_data / match_data / interview_questions / interview_messages / report_data` | 用户清前永久 |
| **本地文件** | 上传暂存 | `server/uploads/` & `ai-service/uploads/` | 进程内 |

---

## 7. 环境变量配置

项目有两份 `.env` 文件需要配置：[`ai-service/.env`](ai-service/.env.example) 和 [`server/.env`](server/.env.example)。两者都已提供 `.env.example` 模板，真实 `.env` 文件已被 [`.gitignore`](.gitignore) 忽略，请**切勿将真实密钥提交到 Git**。

### 7.1 快速开始

```bash
# 在项目根目录执行
cp ai-service/.env.example ai-service/.env
cp server/.env.example     server/.env
```

然后按下面的说明填入真实值。

### 7.2 ai-service/.env（Python AI 服务）

| 变量 | 说明 | 示例 / 默认值 |
|---|---|---|
| `DASHSCOPE_API_KEY` | **必填**。阿里云百炼 / DashScope API Key，用于通义千问与 Embedding | `sk-xxxxxxxx...` |
| `QWEN_MAX_MODEL` | 主力对话模型（面试官、报告） | `qwen-max` |
| `QWEN_PLUS_MODEL` | 中等任务模型（匹配分析、出题） | `qwen-plus-0112` |
| `QWEN_TURBO_MODEL` | 轻量任务模型（简历/JD 解析） | `qwen-turbo` |
| `OCR_LANG` | PaddleOCR 识别语言 | `ch` |
| `PADDLEOCR_HOME` | PaddleOCR 模型缓存目录 | `.paddleocr` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | MySQL 连接信息 | `localhost` / `3306` / `ai_interview` / `root` / `your_password` |
| `DB_POOL_MAX` / `DB_POOL_MIN` / `DB_POOL_MAX_IDLE` / `DB_CONNECT_TIMEOUT` | DBUtils 连接池参数 | `10` / `2` / `5` / `10` |
| `EMBEDDING_MODEL` | 向量化模型 | `text-embedding-v4` |
| `EMBEDDING_DIM` | 向量维度，需与 Chroma collection 保持一致 | `1024` |
| `CHROMA_PERSIST_DIR` | Chroma 持久化目录（本地生成） | `./chroma_db` |
| `CHROMA_COLLECTION` | Chroma collection 名 | `interview_questions` |
| `QUESTION_BANK_DIR` | 题库文本目录 | `./question_bank` |
| `RAG_TOP_K` | RAG 召回条数 | `7` |
| `LLM_QUESTIONS_COUNT` | LLM 生成题目条数 | `1` |
| `RAG_SCORE_THRESHOLD` | RAG 命中分数阈值（低于则丢弃） | `0.25` |

> API Key 申请地址：<https://dashscope.console.aliyun.com/>

### 7.3 server/.env（Node.js 后端）

| 变量 | 说明 | 示例 / 默认值 |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | MySQL 连接信息（与 ai-service 使用同一库） | `localhost` / `3306` / `ai_interview` / `root` / `your_password` |
| `DB_POOL_MAX` / `DB_POOL_MIN` | Sequelize 连接池上下限 | `10` / `2` |
| `DB_POOL_ACQUIRE` | 获取连接最长等待时间（ms） | `10000` |
| `DB_POOL_IDLE` | 连接空闲多久后释放（ms） | `10000` |
| `DB_POOL_EVICT` | 空闲连接回收间隔（ms） | `5000` |
| `JWT_SECRET` | **必填**。JWT 签名密钥，**务必改为足够长的随机字符串**（建议 ≥ 32 位） | `please_change_to_a_long_random_string` |
| `AI_SERVICE_URL` | ai-service 的访问地址 | `http://localhost:8000` |
| `REDIS_HOST` / `REDIS_PORT` | Redis 连接信息，用于面试会话快照 | `localhost` / `6379` |

### 7.4 安全提示

- ❌ **不要**把真实的 `.env` 文件提交到 Git（已在 `.gitignore` 中）
- 🔑 `JWT_SECRET` 生产环境务必替换为随机长字符串，可用：
  ```bash
  # Linux / macOS
  openssl rand -hex 32
  # 或 Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- 🗝️ `DASHSCOPE_API_KEY` 不要出现在前端代码或公开仓库中
- 🗄️ 生产环境建议将 MySQL/Redis 密码替换为强密码，并通过防火墙/内网限制访问

---

`ai-service/.env`：
- `DASHSCOPE_API_KEY`（必填）
- `QWEN_MAX_MODEL` / `QWEN_PLUS_MODEL` / `QWEN_TURBO_MODEL`（可选覆盖默认）
- `EMBEDDING_MODEL`（默认 `text-embedding-v4`）
- `CHROMA_PERSIST_DIR`（默认 `./chroma_db`） / `CHROMA_COLLECTION`
- `RAG_TOP_K`（默认 5） / `LLM_QUESTIONS_COUNT`（默认 3） / `RAG_SCORE_THRESHOLD`（默认 0.25）
- `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` + 池参数
- `OCR_LANG`（默认 ch）

`server/.env`：
- `PORT`（默认 3000）
- `DB_*` + `DB_POOL_*`（同 ai-service）
- `JWT_SECRET`（必填）
- `REDIS_HOST` / `REDIS_PORT`
- `AI_SERVICE_URL`（默认 `http://localhost:8000`）

---

## 8. 启动 / 部署

```bash
# 1. 基础设施
docker-compose up -d                                  # Redis
mysql -uroot -p < database/init.sql                   # MySQL 库表

# 2. ai-service（FastAPI）
cd ai-service
python -m venv venv && venv\Scripts\activate          # Windows
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
python -m app.rag.ingest                              # 题库入库（首次必做）
uvicorn app.main:app --reload --port 8000

# 3. server（Express）
cd server && npm install && npm run dev               # 默认 3000

# 4. client（Vite）
cd client && npm install && npm run dev               # 默认 5173
```

---

## 9. 给阅读者的几个建议

- **阅读顺序**（自顶向下）：[`App.tsx`](client/src/App.tsx) → [`InterviewPage.tsx`](client/src/pages/InterviewPage.tsx) → [`server/app.js`](server/src/app.js) → [`server/routes/chat.js`](server/src/routes/chat.js) → [`ai-service/api/chat.py`](ai-service/app/api/chat.py) → [`prompts/interviewer.py`](ai-service/app/prompts/interviewer.py) → 其他
- **想先看 RAG**：[`rag/loader.py`](ai-service/app/rag/loader.py) → [`rag/embedder.py`](ai-service/app/rag/embedder.py) → [`rag/retriever.py`](ai-service/app/rag/retriever.py) → [`api/question.py`](ai-service/app/api/question.py)
- **想先看报告**：[`api/report.py`](ai-service/app/api/report.py) → [`prompts/report_generation.py`](ai-service/app/prompts/report_generation.py) → [`pages/ReportPage.tsx`](client/src/pages/ReportPage.tsx)
- **想看踩过的坑**：阅读项目根目录的 [`修改日志.md`](修改日志.md)，里面记录了每一次 bug 修复的根因与"纵深防御"思路（特别是面试状态机相关）

---

## 10. 设计哲学（项目里反复出现的几个原则）

1. **薄网关 + 重 AI 服务**：server 不做 AI 业务，只做鉴权/会话/转发，便于 AI 模型升级时不影响 Node 层
2. **缓存优先**：简历/OCR 都按 `user_id + file_hash` 唯一索引缓存，避免重复 LLM/OCR 调用
3. **单例 + 懒加载**：LLM/Chroma/OCR/DB 池都是首次使用才初始化，启动期不阻塞
4. **流式 + 安全网**：LLM 流式输出过程中实时扫描"脑补模式"，命中即截断，避免污染对话
5. **多源兜底**：会话状态 = localStorage（前端） + Redis（后端），任意一边失效另一边能续命
6. **状态机显式化**：autoSave 显式接收 override，绕开 React 异步 state 时序问题
7. **Prompt 工程纵深**：硬性规则 → 行为细则 → 禁止项 三段式，把 LLM 的自由度收紧到可控范围