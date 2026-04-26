RESUME_PARSE_PROMPT = """你是一个专业的简历解析助手。请从以下简历文本中提取结构化信息。

简历文本：
{resume_text}

请提取以下字段：
1. name: 姓名
2. email: 邮箱
3. phone: 电话
4. education: 教育经历列表，每项包含 {{school, degree, major, start_date, end_date}}
5. skills: 技能列表
6. work_experience: 工作经历列表，每项包含 {{company, position, start_date, end_date, description}}
7. projects: 项目经历列表，每项包含 {{name, description, technologies}}

注意：
- 如果某项信息原文没有提及，用空字符串或空数组表示
- 日期格式统一为 YYYY.MM，缺失部分留空

请严格按照 JSON 格式输出，不要添加任何额外说明。"""