import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import VideoUploader from "./components/VideoUploader.jsx";
import VideoPlayer from "./components/VideoPlayer.jsx";
import SubtitleEditor from "./components/SubtitleEditor.jsx";
import UploadList from "./components/UploadList.jsx";
import { transcribe, findMediaByHash } from "./api/client.js"; // ← findMediaByHash 추가 가정

// 브라우저 내에서 파일 SHA-256 해시 계산
async function hashFile(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const DEFAULT_VIDEO_HEIGHT = 360;

export default function App() {
  // 업로드 항목: { id(hash), name, size, src, status: 'new'|'processing'|'done'|'error', segments, vttUrl, lang, modelSize }
  const [items, setItems] = useState([]);
  const [currentId, setCurrentId] = useState(null);

  const current = useMemo(() => items.find((i) => i.id === currentId) || null, [items, currentId]);
  const [lang, setLang] = useState(""); // auto | 'en' | 'ko'
  const [modelSize, setModelSize] = useState("small");
  const [error, setError] = useState("");
  const [loop, setLoop] = useState(null); // { start, end } | null
  const [activeIndex, setActiveIndex] = useState(null);
  const [videoHeight, setVideoHeight] = useState(DEFAULT_VIDEO_HEIGHT);

  const src = current?.src || "";

  // sticky 높이 → 아래 영역 독립 스크롤
  const stickyRef = useRef(null);
  const [stickyH, setStickyH] = useState(0);
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setStickyH(entry.contentRect.height));
    ro.observe(el);
    const onWinResize = () => setStickyH(el.getBoundingClientRect().height);
    window.addEventListener("resize", onWinResize);
    onWinResize();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
  }, []);

  // 파일 선택: 해시 조회 → 서버에 기존 결과 있으면 즉시 복원, 없으면 세션용 blob URL로 미리보기 + 목록 추가
  const handleFileSelect = useCallback(async (file) => {
    setError("");
    if (!file) return;

    try {
      const id = await hashFile(file);

      // 세션 중복 방지: 이미 목록에 있으면 선택만
      const exists = items.find((p) => p.id === id);
      if (exists) {
        setCurrentId(id);
        setLoop(null);
        setActiveIndex(null);
        return;
      }

      // 1) 서버에 같은 파일 기록이 있는지 조회 (이미 전사/저장되어 있으면 즉시 복원)
      const found = await findMediaByHash(id); // { videoUrl, vttUrl, segments, lang, modelSize } | null
      if (found && found.videoUrl) {
        setItems((prev) => [
          ...prev,
          {
            id,
            name: file.name,
            size: file.size,
            src: found.videoUrl, // 서버 파일 경로 사용
            status: found.segments?.length ? "done" : "new",
            segments: found.segments || [],
            vttUrl: found.vttUrl || "",
            lang: found.lang || "",
            modelSize: found.modelSize || "",
          },
        ]);
        setCurrentId(id);
        setLoop(null);
        setActiveIndex(null);
        return;
      }

      // 2) 서버 기록이 없으면: 세션 전용 미리보기(URL.createObjectURL)로 추가 (새로고침시 사라짐)
      const localUrl = URL.createObjectURL(file);
      setItems((prev) => [
        ...prev,
        {
          id,
          name: file.name,
          size: file.size,
          src: localUrl, // 세션 내 미리보기
          status: "new",
          segments: [],
          vttUrl: "",
          lang: "",
          modelSize: "",
        },
      ]);
      setCurrentId(id);
      setLoop(null);
      setActiveIndex(null);
    } catch (e) {
      setError(e?.message || "File select failed");
    }
  }, [items]);

  // 업로드 목록 선택
  const handleSelectItem = useCallback((id) => {
    setCurrentId(id);
    setLoop(null);
    setActiveIndex(null);
  }, []);

  // 자막 생성: 세션용 blob URL이면 파일로 만들어 transcribe 호출 → 서버(data)에 저장 → 결과 반영
  const handleTranscribe = useCallback(async () => {
    setError("");
    const it = items.find((i) => i.id === currentId);
    if (!it || !it.src) return;
    if (it.status === "done" && it.segments?.length) return;

    // 상태: processing
    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "processing" } : p)));

    try {
      let fileForUpload = null;

      // src가 blob:이면 fetch → File 생성
      if (it.src.startsWith("blob:")) {
        const blob = await fetch(it.src).then((r) => r.blob());
        fileForUpload = new File([blob], it.name || "video", { type: blob.type || "video/mp4" });
      } else {
        // 서버 URL만 있고 전사 데이터가 없다면, 동일 파일을 다시 선택해서 전사해야 함
        // (일반적으로 findMediaByHash가 'done'이면 여기로 안 옴)
        setError("이 항목은 서버 파일만 존재합니다. 동일 원본 파일을 다시 선택한 후 자막을 생성하세요.");
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "new" } : p)));
        return;
      }

      // 서버 전사 실행(업로드+처리). 서버가 videoUrl도 함께 주면 src를 서버 경로로 바꿔 줌
      const data = await transcribe(fileForUpload, { language: lang, modelSize, fileId: it.id });

      setItems((prev) =>
        prev.map((p) =>
          p.id === it.id
            ? {
                ...p,
                status: "done",
                segments: data.segments || [],
                vttUrl: data.vttUrl || "",
                lang,
                modelSize,
                src: data.videoUrl || p.src, // 서버가 경로 주면 교체
              }
            : p
        )
      );
      setLoop(null);
      setActiveIndex(null);
    } catch (e) {
      setError(e?.message || "Transcribe failed");
      setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "error" } : p)));
    }
  }, [items, currentId, lang, modelSize]);

  // 자막 편집 변경 반영
  const handleSegChange = (i, nextSeg) => {
    if (!current) return;
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== current.id) return p;
        const next = (p.segments || []).slice();
        next[i] = nextSeg;
        return { ...p, segments: next };
      })
    );
    if (activeIndex === i && loop) {
      const start = Math.max(0, Number(nextSeg.start) || 0);
      const end = Math.max(start + 0.05, Number(nextSeg.end) || 0);
      setLoop({ start, end });
    }
  };

  // 편집기에서만 사용하는 반복 토글
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
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto" style={{ maxWidth: 1024 }}>
        {/* 상단 sticky: 제목 + (좌)비디오 / (우)업로드 목록 */}
        <div
          ref={stickyRef}
          className="sticky top-0 z-40 bg-black/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur"
          style={{ paddingTop: 12, paddingBottom: 12 }}
        >
          <h1 className="text-3xl text-center font-semibold mt-5 mb-5">STT Subtitle Demo</h1>

          <div className="grid grid-cols-12 gap-4 px-4 pt-6">
            <div className="col-span-8">
              {/* 항상 높이를 차지하는 비디오 컨테이너 */}
              <div
                className="bg-neutral-900/60 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center"
                style={{ height: videoHeight }}
              >
                {src ? (
                  <VideoPlayer
                    src={src}
                    vttUrl={current?.vttUrl || ""}
                    lang={current?.lang || (lang || "en")}
                    loop={loop}
                    onMeasured={(h) => setVideoHeight(Math.max(h || 0, DEFAULT_VIDEO_HEIGHT))}
                  />
                ) : (
                  <div className="text-sm text-gray-300">Drop or upload a video to start</div>
                )}
              </div>
            </div>

            <div className="col-span-4">
              <UploadList
                items={items}
                currentId={currentId}
                onSelect={handleSelectItem}
                height={videoHeight}
              />
            </div>
          </div>
        </div>

        {/* 아래 영역: 컨트롤/옵션/편집기 — 독립 스크롤 */}
        <div className="px-4 mt-4" style={{ height: `calc(100vh - ${stickyH}px)` }}>
          <div className="h-full overflow-y-auto pb-10">
            {/* 컨트롤 바 */}
            <div className="w-full rounded-xl border bg-white/10 p-3 flex flex-wrap items-center gap-3">
              <VideoUploader onFile={handleFileSelect} />

              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {current?.name || "동영상 제목 없음"}
                </div>
                <div className="text-sm text-gray-300">
                  상태: {current?.status || "-"}
                  {current?.segments?.length ? ` · ${current.segments.length} lines` : ""}
                </div>
              </div>

              {/* 옵션 */}
              <div>
                <label className="block text-xs font-medium mb-1">언어(language)</label>
                <select
                  value={lang}
                  onChange={(e) => (setLoop(null), setLang(e.target.value))}
                  className="border rounded p-2 text-white"
                >
                  <option value="">auto</option>
                  <option value="en">en</option>
                  <option value="ko">ko</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">모델(model_size)</label>
                <select
                  value={modelSize}
                  onChange={(e) => (setLoop(null), setModelSize(e.target.value))}
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
                disabled={!current || current.status === "processing"}
                className="px-4 py-2 rounded bg-white text-black disabled:opacity-50"
                title={current ? "현재 선택된 동영상으로 자막 생성" : "먼저 동영상을 업로드하세요"}
              >
                {current?.status === "processing" ? "생성 중..." : "자막 생성"}
              </button>

              {error && <div className="text-red-400 text-sm">{error}</div>}
            </div>

            {/* 자막 편집기 (반복 컨트롤은 편집기 내부에만) */}
            <div className="mt-4">
              <SubtitleEditor
                segments={current?.segments || []}
                onChange={handleSegChange}
                onRepeat={handleRepeat}
                activeIndex={activeIndex}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
