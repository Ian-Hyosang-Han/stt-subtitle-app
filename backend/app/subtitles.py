from typing import List, Dict

def _format_timestamp(seconds: float, vtt: bool=False) -> str:
    ms = int(seconds * 1000)
    hh = ms // 3600000
    mm = (ms % 3600000) // 60000
    ss = (ms % 60000) // 1000
    mmm = ms % 1000
    sep = "." if vtt else ","
    return f"{hh:02}:{mm:02}:{ss:02}{sep}{mmm:03}"

def segments_to_srt(segments: List[Dict]) -> str:
    lines = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{_format_timestamp(seg['start'])} --> {_format_timestamp(seg['end'])}")
        lines.append(seg["text"])
        lines.append("")
    return "\n".join(lines)

def segments_to_vtt(segments: List[Dict]) -> str:
    lines = ["WEBVTT", ""]
    for seg in segments:
        lines.append(f"{_format_timestamp(seg['start'], True)} --> {_format_timestamp(seg['end'], True)}")
        lines.append(seg["text"])
        lines.append("")
    return "\n".join(lines)
