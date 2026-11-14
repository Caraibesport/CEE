"""Who is speaking? Separates the interviewee from the journalist with voice embeddings.

usage: python speakers.py <clip> --journalist 0.0-2.9 [44.7-53.1 ...] [--speaker 20-34 ...]
  <clip>          name of assets/<clip>.mp4 (transcript in wx/<clip>.json)
  --journalist    time ranges where you are SURE the journalist is talking (the questions)
  --speaker       optional ranges where you are sure the interviewee talks
                  (default: every transcript line longer than 2.5 s outside the journalist ranges)
Prints every transcript line tagged speak / JOURN with a margin, then a 0.5 s map.
Lines with a margin under ±0.15 are uncertain: check the content before keeping them.
needs: pip install speechbrain torch torchaudio numpy  (+ ffmpeg)
"""
import argparse, json, subprocess, numpy as np, torch
from speechbrain.inference.speaker import EncoderClassifier

ap = argparse.ArgumentParser()
ap.add_argument("clip"); ap.add_argument("--journalist", nargs="+", required=True); ap.add_argument("--speaker", nargs="*")
a = ap.parse_args()
rng = lambda xs: [tuple(map(float, x.split("-"))) for x in xs]
J_R, S_R = rng(a.journalist), rng(a.speaker or [])
enc = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb", savedir="/tmp/ecapa")
x = np.frombuffer(subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", f"assets/{a.clip}.mp4", "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32)
w = torch.from_numpy(x.copy())
def emb(s, e):
    seg = w[int(s * 16000):int(e * 16000)]
    if len(seg) < 8000: return None
    v = enc.encode_batch(seg.unsqueeze(0)).squeeze().numpy(); return v / np.linalg.norm(v)
def centroid(vs):
    vs = [v for v in vs if v is not None]; c = np.mean(vs, 0); return c / np.linalg.norm(c)
segs = json.load(open(f"wx/{a.clip}.json"))["segments"]
in_j = lambda s: any(s["start"] >= p - 0.3 and s["end"] <= q + 0.3 for p, q in J_R)
J = centroid([emb(p, q) for p, q in J_R])
S = centroid([emb(p, q) for p, q in S_R] if S_R else [emb(s["start"], s["end"]) for s in segs if not in_j(s) and s["end"] - s["start"] > 2.5])
print("== lines")
for s in segs:
    v = emb(s["start"], s["end"])
    if v is None: print(f'{s["start"]:7.2f}-{s["end"]:7.2f}  short  {s["text"].strip()[:80]}'); continue
    d = float(v @ S - v @ J)
    print(f'{s["start"]:7.2f}-{s["end"]:7.2f} {"speak" if d > 0 else "JOURN"} {d:+.2f} {s["text"].strip()[:80]}')
print("== 0.5 s map (S = interviewee, J = journalist, -- = quiet)")
out = []
for t in np.arange(0, len(x) / 16000 - 1, 0.5):
    seg = x[int(t * 16000):int((t + 1) * 16000)]
    if 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9) < -38: out.append(f"{t:6.1f} --"); continue
    d = float(emb(t, t + 1) @ S - emb(t, t + 1) @ J); out.append(f"{t:6.1f} {'S' if d > 0 else 'J'}{d:+.2f}")
print("\n".join(" | ".join(out[i:i + 8]) for i in range(0, len(out), 8)))
