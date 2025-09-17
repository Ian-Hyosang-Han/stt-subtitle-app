export default function UploadList({ items, currentId, onSelect, height }) {
    return (
      <aside
        className="rounded-xl border bg-white/5 p-3 overflow-y-auto"
        style={{ height: height ? `${height}px` : undefined }}
      >
        <h3 className="font-semibold mb-2">업로드 목록</h3>
        {items.length === 0 && (
          <div className="text-sm text-gray-400">아직 업로드된 항목이 없습니다.</div>
        )}
        <ul className="space-y-2">
          {items.map((it) => {
            const isActive = it.id === currentId;
            return (
              <li
                key={it.id}
                className={`p-2 rounded border cursor-pointer ${
                  isActive ? "border-yellow-300 bg-yellow-50/20" : "border-white/10 hover:border-white/30"
                }`}
                onClick={() => onSelect?.(it.id)}
                title={it.name}
              >
                <div className="text-sm font-medium truncate">{it.name}</div>
                <div className="text-xs text-gray-400">
                  {it.status} {it.segments?.length ? `· ${it.segments.length} lines` : ""}
                </div>
              </li>
            );
          })}
        </ul>
      </aside>
    );
  }
  