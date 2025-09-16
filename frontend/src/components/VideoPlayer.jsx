import { useEffect, useRef } from "react";

export default function VideoPlayer({ src, vttUrl, lang = "en", loop }) {
  const videoRef = useRef(null);

  // loop 범위가 바뀌면 해당 구간으로 점프 & 재생
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !loop) return;
    const { start = 0 } = loop;
    // 메타데이터가 아직 안 떴다면 loadedmetadata 이후로 이동
    const jump = () => {
      try {
        v.currentTime = Math.max(0, Number(start) || 0);
        v.play().catch(() => {});
      } catch {}
    };
    if (v.readyState >= 1) jump();
    else v.addEventListener("loadedmetadata", jump, { once: true });
  }, [loop]);

  // timeupdate로 end에 도달하면 start로 루프
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const EPS = 0.03;
    const onTime = () => {
      if (!loop) return;
      const start = Math.max(0, Number(loop.start) || 0);
      const end = Math.max(start + 0.05, Number(loop.end) || 0); // 최소 길이 확보
      if (v.currentTime >= end - EPS) {
        v.currentTime = start;
        // iOS 등에서 자동 재생 이슈 방지
        v.play().catch(() => {});
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [loop]);

  if (!src) return null;

  return (
    <div className="mt-4">
      <video
        ref={videoRef}
        controls
        className="w-full max-w-3xl rounded-xl shadow"
        crossOrigin="anonymous"
      >
        <source src={src} />
        {vttUrl && <track kind="subtitles" src={vttUrl} srcLang={lang} default />}
        지원되지 않는 브라우저입니다.
      </video>
      {loop && (
        <div className="mt-2 text-sm text-gray-600">
          반복 구간: {Number(loop.start).toFixed(2)}s → {Number(loop.end).toFixed(2)}s
        </div>
      )}
    </div>
  );
}
