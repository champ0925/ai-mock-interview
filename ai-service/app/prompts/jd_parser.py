JD_PARSE_PROMPT = """你是一个招聘信息解析助手。从以下文本中提取岗位JD的结构化信息。

文本内容：
{jd_text}

请提取：
1. title: 岗位名称
2. company: 公司名称
3. responsibilities: 岗位职责列表
4. requirements: 任职要求列表
5. preferred: 加分项列表，没有则为空数组

如果某项原文没有提及，用空字符串或空数组表示。
严格按JSON格式输出，不要添加额外说明。"""