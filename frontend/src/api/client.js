const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

// 상대경로를 절대경로로 보정
const toAbs = (u) => (u && u.startsWith("/") ? `${API_BASE}${u}` : u);

/**
 * 자막 생성: 파일을 업로드하고 서버에서 전사한 결과를 돌려받습니다.
 * 서버는 data 폴더에 파일/자막을 저장하고, vttUrl(및 선택적으로 videoUrl)을 반환한다고 가정합니다.
 */
export async function transcribe(file, { language = "", modelSize = "small", fileId } = {}) {
  const url = `${API_BASE}/transcribe`;

  const fd = new FormData();
  fd.append("file", file);
  if (language) fd.append("language", language);
  fd.append("model_size", modelSize);
  if (fileId) fd.append("file_id", fileId);

  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Transcribe failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // vttUrl, videoUrl이 "/..." 형태면 절대경로로 보정
  return {
    ...data,
    vttUrl: toAbs(data.vttUrl),
    videoUrl: toAbs(data.videoUrl),
  };
}

/**
 * 동일 파일 재업로드 시 서버 data 폴더의 결과를 재사용하기 위해
 * 파일 해시(id)로 기존 결과를 조회합니다.
 * 예시 엔드포인트: GET /media/:id  → { videoUrl, vttUrl, segments, lang, modelSize }
 * 필요에 따라 경로를 서버 구현에 맞게 수정하세요.
 */
export async function findMediaByHash(id) {
  const res = await fetch(`${API_BASE}/media/${encodeURIComponent(id)}`, {
    method: "GET",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`findMediaByHash failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    ...data,
    vttUrl: toAbs(data.vttUrl),
    videoUrl: toAbs(data.videoUrl),
  };
}
