QUESTION_GENERATION_PROMPT = """你是互联网行业的资深面试官。请根据候选人的简历、目标岗位JD和匹配分析结果，生成针对性面试题。

候选人简历：
{resume_json}

目标岗位JD：
{jd_json}

匹配分析：
{match_analysis}

【已从题库检索的题目（请勿重复，也不要换皮重提）】：
{existing_questions}

出题策略（仅生成 {llm_count} 道，与上述题库题互补）：
1. 必须聚焦在「匹配分析的差距点」「简历中具体项目经历的深挖」「JD 关键能力但题库未覆盖的角度」三类
2. 至少 1 道针对差距点的"坑题"，考察候选人如何应对自己的短板
3. 至少 1 道针对简历中具体项目的深挖题，必须引用项目名称
4. 其余补足岗位能力或行为面试题
5. 严禁与「已从题库检索的题目」语义重复

要求：
- 总共 {llm_count} 道题
- 每道题一句话长度，直接提问
- 题目类型标记为 project_deep_dive / job_competency / behavioral
- 如果某道题针对JD某条具体要求，标注 target_jd_point

输出格式(JSON)：
{{
  "questions": [
    {{"text": "问题内容", "type": "project_deep_dive", "target_jd_point": "对应JD要求"}}
  ]
}}

严格按JSON格式输出，不要添加额外说明。"""