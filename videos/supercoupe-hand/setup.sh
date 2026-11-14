#!/usr/bin/env bash
# Prépare une machine (cloud ou locale) pour le skill « Après le buzzer ».
# Idempotent : relancer ne réinstalle que ce qui manque. Usage : bash scripts/setup.sh [--no-speakers]
set -u
SPEAKERS=1; [ "${1:-}" = "--no-speakers" ] && SPEAKERS=0
ok(){ printf "  ✓ %s\n" "$1"; }; ko(){ printf "  ✗ %s\n" "$1"; }
SUDO=""; command -v sudo >/dev/null 2>&1 && [ "$(id -u)" != 0 ] && SUDO="sudo"
have(){ command -v "$1" >/dev/null 2>&1; }
echo "== Après le buzzer : préparation de l'environnement"

# 1. ffmpeg — paquet système si possible, sinon binaire statique via pip (sans droits admin)
if ! have ffmpeg; then
  if have apt-get; then $SUDO apt-get update -qq >/dev/null 2>&1; $SUDO apt-get install -y -qq ffmpeg >/dev/null 2>&1; fi
  if ! have ffmpeg && have brew; then brew install ffmpeg >/dev/null 2>&1; fi
  if ! have ffmpeg; then
    python3 -m pip install -q --user imageio-ffmpeg >/dev/null 2>&1 && \
      mkdir -p "$HOME/.local/bin" && ln -sf "$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')" "$HOME/.local/bin/ffmpeg"
    export PATH="$HOME/.local/bin:$PATH"
  fi
fi
have ffmpeg && ok "ffmpeg" || ko "ffmpeg introuvable"
have ffprobe || { have apt-get && $SUDO apt-get install -y -qq ffmpeg >/dev/null 2>&1; }
have ffprobe && ok "ffprobe" || ko "ffprobe absent (les vérifications de durée utiliseront ffmpeg)"

# 2. Node.js ≥ 18 + HyperFrames (télécharge son propre Chrome headless au premier rendu)
if ! have node; then
  if have apt-get; then curl -fsSL https://deb.nodesource.com/setup_20.x 2>/dev/null | $SUDO bash - >/dev/null 2>&1; $SUDO apt-get install -y -qq nodejs >/dev/null 2>&1; fi
  have node || { have brew && brew install node >/dev/null 2>&1; }
fi
have node && ok "node $(node -v)" || ko "node introuvable"
if have npx; then npx -y hyperframes --version >/dev/null 2>&1 && ok "hyperframes" || ko "hyperframes (npx -y hyperframes) — vérifie l'accès réseau à npm"; fi
# bibliothèques système dont Chrome headless a besoin sur Linux
if have apt-get; then $SUDO apt-get install -y -qq libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 fonts-liberation >/dev/null 2>&1 || \
  $SUDO apt-get install -y -qq libnss3 libgbm1 libasound2t64 fonts-liberation >/dev/null 2>&1; fi

# 3. Python : transcription (faster-whisper) + empreinte vocale (speechbrain, CPU)
PIP="python3 -m pip install -q"
python3 -c "import numpy" 2>/dev/null || $PIP numpy >/dev/null 2>&1
python3 -c "import faster_whisper" 2>/dev/null || $PIP faster-whisper >/dev/null 2>&1
python3 -c "import faster_whisper" 2>/dev/null && ok "faster-whisper (transcription)" || ko "faster-whisper"
if [ $SPEAKERS = 1 ]; then
  python3 -c "import torch" 2>/dev/null || $PIP torch torchaudio --index-url https://download.pytorch.org/whl/cpu >/dev/null 2>&1
  python3 -c "import speechbrain" 2>/dev/null || $PIP speechbrain >/dev/null 2>&1
  python3 -c "import speechbrain, torch" 2>/dev/null && ok "speechbrain (détection du journaliste)" || ko "speechbrain/torch — repérage du journaliste à faire à la lecture"
fi
echo "== terminé"
