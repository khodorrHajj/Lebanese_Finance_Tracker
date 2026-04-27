import asyncio
import logging
import os
import threading

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

from paddleocr import PaddleOCR

logger = logging.getLogger("liratrack.ocr")

_ocr = None
_ocr_lock = threading.Lock()
_is_loading = False
_load_error: str | None = None


def get_ocr_instance():
    """Return a singleton PaddleOCR instance compatible with the installed API."""
    global _ocr
    global _is_loading
    global _load_error

    if _ocr is not None:
        return _ocr

    with _ocr_lock:
        if _ocr is not None:
            return _ocr

        _is_loading = True
        _load_error = None
        try:
            logger.info("Initializing PaddleOCR (English/Arabic support)...")
            _ocr = PaddleOCR(
                lang="ar",
                use_textline_orientation=True,
            )
            logger.info("PaddleOCR initialized successfully")
            return _ocr
        except Exception as exc:
            _load_error = str(exc)
            logger.exception("PaddleOCR initialization failed")
            raise
        finally:
            _is_loading = False


def is_ready() -> bool:
    return _ocr is not None and _load_error is None


def is_loading() -> bool:
    return _is_loading


def get_load_error() -> str | None:
    return _load_error


def load_ml_model():
    """Warm OCR in the background without blocking FastAPI startup."""

    def _warm():
        try:
            get_ocr_instance()
        except Exception:
            logger.warning("OCR warm-up skipped; service will retry on first OCR request")

    threading.Thread(target=_warm, daemon=True).start()


async def extract_text_from_image(image_path: str) -> str:
    """Extract raw text from an image using the current PaddleOCR pipeline API."""

    def _run():
        result = get_ocr_instance().predict(image_path)
        if not result:
            return ""

        first_result = result[0]
        texts = first_result.get("rec_texts") or []
        return "\n".join(str(text) for text in texts if text)

    return await asyncio.to_thread(_run)
