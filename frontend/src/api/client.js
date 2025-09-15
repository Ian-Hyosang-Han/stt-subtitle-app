export async function transcribe(file, { language = "", modelSize = "small" } = {}) {
    const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/+$/, "");
    const url = `${API_BASE}/transcribe`;
  
    const fd = new FormData();
    fd.append("file", file);
    if (language) fd.append("language", language);
    fd.append("model_size", modelSize);
  
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Transcribe failed (${res.status}): ${text}`);
    }
    const data = await res.json();
  
    // vttUrl 은 보통 "/static/xxx.vtt" 형태 → 절대 URL로 보정
    const vttUrl = data.vttUrl?.startsWith("/")
      ? `${API_BASE}${data.vttUrl}`
      : data.vttUrl;
  
    return { ...data, vttUrl };
  }
  