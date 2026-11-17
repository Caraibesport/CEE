"""Transcription mot à mot au format WhisperX (segments[].words[] {word,start,end}).
usage: python transcribe.py assets/<clip>.mp4 wx/<clip>.json [--model large-v3-turbo|small] [--lang fr]
Sur CPU, « small » est ~5x plus rapide que « large-v3-turbo » mais se trompe plus sur les noms propres."""
import argparse, json, os
from faster_whisper import WhisperModel
ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--model", default="large-v3-turbo"); ap.add_argument("--lang", default="fr")
a = ap.parse_args()
m = WhisperModel(a.model, device="auto", compute_type="int8")
segs, _ = m.transcribe(a.src, language=a.lang, word_timestamps=True, vad_filter=True)
out = []
for s in segs:
    ws = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for w in (s.words or []) if w.word.strip()]
    if ws: out.append({"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(), "words": ws})
os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
json.dump({"segments": out, "language": a.lang}, open(a.out, "w"), ensure_ascii=False, indent=1)
print(f"{len(out)} segments → {a.out}")
