from pathlib import Path
from fastapi import UploadFile
import shutil
import hashlib

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

def sha256sum(path: Path, chunk_size: int = 1024 * 1024) -> str:
    """파일 내용 기준 SHA-256 해시 (동일 파일이면 항상 동일)"""
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(chunk_size), b""):
            h.update(chunk)
    return h.hexdigest()


# from pathlib import Path
# from fastapi import UploadFile
# import shutil

# def ensure_dirs(*paths: Path) -> None:
#     for p in paths:
#         p.mkdir(parents=True, exist_ok=True)

# async def save_upload(file: UploadFile, dst_dir: Path) -> Path:
#     dst = dst_dir / file.filename
#     i = 1
#     while dst.exists():
#         dst = dst_dir / f"{dst.stem}_{i}{dst.suffix}"
#         i += 1
#     with dst.open("wb") as f:
#         shutil.copyfileobj(file.file, f)
#     return dst
