export default function SubtitleEditor({ segments = [], onChange, onRepeat, activeIndex }) {

  if (!segments?.length) return null;

  return (
    <div className="mt-6 space-y-2">
      <h3 className="font-semibold">생성된 자막</h3>
      <div className="text-s text-gray-500">시작/종료(초), 텍스트 수정 · 반복 재생</div>

      {segments.map((seg, i) => {
        const isActive = activeIndex === i;
        return (
          <div
            key={i}
            className={`grid grid-cols-11 gap-2 items-center p-2 rounded ${
              isActive ? "border border-yellow-200" : ""
            }`}
          >
            <input
              className="col-span-1 border rounded p-2"
              type="number"
              step="0.01"
              value={seg.start}
              onChange={(e) =>
                onChange?.(i, { ...seg, start: parseFloat(e.target.value) || 0 })
              }
            />
            <input
              className="col-span-1 border rounded p-2"
              type="number"
              step="0.01"
              value={seg.end}
              onChange={(e) =>
                onChange?.(i, { ...seg, end: parseFloat(e.target.value) || 0 })
              }
            />
            <input
              className="col-span-8 border rounded p-2"
              value={seg.text}
              onChange={(e) => onChange?.(i, { ...seg, text: e.target.value })}
            />

            {/* Repeat 버튼 */}
            <button
              onClick={() => onRepeat?.(i, seg)}
              className={`col-span-1 px-3 py-2 rounded text-sm ${
                isActive ? "bg-red-600 text-white" : "bg-white text-black"
              }`}
              title={isActive ? "반복 끄기" : "이 구간 반복"}
            >
              {isActive ? "Stop" : "Repeat"}
            </button>
          </div>
        );
      })}
    </div>
  );
}