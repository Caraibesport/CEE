# Snap each cut to real silences so no word is clipped. Writes cuts.json.
import json, subprocess, numpy as np
SR = 16000; HOP = 0.01
PLAN = json.load(open("plan.json"))
cache = {}
def rms(clip):
    if clip not in cache:
        x = np.frombuffer(subprocess.run(["ffmpeg","-nostdin","-v","error","-i",f"assets/{clip}.mp4","-vn","-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True).stdout, dtype=np.float32)
        n = int(0.03*SR); h = int(HOP*SR)
        r = np.array([20*np.log10(np.sqrt(np.mean(x[i:i+n]**2))+1e-9) for i in range(0, len(x)-n, h)])
        cache[clip] = (r, np.percentile(r, 12) + 7)
    return cache[clip]
words = {c: [w for s in json.load(open(f"wx/{c}.json"))["segments"] for w in s["words"]] for c in {p["clip"] for p in PLAN}}
out = []
for p in PLAN:
    r, thr = rms(p["clip"])
    ws = [w for w in words[p["clip"]] if p["from"] - 0.05 <= w["start"] <= p["to"] + 0.05]
    a, lastStart = ws[0]["start"], ws[-1]["start"]
    lo = p.get("min", a - 0.6)
    # start: walk back from first word to the nearest 80 ms of quiet
    i = int(a/HOP); start = max(lo, a - 0.12)
    for k in range(i, int(lo/HOP), -1):
        if (r[k-8:k] < thr).all(): start = max(lo, k*HOP - 0.04); break
    # end: from last word onset, find first 220 ms of quiet; cap by limit
    hi = p.get("max", lastStart + 2.5)
    j = int((lastStart + 0.12)/HOP); end = min(hi, ws[-1]["end"] + 0.2)
    for k in range(j, int(hi/HOP)):
        if (r[k:k+22] < thr).all(): end = min(hi, k*HOP + 0.14); break
    if "end" in p: end = p["end"]
    out.append({**p, "a": round(start, 3), "b": round(end, 3), "text": " ".join(w["word"] for w in ws)})
    print(f'{p["clip"]} {start:7.2f}-{end:7.2f} ({end-start:5.2f}s) | {ws[0]["word"]} … {" ".join(w["word"] for w in ws[-4:])}')
json.dump(out, open("cuts.json", "w"), ensure_ascii=False, indent=1)
print("total", round(sum(o["b"]-o["a"] for o in out), 1))
