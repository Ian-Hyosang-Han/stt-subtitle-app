import sys, pathlib
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .stt import transcribe_to_segments
from .subtitles import segments_to_vtt, segments_to_srt
from .media import save_upload, ensure_dirs

# --- 경로 고정 (중요) ---
PKG_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(PKG_ROOT))

app = FastAPI(title="STT Subtitle API")

# 프론트엔드 개발 서버 CORS 허용 (5173은 Vite 기본 포트)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터 디렉토리
ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
TRANSCRIPT_DIR = DATA_DIR / "transcripts"
ensure_dirs(UPLOAD_DIR, TRANSCRIPT_DIR)

# 정적 파일 서빙 (자막 다운로드용)
app.mount("/static", StaticFiles(directory=str(TRANSCRIPT_DIR)), name="static")

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = Form(None),      # "en", "ko" 등. 비워두면 자동
    model_size: str = Form("small"),        # tiny/base/small/medium/large-v3
    vad: bool = Form(False),                # ✅ 기본 끔: 노래/배경음에 유리
    beam_size: int = Form(5),               # 선택
):
    saved_path = await save_upload(file, UPLOAD_DIR)

    # ✅ 빈 문자열을 None으로 정리
    if not language:
        language = None

    try:
        segments = transcribe_to_segments(
            media_path=saved_path,
            language=language,
            model_size=model_size,
            use_vad=vad,            # ✅ 전달
            beam_size=beam_size,    # 선택
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT 실패: {e}")

    if not segments:
        raise HTTPException(status_code=400, detail="자막을 생성하지 못했습니다.")

    base = TRANSCRIPT_DIR / saved_path.stem
    srt_path = base.with_suffix(".srt")
    vtt_path = base.with_suffix(".vtt")
    srt_path.write_text(segments_to_srt(segments), encoding="utf-8")
    vtt_path.write_text(segments_to_vtt(segments), encoding="utf-8")

    return {
        "videoFilename": saved_path.name,
        "segments": segments,
        "srt": srt_path.name,
        "vtt": vtt_path.name,
        "vttUrl": f"/static/{vtt_path.name}",
    }
