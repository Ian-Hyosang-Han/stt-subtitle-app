import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .stt import transcribe_to_segments
from .subtitles import segments_to_vtt, segments_to_srt
from .media import save_upload, ensure_dirs, sha256sum

app = FastAPI(title="STT Subtitle API with Caching")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
TRANSCRIPT_DIR = DATA_DIR / "transcripts"
ensure_dirs(UPLOAD_DIR, TRANSCRIPT_DIR)

# 정적 서빙
app.mount("/static", StaticFiles(directory=str(TRANSCRIPT_DIR)), name="static")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.get("/media/{file_hash}")
def get_media(file_hash: str):
    # 업로드된 동영상(확장자가 다를 수 있음)
    matches = list(UPLOAD_DIR.glob(f"{file_hash}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Not found")
    video_path = matches[0]

    base = TRANSCRIPT_DIR / file_hash
    vtt_path = base.with_suffix(".vtt")
    srt_path = base.with_suffix(".srt")
    json_path = base.with_suffix(".json")

    segments = None
    if json_path.exists():
        try:
            segments = json.loads(json_path.read_text(encoding="utf-8"))
        except Exception:
            segments = None

    return {
        "videoUrl": f"/uploads/{video_path.name}",
        "vttUrl": f"/static/{vtt_path.name}" if vtt_path.exists() else None,
        "srt": srt_path.name if srt_path.exists() else "",
        "segments": segments,
        "lang": None,
        "modelSize": None,
    }

@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = Form(None),
    model_size: str = Form("small"),
    file_id: str | None = Form(None),  # (옵션) 클라이언트가 보내면 로깅 등에 활용 가능
):
    # 1) 업로드 파일 임시 저장
    saved_path = await save_upload(file, UPLOAD_DIR)

    # 2) 내용 해시 계산 (항상 내용 기준)
    computed_hash = sha256sum(saved_path)

    # 3) 정규 파일 경로 = uploads/{hash}.{ext}
    ext = Path(file.filename).suffix or saved_path.suffix
    if ext and not ext.startswith("."):
        ext = "." + ext
    canonical_video_path = (UPLOAD_DIR / f"{computed_hash}{ext}").resolve()

    # 4) 중복 방지: 이미 있으면 임시 파일 삭제, 없으면 정규 파일로 이동
    if canonical_video_path.exists():
        try:
            saved_path.unlink()
        except Exception:
            pass
    else:
        try:
            saved_path.replace(canonical_video_path)
        except Exception:
            # 일부 파일시스템 대응: 복사 후 임시 파일 삭제
            canonical_video_path.write_bytes(saved_path.read_bytes())
            try:
                saved_path.unlink()
            except Exception:
                pass

    # 5) 캐시 확인
    base = TRANSCRIPT_DIR / computed_hash
    srt_path = base.with_suffix(".srt")
    vtt_path = base.with_suffix(".vtt")
    json_path = base.with_suffix(".json")

    if vtt_path.exists() and json_path.exists():
        try:
            segments = json.loads(json_path.read_text(encoding="utf-8"))
        except Exception:
            segments = []
        return {
            "videoFilename": canonical_video_path.name,
            "videoUrl": f"/uploads/{canonical_video_path.name}",
            "segments": segments,
            "srt": srt_path.name if srt_path.exists() else "",
            "vtt": vtt_path.name,
            "vttUrl": f"/static/{vtt_path.name}",
            "cache": True,
        }

    # 6) 캐시 미스 → STT 수행
    try:
        segments = transcribe_to_segments(
            canonical_video_path, language=language, model_size=model_size
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not segments:
        raise HTTPException(status_code=400, detail="자막 생성 실패")

    # 7) 결과 저장
    srt_text = segments_to_srt(segments)
    vtt_text = segments_to_vtt(segments)
    srt_path.write_text(srt_text, encoding="utf-8")
    vtt_path.write_text(vtt_text, encoding="utf-8")
    json_path.write_text(json.dumps(segments, ensure_ascii=False), encoding="utf-8")

    return {
        "videoFilename": canonical_video_path.name,
        "videoUrl": f"/uploads/{canonical_video_path.name}",
        "segments": segments,
        "srt": srt_path.name,
        "vtt": vtt_path.name,
        "vttUrl": f"/static/{vtt_path.name}",
        "cache": False,
    }
