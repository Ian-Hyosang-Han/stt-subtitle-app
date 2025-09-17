import { useEffect, useRef } from "react";

export default function VideoPlayer({ src, vttUrl, lang = "en", loop, onMeasured }) {
  const videoRef = useRef(null);

  // loop 범위가 바뀌면 해당 구간으로 점프 & 재생
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !loop) return;
    const { start = 0 } = loop;
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
      const end = Math.max(start + 0.05, Number(loop.end) || 0);
      if (v.currentTime >= end - EPS) {
        v.currentTime = start;
        v.play().catch(() => {});
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [loop]);

  // 높이 측정 (사이드바 높이를 비디오와 동일하게 만들기 위해)
  useEffect(() => {
    const measure = () => {
      const h = videoRef.current?.offsetHeight || 0;
      onMeasured?.(h);
    };
    const v = videoRef.current;
    if (!v) return;
    measure();
    v.addEventListener("loadedmetadata", measure);
    window.addEventListener("resize", measure);
    return () => {
      v.removeEventListener("loadedmetadata", measure);
      window.removeEventListener("resize", measure);
    };
  }, [src, vttUrl, onMeasured]);

  if (!src) return null;

  return (
    <div className="mt-4">
      <video
        key={src}              // ✅ 소스 변경 시 강제 리로드 → 즉시 전환
        ref={videoRef}
        controls
        className="w-full rounded-xl shadow"
        crossOrigin="anonymous"
      >
        <source src={src} />
        {vttUrl && (
          <track
            key={vttUrl}       // 트랙 URL 변경 시 강제 리로드
            kind="subtitles"
            src={vttUrl}
            srcLang={lang}
            default
          />
        )}
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
