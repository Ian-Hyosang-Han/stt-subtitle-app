import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

  // 반복 재생 상태(이미 구현한 경우 유지)
  const [loop, setLoop] = useState(null);          // { start, end } | null
  const [activeIndex, setActiveIndex] = useState(null);

  const localVideoUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  // ✅ 상단 고정 헤더(비디오 영역) 높이 측정 → 동일한 높이의 spacer로 본문을 내려줌
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setHeaderH(headerRef.current?.offsetHeight || 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  // 동영상 소스/자막이 바뀌면 높이가 변할 수 있으니 한번 더 측정
  useEffect(() => {
    const id = setTimeout(() => setHeaderH(headerRef.current?.offsetHeight || 0), 50);
    return () => clearTimeout(id);
  }, [localVideoUrl, vttUrl]);

  const handleTranscribe = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await transcribe(file, { language: lang, modelSize });
      setSegments(data.segments || []);
      setVttUrl(data.vttUrl || "");
      setLoop(null);
      setActiveIndex(null);
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
    if (activeIndex === i && loop) {
      const start = Math.max(0, Number(nextSeg.start) || 0);
      const end = Math.max(start + 0.05, Number(nextSeg.end) || 0);
      setLoop({ start, end });
    }
  };

  const handleRepeat = (i, seg) => {
    if (!seg) return;
    if (activeIndex === i && loop) {
      setLoop(null);
      setActiveIndex(null);
      return;
    }
    const start = Math.max(0, Number(seg.start) || 0);
    const end = Math.max(start + 0.05, Number(seg.end) || 0);
    setLoop({ start, end });
    setActiveIndex(i);
  };

  return (
    <div className="h-screen overflow-hidden bg-black text-white">
      {/* 🔝 고정 헤더: 상단에 비디오를 항상 노출 */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur"
      >
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-3">
          <h1 className="text-xl font-semibold mb-3">STT Subtitle Demo</h1>
          {/* 비디오: 고정 헤더 안에 배치 */}
          <VideoPlayer
            src={localVideoUrl}
            vttUrl={vttUrl}
            lang={lang || "en"}
            loop={loop}
          />
        </div>
        <div className="flex justify-center gap-3">
            <VideoUploader onFile={setFile} />
            <div className="lg:col-span-1">
            <div className="p-4 border rounded-xl bg-white/10">
              <h3 className="font-semibold">상태</h3>
              <div className="text-sm text-gray-200 break-all space-y-1">
                <div><strong>API:</strong> {import.meta.env.VITE_API_BASE}</div>
                <div><strong>VTT:</strong> {vttUrl || "-"}</div>
                <div><strong>Loop:</strong> {loop ? `${loop.start}s → ${loop.end}s` : "-"}</div>
              </div>
            </div>
          </div>
          </div>
      </header>

      {/* 헤더 높이만큼 밀어주는 spacer (동적으로 계산됨) */}
      <div style={{ height: headerH }} />

      {/* 🧾 본문: 풀스크린 스크롤 영역 (자막 편집/업로드/옵션 등) */}
      <div className="mx-auto px-4 py-5 h-screen overflow-y-auto">
        {/* 업로드 / 옵션 / 액션 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 왼쪽: 업로드 */}


          {/* 오른쪽: 상태 패널 */}
          {/* <div className="lg:col-span-1">
            <div className="p-4 border rounded-xl bg-white/10">
              <h3 className="font-semibold">상태</h3>
              <div className="text-sm text-gray-200 break-all space-y-1">
                <div><strong>API:</strong> {import.meta.env.VITE_API_BASE}</div>
                <div><strong>VTT:</strong> {vttUrl || "-"}</div>
                <div><strong>Loop:</strong> {loop ? `${loop.start}s → ${loop.end}s` : "-"}</div>
              </div>
            </div>
          </div> */}

          {/* 아래 전체 폭: 컨트롤(언어/모델/버튼들) */}
          <div className="lg:col-span-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">언어(language)</label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="border rounded p-2 text-white"
                >
                  <option value="">auto</option>
                  <option value="en">en</option>
                  <option value="ko">ko</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">모델(model_size)</label>
                <select
                  value={modelSize}
                  onChange={(e) => setModelSize(e.target.value)}
                  className="border rounded p-2 text-white"
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
                className="px-4 py-2 rounded bg-white text-black disabled:opacity-50"
              >
                {loading ? "생성 중..." : "자막 생성"}
              </button>

              {loop && (
                <button
                  onClick={() => { setLoop(null); setActiveIndex(null); }}
                  className="px-3 py-2 rounded bg-red-600 text-white"
                  title="반복 전체 끄기"
                >
                  반복 정지
                </button>
              )}

              {error && <div className="text-red-400 text-sm">{error}</div>}
            </div>
          </div>
        </div>

        {/* 자막 편집기 (임베디드) - 화면 아래 전체를 자유롭게 사용 */}
        <SubtitleEditor
          segments={segments}
          onChange={handleSegChange}
          onRepeat={handleRepeat}
          activeIndex={activeIndex}
        />
      </div>
    </div>
  );
}
