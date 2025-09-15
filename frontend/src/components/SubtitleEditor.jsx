export default function SubtitleEditor({ segments = [], onChange }) {
    if (!segments?.length) return null;
    return (
      <div className="mt-6 space-y-2">
        <h3 className="font-semibold">생성된 자막 (간단 편집)</h3>
        <div className="text-xs text-gray-500">시작/종료(초), 텍스트 수정 가능</div>
        {segments.map((seg, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input
              className="col-span-2 border rounded p-2"
              type="number"
              step="0.01"
              value={seg.start}
              onChange={(e) => onChange?.(i, { ...seg, start: parseFloat(e.target.value) || 0 })}
            />
            <input
              className="col-span-2 border rounded p-2"
              type="number"
              step="0.01"
              value={seg.end}
              onChange={(e) => onChange?.(i, { ...seg, end: parseFloat(e.target.value) || 0 })}
            />
            <input
              className="col-span-8 border rounded p-2"
              value={seg.text}
              onChange={(e) => onChange?.(i, { ...seg, text: e.target.value })}
            />
          </div>
        ))}
      </div>
    );
  }
  