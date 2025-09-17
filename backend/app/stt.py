from pathlib import Path
from typing import List, Dict, Optional
from faster_whisper import WhisperModel

_model_cache: dict[str, WhisperModel] = {}

def _get_model(model_size: str) -> WhisperModel:
    if model_size in _model_cache:
        return _model_cache[model_size]
    # 필요시 device="metal" compute_type="int8" 환경변수로 조정 가능
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    _model_cache[model_size] = model
    return model

def transcribe_to_segments(
    media_path: Path | str,
    language: Optional[str] = None,
    model_size: str = "small",
    use_vad: bool = False,          # ✅ 기본 False
    beam_size: int = 5,
) -> List[Dict]:
    model = _get_model(model_size)

    # ✅ 빈 문자열/auto 들어오면 None 처리
    if not language or str(language).strip().lower() in {"", "auto", "none"}:
        language = None

    segments, info = model.transcribe(
        str(media_path),
        language=language,           # None이면 자동감지
        vad_filter=False,          # ✅ 토글
        beam_size=beam_size,
    )

    out: List[Dict] = []
    for seg in segments:
        out.append({
            "start": round(float(seg.start or 0.0), 3),
            "end": round(float(seg.end or 0.0), 3),
            "text": (seg.text or "").strip()
        })
    return out