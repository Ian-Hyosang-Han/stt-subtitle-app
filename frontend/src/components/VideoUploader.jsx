export default function VideoUploader({ onFile }) {
    return (
      <div className="p-4 border rounded-xl bg-white/50">
        <label className="block text-sm font-medium mb-2">동영상/오디오 파일 업로드</label>
        <input
          type="file"
          accept="video/*,audio/*"
          onChange={(e) => onFile?.(e.target.files?.[0] ?? null)}
        />
        {/* <p className="text-xs text-gray-500 mt-2">
          예) ~/Downloads/golden.mp4
        </p> */}
      </div>
    );
  }
  