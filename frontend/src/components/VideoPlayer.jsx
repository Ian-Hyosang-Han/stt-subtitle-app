export default function VideoPlayer({ src, vttUrl, lang = "en" }) {
    if (!src) return null;
    return (
        <div className="mt-4">
            <video
                controls
                className="w-full max-w-3xl rounded-xl shadow"
                crossOrigin="anonymous"
            >
                <source src={src} />
                {vttUrl && <track kind="subtitles" src={vttUrl} srcLang={lang} default />}
                {/* 일부 브라우저는 crossOrigin 설정이 필요할 수 있음 */}
                지원되지 않는 브라우저입니다.
            </video>
            {vttUrl && (
                <div className="mt-2 text-sm">
                    자막 파일:{" "}
                    <a className="underline text-blue-600" href={vttUrl} target="_blank" rel="noreferrer">
                        {vttUrl}
                    </a>
                </div>
            )}
        </div>
    );
}
