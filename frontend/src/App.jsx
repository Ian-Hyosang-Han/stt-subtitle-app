import { useMemo, useState } from "react";
import VideoUploader from "./components/VideoUploader.jsx";
import VideoPlayer from "./components/VideoPlayer.jsx";
import SubtitleEditor from "./components/SubtitleEditor.jsx";
import { transcribe } from "./api/client.js";

export default function App() {
  const [file, setFile] = useState(null);
  const [segments, setSegments] = useState([]);
  const [vttUrl, setVttUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState(""); // "", "en", "ko" 등
  const [modelSize, setModelSize] = useState("small");
  const [error, setError] = useState("");

  const localVideoUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  const handleTranscribe = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await transcribe(file, { language: lang, modelSize });
      setSegments(data.segments || []);
      setVttUrl(data.vttUrl || "");
    } catch (e) {
      setError(e?.message || "Transcribe failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSegChange = (i, nextSeg) => {
    setSegments((prev) => {
      const copy = prev.slice();
      copy[i] = nextSeg;
      return copy;
    });
  };

  return (
    <div className="min-h-full bg-black">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">STT Subtitle Demo (Frontend)</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <VideoUploader onFile={setFile} />
            <div className="mt-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">언어(language)</label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="border rounded p-2"
                >
                  <option value="">auto</option>
                  <option value="en">en</option>
                  <option value="ko">ko</option>
                  {/* 필요 시 다른 언어 추가 */}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">모델(model_size)</label>
                <select
                  value={modelSize}
                  onChange={(e) => setModelSize(e.target.value)}
                  className="border rounded p-2"
                >
                  <option value="tiny">tiny</option>
                  <option value="base">base</option>
                  <option value="small">small</option>
                  <option value="medium">medium</option>
                  <option value="large-v3">large-v3</option>
                </select>
              </div>

              <button
                onClick={handleTranscribe}
                disabled={!file || loading}
                className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              >
                {loading ? "생성 중..." : "자막 생성"}
              </button>

              {error && <div className="text-red-600 text-sm">{error}</div>}
            </div>

            <VideoPlayer src={localVideoUrl} vttUrl={vttUrl} lang={lang || "en"} />
          </div>

          <div className="md:col-span-1">
            <div className="p-4 border rounded-xl bg-white/50">
              <h3 className="font-semibold">API 설정</h3>
              <div className="text-sm text-gray-600 break-all">
                <div><strong>VITE_API_BASE:</strong> {import.meta.env.VITE_API_BASE}</div>
                <div><strong>VTT URL:</strong> {vttUrl || "-"}</div>
              </div>
            </div>
          </div>
        </div>

        <SubtitleEditor segments={segments} onChange={handleSegChange} />
      </div>
    </div>
  );
}
