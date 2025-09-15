from pathlib import Path
from fastapi import UploadFile
import shutil

def ensure_dirs(*paths: Path) -> None:
    for p in paths:
        p.mkdir(parents=True, exist_ok=True)

async def save_upload(file: UploadFile, dst_dir: Path) -> Path:
    dst = dst_dir / file.filename
    i = 1
    while dst.exists():
        dst = dst_dir / f"{dst.stem}_{i}{dst.suffix}"
        i += 1
    with dst.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return dst
