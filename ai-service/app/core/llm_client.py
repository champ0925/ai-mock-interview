import os
import json
import re
import time
from langchain_community.llms import Tongyi
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser


def _strip_code_fence(text: str) -> str:
    """
    剥掉 LLM 输出中常见的 Markdown 代码围栏：
    ```json ... ```  或  ``` ... ```
    同时清理前后的空白与多余说明（仅保留首个 JSON 对象/数组）。
    """
    text = text.strip()

    # 情况 1：整体被 ``` 包裹
    if text.startswith("```"):
        # 去掉首行 ```xxx
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1:]
        # 去掉末尾的 ```
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
        text = text.strip()

    # 情况 2：字符串里混了说明文字，尝试提取首个 {...} 或 [...]
    if not (text.startswith("{") or text.startswith("[")):
        match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        if match:
            text = match.group(1)

    return text.strip()


def _model_label(llm) -> str:
    """读取 Tongyi 实例真实使用的模型名（兼容新旧版字段）"""
    return getattr(llm, "model", None) or getattr(llm, "model_name", "unknown")


class LLMClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        # 懒加载：首次使用时才初始化，确保 .env 已被 load_dotenv() 加载
        self._max_model = None
        self._plus_model = None
        self._turbo_model = None

    def _build_model(self, model_name_env: str, default: str) -> Tongyi:
        # 注意：langchain_community.llms.Tongyi 的 pydantic 字段定义为
        # `model_name: str = Field(default="qwen-plus", alias="model")`
        # 默认 populate_by_name=False，构造时必须用 alias `model=` 而非 `model_name=`
        # 否则会被静默忽略并 fallback 到默认值 qwen-plus
        return Tongyi(
            dashscope_api_key=os.getenv("DASHSCOPE_API_KEY"),
            model=os.getenv(model_name_env, default),
        )

    def _get_max(self) -> Tongyi:
        if self._max_model is None:
            self._max_model = self._build_model("QWEN_MAX_MODEL", "qwen-max")
        return self._max_model

    def _get_plus(self) -> Tongyi:
        if self._plus_model is None:
            self._plus_model = self._build_model("QWEN_PLUS_MODEL", "qwen-plus")
        return self._plus_model

    def _get_turbo(self) -> Tongyi:
        if self._turbo_model is None:
            self._turbo_model = self._build_model("QWEN_TURBO_MODEL", "qwen-turbo")
        return self._turbo_model

    def _pick_model(self, model: str = "max") -> Tongyi:
        if model == "turbo":
            return self._get_turbo()
        if model == "plus":
            return self._get_plus()
        return self._get_max()

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        use_max: bool = True,
        model: str = None,
        input_vars: dict = None,
        _log: bool = True,
        _log_tag: str = "invoke ",
    ) -> str:
        if model is None:
            model = "max" if use_max else "plus"
        llm = self._pick_model(model)
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", user_prompt),
        ])
        chain = prompt | llm | StrOutputParser()
        start = time.perf_counter()
        try:
            return chain.invoke(input_vars or {})
        finally:
            if _log:
                elapsed = time.perf_counter() - start
                print(f"[LLM] {_log_tag} -> {_model_label(llm):18s} ({elapsed:.2f}s)")

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        use_max: bool = True,
        model: str = None,
        input_vars: dict = None,
        max_retries: int = 1,
    ) -> dict | list:
        """
        统一的 JSON 生成入口：
        - 调用 LLM 后自动剥 Markdown 围栏
        - 解析失败时自动重试 max_retries 次（在 system_prompt 追加严格格式要求）
        - 最终仍失败则抛 ValueError
        """
        last_raw = ""
        last_err: Exception | None = None

        for attempt in range(max_retries + 1):
            # 重试时在 system_prompt 末尾追加强约束
            effective_system = system_prompt
            if attempt > 0:
                effective_system = (
                    system_prompt
                    + "\n\n【重要】上一次输出不是合法 JSON，请严格只输出一个 JSON 对象或数组，"
                    + "不要输出任何解释、注释或 Markdown 围栏。"
                )

            tag = "json   " if attempt == 0 else f"json#{attempt}"
            raw = self.generate(
                system_prompt=effective_system,
                user_prompt=user_prompt,
                use_max=use_max,
                model=model,
                input_vars=input_vars,
                _log_tag=tag,
            )
            last_raw = raw
            cleaned = _strip_code_fence(raw)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError as e:
                last_err = e
                if attempt < max_retries:
                    print(f"[LLM] JSON 解析失败（第 {attempt + 1} 次），重试...")
                    continue

        # 所有尝试都失败
        preview = (last_raw[:200] + "...") if len(last_raw) > 200 else last_raw
        raise ValueError(f"LLM 返回格式非法 JSON: {last_err}. 原始输出片段: {preview}")

    def stream(
        self,
        system_prompt: str,
        user_prompt: str,
        use_max: bool = True,
        model: str = None,
        input_vars: dict = None,
    ):
        if model is None:
            model = "max" if use_max else "plus"
        llm = self._pick_model(model)
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", user_prompt),
        ])
        chain = prompt | llm | StrOutputParser()
        start = time.perf_counter()
        first_chunk_at: float | None = None
        try:
            for chunk in chain.stream(input_vars or {}):
                if first_chunk_at is None:
                    first_chunk_at = time.perf_counter()
                yield chunk
        finally:
            total = time.perf_counter() - start
            ttfb = (first_chunk_at - start) if first_chunk_at else total
            print(
                f"[LLM] stream  -> {_model_label(llm):18s} "
                f"(ttfb={ttfb:.2f}s, total={total:.2f}s)"
            )


llm_client = LLMClient()