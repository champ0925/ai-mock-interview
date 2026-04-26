import os
import cv2
import numpy as np


class OCREngine:
    """
    OCR 引擎，封装 PaddleOCR。
    - 懒加载：首次调用 extract_text 时才初始化模型，避免服务启动阻塞
    - 预处理可选：默认关闭；仅在 preprocess=True 时执行灰度/去噪/二值化/锐化
    - 预处理结果保留在内存，不写临时文件
    """

    def __init__(self):
        # 不在构造期加载模型
        self._ocr = None

    def _get_ocr(self):
        if self._ocr is None:
            # 懒加载到此时才 import & 初始化，避免 import 副作用
            os.environ.setdefault(
                'PADDLEOCR_HOME',
                os.path.join(os.path.dirname(__file__), '..', '..', '.paddleocr')
            )
            from paddleocr import PaddleOCR
            print("[OCR] 首次调用，正在加载 PaddleOCR 模型...")
            self._ocr = PaddleOCR(
                lang=os.getenv("OCR_LANG", "ch"),
                text_detection_model_name="PP-OCRv5_mobile_det",
                text_recognition_model_name="PP-OCRv5_mobile_rec",
                use_textline_orientation=True,
            )
            print("[OCR] PaddleOCR 模型加载完成")
        return self._ocr

    @staticmethod
    def _preprocess_in_memory(image_path: str) -> np.ndarray:
        """
        内存中做图像预处理：转灰度 → 高斯去噪 → 自适应二值化 → 锐化。
        返回 numpy 数组，不落盘。
        注意：对彩色/浅色背景的招聘截图可能损失信息，默认不开启。
        """
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"无法读取图像: {image_path}")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        denoised = cv2.GaussianBlur(gray, (5, 5), 0)
        binary = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        sharpened = cv2.filter2D(binary, -1, kernel)
        return sharpened

    @staticmethod
    def _parse_result(result) -> str:
        """
        兼容 PaddleOCR 不同版本的返回结构，抽取纯文本。
        """
        lines = []
        if not result:
            return ""
        if isinstance(result, dict):
            lines.extend(result.get("rec_texts", []))
        elif isinstance(result, list):
            for item in result:
                if isinstance(item, dict) and 'rec_texts' in item:
                    lines.extend(item['rec_texts'])
                elif isinstance(item, list):
                    for line in item:
                        if isinstance(line, dict) and 'text' in line:
                            lines.append(line['text'])
                        elif isinstance(line, (list, tuple)) and len(line) >= 2:
                            val = line[1]
                            lines.append(val if isinstance(val, str) else str(val))
        return "\n".join(lines)

    def extract_text(self, image_path: str, preprocess: bool = False) -> str:
        """
        完整 OCR 流程：（可选预处理）→ 识别 → 文本抽取。
        :param image_path: 原图路径
        :param preprocess: 是否做预处理，默认 False
        :return: 识别出的文本
        """
        ocr = self._get_ocr()

        if preprocess:
            img_array = self._preprocess_in_memory(image_path)
            result = ocr.predict(img_array)
        else:
            result = ocr.predict(image_path)

        text = self._parse_result(result)
        if not text.strip():
            raise RuntimeError("OCR 未能识别到文字")
        return text


# 单例导出（构造不加载模型，首次调用 extract_text 才加载）
ocr_engine = OCREngine()