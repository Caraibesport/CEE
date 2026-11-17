"""Loudness profile around a cut point, 50 ms per value (dBFS). Speech ≈ -8…-20, pause ≈ -25 or lower.
usage: python energy.py <clip> <from> <to>      e.g. python energy.py itw 43.2 44.0"""
import sys, subprocess, numpy as np
c, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
x = np.frombuffer(subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(a), "-t", str(b - a), "-i", f"assets/{c}.mp4", "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32)
print(" ".join(f"{a + i * 0.05:.2f}:{int(20 * np.log10(np.sqrt(np.mean(x[i * 800:(i + 1) * 800] ** 2)) + 1e-9))}" for i in range(len(x) // 800)))
