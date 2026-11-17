// Après le buzzer — template. Reads project.json (+ cuts.json, wx/<clip>.json, assets/<clip>.mp4)
// and writes index.html for HyperFrames. Run from the project folder: node build.mjs
import fs from "node:fs";

const W = (f) => JSON.parse(fs.readFileSync(`wx/${f}.json`, "utf8")).segments.flatMap((s) => s.words);
const CFG = JSON.parse(fs.readFileSync("project.json", "utf8"));
const CUTS = JSON.parse(fs.readFileSync("cuts.json", "utf8"));
const TEASER = CFG.teaser || []; // punchlines played BEFORE the buzzer: [{ clip, a, b }]
const words = Object.fromEntries([...new Set([...CUTS, ...TEASER].map((c) => c.clip))].map((c) => [c, W(c)]));

const SPEAKERS = CFG.speakers; // { clip: { name, role } }
const FIX = CFG.fix || {}; // on-screen word fixes
const CALLOUTS = CFG.callouts || []; // { clip, src, d, big, small }

const r3 = (n) => Math.round(n * 1000) / 1000;
const INTRO = 3.6; // buzzer → show name slam → wipe into the interview
const OUTRO = 4.6;

// 1. punchlines (teaser) → 2. buzzer + intro → 3. the interview
let t = 0;
const tsegs = TEASER.map((c) => { const s = { clip: c.clip, a: c.a, b: c.b, teaser: true, out: r3(t), dur: r3(c.b - c.a) }; t += c.b - c.a; return s; });
const INTRO_AT = r3(t);
const BUZZ_AT = r3(INTRO_AT + 0.05), DROP = r3(INTRO_AT + 0.95); // music + show-name slam land on the end of the buzzer
const MAIN_START = r3(INTRO_AT + INTRO);
t = MAIN_START;
const msegs = CUTS.map((c) => { const s = { clip: c.clip, a: c.a, b: c.b, chapter: c.chapter, out: r3(t), dur: r3(c.b - c.a) }; t += c.b - c.a; return s; });
const segs = [...tsegs, ...msegs].map((s, i) => ({ ...s, i }));
const SPEECH_END = r3(t);
const DUR = r3(SPEECH_END + OUTRO);
const toOut = (clip, src) => {
  const s = segs.find((s) => !s.teaser && s.clip === clip && src >= s.a && src <= s.b);
  return s ? r3(s.out + (src - s.a)) : null;
};
const segOut = (s, src) => r3(s.out + (src - s.a));
const lane = (pts) => `data-automation='${JSON.stringify({ version: 1, lanes: [{ target: "volume", points: pts.map(([t, v]) => ({ t: r3(t), v })) }] })}'`;

// cuts that change speaker (or open a chapter) get the full graphic wipe; same-speaker jump cuts get a punch + flash
const isWipe = (i) => i === 0 || segs[i].clip !== segs[i - 1].clip || !!segs[i].chapter || !!segs[i].teaser !== !!segs[i - 1].teaser;

// ---------- media ----------
let media = "";
segs.forEach((s) => {
  const n = s.i + 1;
  media += `      <div class="vw" id="vw${n}"><video id="v${n}" class="clip" src="assets/${s.clip}.mp4" data-start="${s.out}" data-media-start="${s.a}" data-duration="${s.dur}" data-track-index="0" muted playsinline></video></div>\n`;
  media += `      <audio id="a${n}" src="assets/${s.clip}.mp4" data-start="${s.out}" data-media-start="${s.a}" data-duration="${s.dur}" data-track-index="10" data-volume="1" ${lane([[0, 0], [0.05, 1], [s.dur - 0.07, 1], [s.dur, 0]])}></audio>\n`;
});

// ---------- music: two passes of the track (second enters on the 0:32 drop) ----------
const BED = 0.07, FULL = 0.42;
const A_DUR = r3(DUR - DROP);
const outroA = SPEECH_END - DROP;
const musicA = lane([[0, FULL], [MAIN_START - DROP - 0.4, FULL], [MAIN_START - DROP + 0.4, BED], [outroA - 0.3, BED], [outroA + 0.3, FULL], [A_DUR - 1.4, FULL], [A_DUR, 0]]);
let sound = "";
sound += `      <audio id="music-a" src="${CFG.music}" data-start="${DROP}" data-media-start="0" data-duration="${A_DUR}" data-track-index="11" data-volume="1" ${musicA}></audio>\n`;
sound += `      <audio id="sfx-buzzer" src="sfx/buzzer.wav" data-start="${BUZZ_AT}" data-duration="1.67" data-track-index="13" data-volume="0.9"></audio>\n`;
sound += `      <audio id="sfx-slam" src="sfx/impact.mp3" data-start="${DROP}" data-duration="2.1" data-track-index="14" data-volume="0.45"></audio>\n`;
if (INTRO_AT > 1) { const rs = Math.max(0, INTRO_AT - 10.03); sound += `      <audio id="sfx-riser" src="sfx/riser.mp3" data-start="${r3(rs)}" data-media-start="${r3(Math.max(0, 10.03 - INTRO_AT))}" data-duration="${r3(INTRO_AT - rs)}" data-track-index="16" data-volume="0.22"></audio>\n`; }
let sfxN = 0;
const whoosh = (at, v = 0.55) => { sound += `      <audio id="sfx-w${sfxN++}" src="sfx/whoosh.mp3" data-start="${r3(at)}" data-duration="0.57" data-track-index="15" data-volume="${v}"></audio>\n`; };

// ---------- transitions ----------
let trJs = "";
const WIN = 0.24, WOUT = 0.3;
const wipeAt = (T) => {
  trJs += `      tl.set("#wipeA", { xPercent: -135 }, ${r3(T - WIN)}).to("#wipeA", { xPercent: 0, duration: ${WIN}, ease: "power3.in" }, ${r3(T - WIN)}).to("#wipeA", { xPercent: 135, duration: ${WOUT}, ease: "power3.out" }, ${r3(T)});\n`;
  trJs += `      tl.set("#wipeB", { xPercent: -135 }, ${r3(T - WIN + 0.05)}).to("#wipeB", { xPercent: 0, duration: ${WIN}, ease: "power3.in" }, ${r3(T - WIN + 0.05)}).to("#wipeB", { xPercent: 135, duration: ${WOUT}, ease: "power3.out" }, ${r3(T + 0.05)});\n`;
  whoosh(T - 0.3);
};
const sizes = CFG.tightFraming ? [1.0, 1.03] : [1.0, 1.1, 1.04, 1.12]; // selfie-close framing → gentle zooms
segs.forEach((s, i) => {
  const n = s.i + 1;
  const sc = sizes[i % sizes.length];
  const wipe = isWipe(i);
  trJs += `      tl.fromTo("#vw${n}", { scale: ${wipe ? r3(sc + (CFG.tightFraming ? 0.14 : 0.3)) : r3(sc + (CFG.tightFraming ? 0.05 : 0.08))}, filter: "blur(${wipe ? 16 : 6}px)" }, { scale: ${sc}, filter: "blur(0px)", duration: ${wipe ? 0.55 : 0.3}, ease: "expo.out" }, ${s.out});\n`;
  trJs += `      tl.to("#vw${n}", { scale: ${r3(sc + 0.03)}, duration: ${r3(Math.max(0.5, s.dur - 0.7))}, ease: "none" }, ${r3(s.out + 0.6)});\n`;
  if (i === 0 || !!s.teaser !== !!segs[i - 1].teaser) return; // teaser→intro and intro→interview get their own wipes below
  if (wipe) wipeAt(s.out);
  else trJs += `      tl.set("#flash", { opacity: 0.6 }, ${s.out}).to("#flash", { opacity: 0, duration: 0.25, ease: "power2.out" }, ${s.out});\n`;
});
if (INTRO_AT > 0) wipeAt(INTRO_AT);
wipeAt(MAIN_START);
wipeAt(SPEECH_END);

// ---------- captions: up to 3 words, active word highlighted ----------
let caps = "", capJs = "";
const capTxt = [];
let gid = 0;
segs.forEach((s) => {
  const ws = words[s.clip].filter((w) => w.start >= s.a - 0.02 && w.start < s.b - 0.05 && w.word !== "?");
  const groups = [];
  let cur = [];
  ws.forEach((w) => {
    cur.push(w);
    if (/[.,!?…]$/.test(w.word) || cur.length === 3) { groups.push(cur); cur = []; }
  });
  if (cur.length) groups.push(cur);
  groups.forEach((g, gi) => {
    const id = `cg${gid++}`;
    const st = Math.max(r3(s.out + 0.2), segOut(s, Math.max(s.a, g[0].start)));
    const nextG = groups[gi + 1];
    const endSrc = nextG ? nextG[0].start : Math.min(s.b, g[g.length - 1].end + 0.6);
    const en = Math.min(r3(s.out + (endSrc - s.a)), r3(s.out + s.dur - 0.05));
    if (en - st < 0.12) return;
    const spans = g.map((w, k) => `<span class="w" id="${id}w${k}">${(FIX[w.word] ?? w.word).replace(/[.,!?…]+$/, "")}</span>`).join(" ");
    caps += `      <div class="cg" id="${id}">${spans}</div>\n`;
    capTxt.push(`${st.toFixed(2)}  ${g.map((w) => w.word).join(" ")}`);
    capJs += `      tl.set("#${id}", { opacity: 1 }, ${st}).fromTo("#${id}", { y: 24, scale: 0.94 }, { y: 0, scale: 1, duration: 0.18, ease: "back.out(2)" }, ${st}).set("#${id}", { opacity: 0 }, ${en});\n`;
    g.forEach((w, k) => {
      const w0 = Math.max(st, segOut(s, Math.max(s.a, w.start)));
      const we = Math.min(en, r3(w0 + Math.max(0.12, w.end - w.start)));
      if (we > w0) capJs += `      tl.set("#${id}w${k}", { attr: { class: "w on" } }, ${w0}).set("#${id}w${k}", { attr: { class: "w" } }, ${we});\n`;
    });
  });
});

// ---------- chapter cards, lower thirds, callouts ----------
let gfx = "", gfxJs = "";
let chN = 0;
const seen = new Set();
segs.forEach((s) => {
  if (s.chapter) {
    chN++;
    const id = `ch${s.i}`, at = r3(s.out + 0.25);
    gfx += `      <div class="ch" id="${id}"><span class="ch-n">${String(chN).padStart(2, "0")}</span><span class="ch-t">${s.chapter}</span></div>\n`;
    gfxJs += `      tl.fromTo("#${id}", { opacity: 0, x: -500 }, { opacity: 1, x: 0, duration: 0.45, ease: "expo.out" }, ${at})
        .fromTo("#${id} .ch-n", { rotation: -90, scale: 0 }, { rotation: 0, scale: 1, duration: 0.4, ease: "back.out(2.5)" }, ${r3(at + 0.1)})
        .to("#${id}", { opacity: 0, x: 600, duration: 0.35, ease: "power3.in" }, ${r3(at + 2.6)});\n`;
  }
  if (!s.teaser && !seen.has(s.clip)) {
    seen.add(s.clip);
    const sp = SPEAKERS[s.clip];
    const id = `lt-${s.clip}`, at = r3(s.out + 1.0), d = 3.2;
    gfx += `      <div class="lt" id="${id}"><div class="lt-tag">${CFG.tag}</div><div class="lt-name">${sp.name}</div><div class="lt-role">${sp.role}</div><div class="lt-rule"></div></div>\n`;
    gfxJs += `      tl.fromTo("#${id}", { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, ${at})
        .fromTo("#${id} .lt-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.inOut" }, ${r3(at + 0.2)})
        .to("#${id}", { opacity: 0, x: -40, duration: 0.3, ease: "power2.in" }, ${r3(at + d - 0.3)});\n`;
  }
});
CALLOUTS.forEach((c, k) => {
  const at = toOut(c.clip, c.src);
  if (at == null) throw new Error(`callout ${c.big} outside the cut`);
  const id = `co${k}`;
  gfx += `      <div class="co" id="${id}"><div class="co-big">${c.big}</div><div class="co-small">${c.small}</div><div class="co-rule"></div></div>\n`;
  gfxJs += `      tl.fromTo("#${id}", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, ${at})
        .fromTo("#${id} .co-big", { scale: 1.35 }, { scale: 1, duration: 0.45, ease: "back.out(2)" }, ${at})
        .fromTo("#${id} .co-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.inOut" }, ${r3(at + 0.15)})
        .to("#${id}", { opacity: 0, y: -20, duration: 0.25, ease: "power2.in" }, ${r3(at + c.d - 0.25)});\n`;
  whoosh(at, 0.3);
});

const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Résumé handball</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Anton"; src: url("fonts/Anton-Regular.ttf") format("truetype"); font-weight: 400; }
      :root { --red: #E3262B; --ink: #141013; --paper: #F7F2EC; --green: #1E9E4A; }
      body { margin: 0; background: #000; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--ink); }
      .vw { position: absolute; inset: 0; transform-origin: 50% 30%; }
      .vw video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      #grade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%); }
      #flash { position: absolute; inset: 0; background: #fff; opacity: 0; }
      .wipe { position: absolute; top: -10%; left: -20%; width: 140%; height: 120%; }
      #wipeA { background: var(--red); clip-path: polygon(18% 0, 100% 0, 82% 100%, 0 100%); }
      #wipeB { background: var(--ink); clip-path: polygon(30% 0, 100% 0, 70% 100%, 0 100%); }
      /* intro */
      #intro { position: absolute; inset: 0; background: var(--ink); overflow: hidden; }
      #intro .sb { position: absolute; left: 90px; right: 90px; top: 640px; height: 520px; background: #0a080a; border: 6px solid #2a2629; box-shadow: inset 0 0 60px rgba(0,0,0,.8); }
      #intro .sb-lab { position: absolute; top: 46px; width: 50%; text-align: center; font: 700 30px "JetBrains Mono"; letter-spacing: 6px; color: #b9b2aa; }
      #intro .sb-score { position: absolute; top: 120px; left: 0; right: 0; text-align: center; font: 700 230px/1 "JetBrains Mono"; color: #ff3b30; text-shadow: 0 0 18px rgba(255,59,48,.85), 0 0 50px rgba(255,59,48,.45); }
      #intro .sb-clock { position: absolute; bottom: 40px; left: 0; right: 0; text-align: center; font: 700 70px "JetBrains Mono"; color: #ffb000; text-shadow: 0 0 16px rgba(255,176,0,.8); letter-spacing: 8px; }
      #intro .sb-end { position: absolute; left: 90px; right: 90px; top: 1190px; text-align: center; font: 700 40px "JetBrains Mono"; letter-spacing: 12px; color: var(--paper); }
      #intro .in-band { position: absolute; left: -40px; top: 860px; width: 1160px; height: 430px; background: var(--red); transform-origin: 0 50%; }
      #intro .in-mask { position: absolute; left: 110px; overflow: hidden; }
      #intro .in-l1 { top: 885px; height: 200px; }
      #intro .in-l2 { top: 1070px; height: 200px; }
      #intro .in-txt { font-family: "League Gothic"; font-size: 210px; line-height: 0.95; color: var(--paper); white-space: nowrap; }
      #intro .in-l2 .in-txt { color: var(--ink); }
      #intro .in-chip { position: absolute; left: 110px; top: 790px; padding: 12px 22px; background: var(--ink); color: var(--paper); font: 700 34px "JetBrains Mono"; letter-spacing: 0.1em; }
      #intro .in-chip b { color: var(--green); }
      /* bug */
      #bug { position: absolute; left: 56px; top: 96px; display: flex; align-items: center; gap: 16px; background: var(--ink); padding: 12px 24px 12px 12px; }
      #bug .bg-mark { width: 62px; height: 62px; background: var(--red); color: var(--paper); font: 400 40px "League Gothic"; display: flex; align-items: center; justify-content: center; }
      #bug .bg-brand { font: 400 38px/1 "League Gothic"; color: var(--paper); letter-spacing: 1px; }
      #bug .bg-brand b { color: var(--red); font-weight: 400; }
      #bug .bg-lab { font: 700 18px "JetBrains Mono"; letter-spacing: 3px; color: #d8d2c8; margin-top: 4px; }
      /* captions */
      .cg { position: absolute; left: 60px; right: 60px; top: 1300px; text-align: center; font: 400 92px/1.12 "Anton"; color: #fff; text-transform: uppercase; opacity: 0;
            text-shadow: 0 0 2px #000, 0 4px 0 #000, 0 8px 22px rgba(0,0,0,.6); -webkit-text-stroke: 3px #000; paint-order: stroke fill; }
      .cg .w { display: inline-block; padding: 0 10px; border-radius: 6px; }
      .cg .w.on { background: var(--red); -webkit-text-stroke: 0; text-shadow: none; box-shadow: 0 0 0 4px #000; }
      /* lower third */
      .lt { position: absolute; left: 56px; top: 1020px; background: var(--ink); padding: 24px 34px 26px; opacity: 0; min-width: 440px; }
      .lt-tag { position: absolute; left: 0; top: -44px; background: var(--red); color: #fff; font: 700 20px "JetBrains Mono"; letter-spacing: 3px; padding: 8px 14px; }
      .lt-name { font: 400 84px/1 "League Gothic"; color: #fff; }
      .lt-role { font: 700 24px "JetBrains Mono"; color: #d8d2c8; letter-spacing: 2px; margin-top: 10px; text-transform: uppercase; }
      .lt-rule { height: 6px; background: var(--green); margin-top: 16px; transform-origin: 0 50%; }
      /* chapter */
      .ch { position: absolute; left: 56px; top: 230px; display: flex; align-items: stretch; opacity: 0; }
      .ch-n { display: flex; align-items: center; justify-content: center; width: 96px; background: var(--red); color: var(--paper); font: 700 38px "JetBrains Mono"; }
      .ch-t { background: var(--ink); color: var(--paper); font: 400 80px/1 "League Gothic"; padding: 12px 30px 10px; letter-spacing: 1px; }
      /* callout */
      .co { position: absolute; left: 56px; top: 960px; background: var(--ink); padding: 22px 34px 26px; opacity: 0; border-left: 12px solid var(--red); }
      .co-big { font: 400 140px/1 "League Gothic"; color: #fff; transform-origin: 0 100%; }
      .co-small { font: 700 26px "JetBrains Mono"; color: #d8d2c8; letter-spacing: 2px; margin-top: 10px; text-transform: uppercase; }
      .co-rule { height: 6px; background: var(--green); margin-top: 16px; transform-origin: 0 50%; }
      /* outro */
      #outro { position: absolute; inset: 0; background: var(--ink); overflow: hidden; }
      #outro .ou-band { position: absolute; left: -40px; top: 760px; width: 1160px; height: 430px; background: var(--red); transform-origin: 0 50%; }
      #outro .ou-mask { position: absolute; left: 110px; overflow: hidden; }
      #outro .ou-l1 { top: 785px; height: 200px; }
      #outro .ou-l2 { top: 970px; height: 200px; }
      #outro .ou-txt { font-family: "League Gothic"; font-size: 210px; line-height: 0.95; color: var(--paper); white-space: nowrap; }
      #outro .ou-l2 .ou-txt { color: var(--ink); }
      #outro .ou-chip { position: absolute; left: 110px; top: 690px; padding: 12px 22px; background: var(--paper); color: var(--ink); font: 700 34px "JetBrains Mono"; letter-spacing: 0.1em; }
      #outro .ou-score { position: absolute; left: 110px; top: 1250px; white-space: nowrap; font: 400 96px "League Gothic"; color: var(--paper); letter-spacing: 1px; }
      #outro .ou-score b { color: var(--red); font-weight: 400; }
      #outro .ou-sub { position: absolute; left: 110px; top: 1370px; font: 700 30px "JetBrains Mono"; letter-spacing: 0.12em; color: #d8d2c8; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${DUR}">
${media}${sound}      <div id="grade" class="clip" data-start="0" data-duration="${SPEECH_END}" data-track-index="1"></div>
      <div id="flash"></div>
      <div id="bug" class="clip" data-start="${r3(MAIN_START + 0.6)}" data-duration="${r3(SPEECH_END - MAIN_START - 0.6)}" data-track-index="2"><div class="bg-mark">AB</div><div><div class="bg-brand">APRÈS LE BUZZER</div><div class="bg-lab">${CFG.bugLabel}</div></div></div>
      <div id="gfx" class="clip" data-start="0" data-duration="${SPEECH_END}" data-track-index="4">
${gfx}      </div>
      <div id="caps" class="clip" data-start="0" data-duration="${SPEECH_END}" data-track-index="5">
${caps}      </div>
      <div id="intro" class="clip" data-start="${INTRO_AT}" data-duration="${INTRO}" data-track-index="6">
        <div class="sb"><div class="sb-lab" style="left:0">DOMICILE</div><div class="sb-lab" style="right:0">VISITEURS</div><div class="sb-score">${CFG.score || "00:00"}</div><div class="sb-clock">${CFG.score ? "00:00" : CFG.sport}</div></div>
        <div class="sb-end">FIN DU MATCH</div>
        <div class="in-band"></div>
        <div class="in-chip">${CFG.introChip}</div>
        <div class="in-mask in-l1"><div class="in-txt">APRÈS LE</div></div>
        <div class="in-mask in-l2"><div class="in-txt">BUZZER</div></div>
      </div>
      <div id="outro" class="clip" data-start="${SPEECH_END}" data-duration="${OUTRO}" data-track-index="7">
        <div class="ou-band"></div>
        <div class="ou-chip">MERCI D'AVOIR SUIVI</div>
        <div class="ou-mask ou-l1"><div class="ou-txt">APRÈS LE</div></div>
        <div class="ou-mask ou-l2"><div class="ou-txt">BUZZER</div></div>
        <div class="ou-score">${CFG.outroLine}</div>
        <div class="ou-sub">ABONNEZ-VOUS · À LA SEMAINE PROCHAINE</div>
      </div>
      <div class="wipe" id="wipeB"></div>
      <div class="wipe" id="wipeA"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.set(".wipe", { xPercent: -135 }, 0);
      // intro: scoreboard + buzzer, then the show name slams in on the music drop
      tl.fromTo("#intro .sb", { scale: 1.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "expo.out" }, ${INTRO_AT})
        .fromTo("#intro .sb", { x: -10 }, { x: 10, duration: 0.05, repeat: 13, yoyo: true, ease: "none" }, ${BUZZ_AT})
        .fromTo("#intro .sb-score", { scale: 1 }, { scale: 1.08, duration: 0.12, repeat: 5, yoyo: true, ease: "sine.inOut" }, ${BUZZ_AT})
        .fromTo("#intro .sb-clock", { opacity: 0.2 }, { opacity: 1, duration: 0.08, repeat: 9, yoyo: true, ease: "none" }, ${BUZZ_AT})
        .fromTo("#intro .sb-end", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.2, ease: "power3.out" }, ${r3(BUZZ_AT + 0.15)})
        .to("#intro .sb, #intro .sb-end", { opacity: 0, scale: 1.5, filter: "blur(12px)", duration: 0.18, ease: "power3.in" }, ${r3(DROP - 0.18)})
        .set("#flash", { opacity: 0.9 }, ${DROP}).to("#flash", { opacity: 0, duration: 0.35, ease: "power2.out" }, ${DROP})
        .fromTo("#intro .in-band", { scaleX: 0, rotation: -3 }, { scaleX: 1, rotation: 0, duration: 0.35, ease: "power4.out" }, ${DROP})
        .fromTo("#intro .in-txt", { yPercent: 110, scale: 1.25, opacity: 0 }, { yPercent: 0, scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.8)", stagger: 0.09 }, ${r3(DROP + 0.08)})
        .fromTo("#intro .in-chip", { x: -400, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "expo.out" }, ${r3(DROP + 0.3)})
        .fromTo("#intro .in-band", { y: 0 }, { y: -6, duration: 0.06, repeat: 5, yoyo: true, ease: "none" }, ${r3(DROP + 0.1)})
        .to("#intro .in-band", { scaleY: 1.05, duration: 1.4, ease: "sine.inOut" }, ${r3(DROP + 0.6)});
${trJs}${gfxJs}${capJs}      // bug + outro
      tl.fromTo("#bug", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, ${r3(MAIN_START + 0.6)})
        .fromTo("#outro .ou-band", { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "power4.out" }, ${r3(SPEECH_END + 0.1)})
        .fromTo("#outro .ou-txt", { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: "back.out(1.4)", stagger: 0.12 }, ${r3(SPEECH_END + 0.25)})
        .fromTo("#outro .ou-chip", { x: -300, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "expo.out" }, ${r3(SPEECH_END + 0.5)})
        .fromTo("#outro .ou-score", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, ${r3(SPEECH_END + 0.8)})
        .fromTo("#outro .ou-sub", { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${r3(SPEECH_END + 1.1)})
        .to("#outro .ou-band", { scaleY: 1.04, duration: 2.5, ease: "sine.inOut" }, ${r3(SPEECH_END + 0.6)});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
fs.writeFileSync("index.html", html);
fs.writeFileSync("captions.txt", capTxt.join("\n") + "\n");
fs.writeFileSync("edl.txt", segs.map((s) => `${s.i + 1}\t${s.teaser ? "TEASER" : ""}\t${s.clip}\tsrc ${s.a}-${s.b}\tout ${s.out}\t${s.chapter ?? ""}`).join("\n") + "\n");
console.log(`built: ${segs.length} clips, ${DUR}s total, speech ends ${SPEECH_END}, ${sfxN} whooshes, teaser ${INTRO_AT}s, interview from ${MAIN_START}s`);
