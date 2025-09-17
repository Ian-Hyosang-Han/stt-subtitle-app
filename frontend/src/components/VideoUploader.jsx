export default function VideoUploader({ onFile }) {
  return (
    <div className="p-4 border rounded-xl bg-white/50">
      <label className="block text-sm font-medium mb-2">동영상/오디오 파일 업로드</label>
      <input
        type="file"
        accept="video/*,audio/*"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onFile?.(f);
          // 같은 파일을 다시 선택해도 change 이벤트가 나도록 리셋
          e.target.value = "";
        }}
      />
    </div>
  );
}
