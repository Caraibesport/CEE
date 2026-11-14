"""Transcription via openai-whisper → format WhisperX (segments[].words[]).
usage: python transcribe_ow.py assets/<clip>.mp4 wx/<clip>.json [--model small] [--lang fr]
"""
import argparse, json, os
import whisper

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("out")
ap.add_argument("--model", default="small")
ap.add_argument("--lang", default="fr")
a = ap.parse_args()

m = whisper.load_model(a.model)
result = m.transcribe(a.src, language=a.lang, word_timestamps=True)

out = []
for s in result["segments"]:
    words = s.get("words", [])
    ws = [{"word": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)}
          for w in words if w["word"].strip()]
    if ws:
        out.append({
            "start": round(s["start"], 3),
            "end": round(s["end"], 3),
            "text": s["text"].strip(),
            "words": ws
        })

os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
json.dump({"segments": out, "language": a.lang}, open(a.out, "w"), ensure_ascii=False, indent=1)
print(f"{len(out)} segments → {a.out}")
