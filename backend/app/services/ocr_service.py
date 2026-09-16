from pathlib import Path
from typing import Any

import cv2
import numpy as np
import pytesseract
from PIL import Image
from pypdf import PdfReader


class OCRUnavailable(RuntimeError):
    pass


def preprocess_image(path: Path) -> np.ndarray:
    image = cv2.imread(str(path))
    if image is None:
        raise ValueError("The image could not be decoded.")
    height, width = image.shape[:2]
    if max(height, width) < 1600:
        scale = 1600 / max(height, width)
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 7, 7, 21)
    return cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]


def _tesseract_languages() -> str:
    try:
        languages = set(pytesseract.get_languages(config=""))
    except Exception as exc:
        raise OCRUnavailable("Tesseract OCR is not installed or is not on PATH.") from exc
    requested = [language for language in ("eng", "mal") if language in languages]
    if not requested:
        raise OCRUnavailable("Install Tesseract with English and Malayalam language data.")
    return "+".join(requested)


def image_ocr(path: Path) -> dict[str, Any]:
    image = preprocess_image(path)
    language = _tesseract_languages()
    data = pytesseract.image_to_data(Image.fromarray(image), lang=language, output_type=pytesseract.Output.DICT, config="--psm 6")
    blocks = []
    for index, text in enumerate(data["text"]):
        value = text.strip()
        if not value:
            continue
        blocks.append({
            "text": value,
            "confidence": max(0.0, float(data["conf"][index]) / 100),
            "bbox": [data["left"][index], data["top"][index], data["width"][index], data["height"][index]],
            "page": 1,
            "line": [data["page_num"][index], data["line_num"][index]],
        })
    lines: dict[tuple[int, int], list[str]] = {}
    for block in blocks:
        key = tuple(block["line"])
        lines.setdefault(key, []).append(block["text"])
    raw_text = "\n".join(" ".join(values) for values in lines.values())
    return {"raw_text": raw_text, "blocks": blocks, "engine": f"tesseract:{language}"}


def extract_text(path: Path, file_type: str) -> dict[str, Any]:
    if file_type == "PDF":
        reader = PdfReader(str(path))
        pages = []
        for page_number, page in enumerate(reader.pages, 1):
            text = (page.extract_text() or "").strip()
            pages.append({"page": page_number, "raw_text": text, "blocks": [{"text": line, "confidence": 0.7, "bbox": None, "page": page_number} for line in text.splitlines() if line.strip()]})
        if not any(page["raw_text"] for page in pages):
            raise OCRUnavailable("This scanned PDF needs OCR conversion; no text layer was found.")
        return {"raw_text": "\n".join(page["raw_text"] for page in pages), "blocks": [block for page in pages for block in page["blocks"]], "engine": "pypdf"}
    return image_ocr(path)
