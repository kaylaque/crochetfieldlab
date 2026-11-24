// crochet.py workshop mode.
// Camera -> MediaPipe Hand Landmarker (JS) -> check_pose() in rules.py (Python via Pyodide) -> pixel UI.
// Progress for chains and cleared levels is written into the main course's storage so "My journal" keeps it.

// 0.10.22 (used by the main course) is not published on npm, so the CDN 404s. 0.10.35 is the newest 0.10.x.
const TASKS_VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const PYODIDE = 'https://cdn.jsdelivr.net/npm/pyodide@314.0.8/';

const COURSE_STORE = 'crochet-field-lab-progress-v1'; // shared with app.js (journal)
const WORKSHOP_STORE = 'crochetpy-workshop-v1';       // player name, hand, level
const HOLD_MS = 3000;          // pose must stay OK this long
const GRACE_MS = 600;          // short detection drop-outs (a lost frame) don't reset the hold
const TRACK_EVERY_MS = 100;    // ~10 checks per second
const CHAIN_TARGET = 11;

// MediaPipe labels handedness as if the image were a mirrored selfie.
// Our preview is NOT mirrored, so a label of "Left" usually means the person's right hand.
// Verify with a real camera on workshop laptops; flip this if the dominant hand is picked wrong.
const HANDEDNESS_IS_SELFIE = true;

const LEVELS = [
  { name: 'HALO TANGAN!', sub: 'Angkat tangan ke kamera', coach: false,
    help: 'Angkat kedua tangan ke depan kamera sampai muncul "TANGAN TERDETEKSI".' },
  { name: 'PEGANG HAKPEN', sub: 'Posisi siap bikin simpul', coach: false,
    help: 'Pegang hakpen di tangan utama, jepit di antara jempol dan telunjuk seperti memegang pensil.' },
  { name: 'SLIP KNOT', sub: 'Simpul awal', coach: true,
    help: 'Ikuti coach membuat simpul awal. Tahan posisi, lalu tunjukkan simpulnya ke coach.' },
  { name: 'CHAIN STITCH', sub: 'Gerakan rantai', coach: true,
    help: 'Kaitkan benang (yarn over), tarik melewati loop. Ulangi pelan-pelan.' },
  { name: '11 CHAINS', sub: 'Fondasi', coach: true, chains: true,
    help: 'Buat 11 chain. Tekan +1 tiap satu chain jadi. Coach mengecek di akhir.' },
  { name: 'SINGLE CROCHET', sub: 'Bonus stage', coach: true,
    help: 'Bonus! Tusuk ke chain kedua dari hakpen, yarn over, tarik, yarn over, tarik lewat dua loop.' },
];
// The camera-check level offers materials preparation, not a hand-detection demo.
const VIDEO_LESSONS = [0, 2, 1, 3, 4, 5];
let videoLevel = null;

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

// ---------- storage ----------
function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked: keep going */ } }

let player = readJSON(WORKSHOP_STORE, { name: '', hand: 'right', level: 0 });
const savePlayer = () => writeJSON(WORKSHOP_STORE, player);

function courseState() { return readJSON(COURSE_STORE, {}) || {}; }
function journal(title, detail = '') {
  const s = courseState();
  s.events = Array.isArray(s.events) ? s.events : [];
  s.events.unshift({ title, detail, at: new Date().toISOString() });
  s.events = s.events.slice(0, 180);
  s.lastSaved = new Date().toISOString();
  writeJSON(COURSE_STORE, s);
}
function getChains() { return Math.max(0, Number(courseState().chains) || 0); }
function setChains(n) {
  const s = courseState();
  s.chains = Math.max(0, n);
  s.lastSaved = new Date().toISOString();
  writeJSON(COURSE_STORE, s);
}

// ---------- rules engine (Python first, JS fallback) ----------
let pyodide = null;
let pyCheck = null;
let defaultRules = '';
let engine = 'loading';

async function loadRulesSource() {
  try { const r = await fetch('rules.py', { cache: 'no-cache' }); if (r.ok) return await r.text(); } catch { /* offline */ }
  return '';
}

const PARAM_START = '# === PARAMETER ===';
const PARAM_END = '# === END PARAMETER ===';
let defaultParams = '';

function extractParams(src) {
  const a = src.indexOf(PARAM_START), b = src.indexOf(PARAM_END);
  if (a < 0 || b < 0) return '';
  return src.slice(a + PARAM_START.length, b).trim() + '\n';
}

async function startPython() {
  defaultRules = await loadRulesSource();
  defaultParams = extractParams(defaultRules);
  $('rulesFull').textContent = defaultRules || '(rules.py tidak bisa dimuat)';
  const saved = readJSON(WORKSHOP_STORE + '-params', null);
  $('rulesEditor').value = typeof saved === 'string' && saved.trim() ? saved : defaultParams;
  try {
    const { loadPyodide } = await import(PYODIDE + 'pyodide.mjs');
    pyodide = await loadPyodide({ indexURL: PYODIDE });
    runRules($('rulesEditor').value, true);
  } catch (err) {
    engine = 'js';
    $('engineStatus').textContent = 'Python gagal dimuat, pakai aturan cadangan (JS). ' + (err?.message || '');
    $('runButton').disabled = true;
  }
}

// Runs the full rules.py, then the participant's parameter block on top of it.
// check_pose() reads the module globals at call time, so new numbers take effect immediately.
function runRules(params, silent = false) {
  if (!pyodide) return;
  try {
    const ns = pyodide.toPy({});
    pyodide.runPython(defaultRules, { globals: ns });
    pyodide.runPython(params, { globals: ns });
    const fn = ns.get('check_pose');
    if (!fn) throw new Error('Fungsi check_pose() tidak ditemukan.');
    if (pyCheck) pyCheck.destroy();
    pyCheck = fn;
    ns.destroy();
    engine = 'python';
    $('engineStatus').textContent = 'Aturan jalan di Python 🐍 (rules.py)';
    if (!silent) { $('rulesMessage').textContent = 'Angka baru dipakai! ✓'; writeJSON(WORKSHOP_STORE + '-params', params); }
  } catch (err) {
    const last = String(err?.message || err).trim().split('\n').filter(Boolean).pop();
    $('rulesMessage').textContent = 'Ups, ada error: ' + last + ' — angka lama tetap dipakai.';
  }
}

// Same logic as rules.py, used only if Python cannot load.
function jsCheck(level, hands) {
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  if (level === 0) return hands.length >= 2 ? [true, 'Dua tangan terdeteksi!', [0]] : [false, `Angkat kedua tangan ke kamera (${hands.length}/2)`, [0]];
  if (!hands.length) return [false, 'Tangan belum terlihat di kamera', []];
  const t = hands[0];
  const ratio = d(t[4], t[8]) / (d(t[0], t[9]) || 1e-6);
  return ratio > 0.45 ? [false, 'Dekatkan jempol ke telunjuk, jepit hakpennya', [4, 8]] : [true, 'Posisi sesuai panduan!', [4, 8]];
}

function checkPose(level, hands) {
  if (engine === 'python' && pyCheck) {
    let pyHands = null; let res = null;
    try {
      pyHands = pyodide.toPy(hands);
      res = pyCheck(level, pyHands);
      const [ok, msg, pts] = res.toJs();
      return [Boolean(ok), String(msg), Array.from(pts || [])];
    } catch (err) {
      const last = String(err?.message || err).trim().split('\n').filter(Boolean).pop();
      return [false, 'Error di rules.py: ' + last, []];
    } finally { pyHands?.destroy?.(); res?.destroy?.(); }
  }
  return jsCheck(level, hands);
}

// ---------- camera + hand tracking ----------
let landmarker = null;
let stream = null;
let rafId = 0;
let lastRun = 0;
let lastVideoTime = -1;
let holdStart = 0;
let holdDone = false;
let lastOkAt = 0;

// Load order: vendored copy in this repo first (no CDN needed), then jsDelivr.
const visionSources = () => [
  { bundle: new URL('vendor/mediapipe/vision_bundle.mjs', location.href).href, wasm: new URL('vendor/mediapipe/wasm', location.href).href },
  { bundle: TASKS_VISION + '/vision_bundle.mjs', wasm: TASKS_VISION + '/wasm' },
];
const MODEL_SOURCES = ['vendor/mediapipe/hand_landmarker.task', HAND_MODEL];
let visionFiles = null;
let visionModule = null;
let delegate = 'GPU';
let detectErrors = 0;

async function loadVision() {
  let lastErr;
  for (const src of visionSources()) {
    try {
      visionModule = await import(src.bundle);
      visionFiles = await visionModule.FilesetResolver.forVisionTasks(src.wasm);
      return;
    } catch (err) { lastErr = err; }
  }
  throw lastErr || new Error('Library MediaPipe tidak bisa dimuat');
}

async function modelPath() {
  for (const url of MODEL_SOURCES) {
    try { const r = await fetch(url, { method: 'HEAD' }); if (r.ok) return url; } catch { /* try next */ }
  }
  return HAND_MODEL;
}

// A GPU landmarker can be created and still fail on the first frame (blocked WebGL,
// hardware acceleration off, some integrated GPUs). Warm it up on a blank canvas first.
function warmUp(lm) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  c.getContext('2d').fillRect(0, 0, 64, 64);
  lm.detectForVideo(c, performance.now());
}

async function createLandmarker(useDelegate) {
  const lm = await visionModule.HandLandmarker.createFromOptions(visionFiles, {
    baseOptions: { modelAssetPath: await modelPath(), delegate: useDelegate },
    runningMode: 'VIDEO', numHands: 2,
    minHandDetectionConfidence: 0.4, minHandPresenceConfidence: 0.4, minTrackingConfidence: 0.4,
  });
  warmUp(lm);
  return lm;
}

async function loadLandmarker() {
  if (!visionModule) await loadVision();
  const forceCpu = new URLSearchParams(location.search).has('cpu');
  if (!forceCpu) {
    try { delegate = 'GPU'; const lm = await createLandmarker('GPU'); showDelegate(); return lm; } catch { /* fall back */ }
  }
  delegate = 'CPU';
  const lm = await createLandmarker('CPU');
  showDelegate();
  return lm;
}

async function switchToCpu() {
  if (delegate === 'CPU') return;
  try { landmarker?.close?.(); } catch { /* ignore */ }
  landmarker = null;
  delegate = 'CPU';
  landmarker = await createLandmarker('CPU');
  detectErrors = 0;
  showDelegate();
}

function showDelegate() {
  const py = engine === 'python' ? 'Aturan jalan di Python 🐍 (rules.py)' : $('engineStatus').textContent.split(' · ')[0];
  $('engineStatus').textContent = `${py} · Deteksi tangan: ${delegate}`;
}

async function startCamera() {
  $('cameraButton').disabled = true;
  $('statusText').textContent = 'Menyalakan kamera…';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } });
    const video = $('cameraVideo');
    video.srcObject = stream;
    await video.play();
    $('cameraPlaceholder').hidden = true;
    $('livePill').hidden = false;
    $('statusText').textContent = 'Memuat pendeteksi tangan…';
    landmarker = landmarker || await loadLandmarker();
    $('statusText').textContent = 'Siap! Ikuti petunjuk level.';
    loop();
  } catch (err) {
    $('cameraButton').disabled = false;
    $('statusText').textContent = err?.name === 'NotAllowedError'
      ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser, lalu coba lagi.'
      : 'Kamera/pendeteksi gagal: ' + (err?.message || 'error tidak dikenal') + '. Coba matikan adblock, atau buka link ini dengan ?cpu di akhir.';
  }
}

function orderHands(result) {
  const hands = (result.landmarks || []).map((h, i) => {
    let label = result.handedness?.[i]?.[0]?.categoryName || '';
    if (HANDEDNESS_IS_SELFIE) label = label === 'Left' ? 'Right' : label === 'Right' ? 'Left' : label;
    return { pts: h.map((p) => [p.x, p.y, p.z]), side: label.toLowerCase() };
  });
  hands.sort((a, b) => (b.side === player.hand) - (a.side === player.hand));
  return hands;
}

function loop() {
  rafId = requestAnimationFrame(loop);
  const now = performance.now();
  const video = $('cameraVideo');
  if (!landmarker || now - lastRun < TRACK_EVERY_MS || video.readyState < 2 || video.currentTime === lastVideoTime) return;
  lastRun = now; lastVideoTime = video.currentTime;
  let result;
  try { result = landmarker.detectForVideo(video, now); detectErrors = 0; }
  catch {
    detectErrors += 1;
    if (detectErrors >= 3 && delegate === 'GPU') { const lm = landmarker; landmarker = null; switchToCpu().catch(() => { landmarker = lm; }); }
    return;
  }
  const hands = orderHands(result);
  const [ok, msg, pts] = checkPose(player.level, hands.map((h) => h.pts));
  draw(hands, pts, ok);
  updateStatus(ok, msg, hands, pts, now);
}

function draw(hands, highlight, ok) {
  const canvas = $('handOverlay');
  const box = $('cameraBox').getBoundingClientRect();
  const video = $('cameraVideo');
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = box.width * dpr; canvas.height = box.height * dpr;
  const ctx = canvas.getContext('2d');
  if (!video.videoWidth) return;
  const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
  const w = video.videoWidth * scale, h = video.videoHeight * scale;
  const dx = (canvas.width - w) / 2, dy = (canvas.height - h) / 2;
  const P = (p) => [dx + p[0] * w, dy + p[1] * h];
  const LINKS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  hands.forEach((hand, hi) => {
    ctx.strokeStyle = '#FFD6E8'; ctx.lineWidth = 3 * dpr;
    for (const [a, b] of LINKS) { const p = P(hand.pts[a]), q = P(hand.pts[b]); ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke(); }
    hand.pts.forEach((pt, i) => {
      const hot = hi === 0 && highlight.includes(i);
      const s = (hot ? 12 : 8) * dpr; const [x, y] = P(pt);
      ctx.fillStyle = hot ? (ok ? '#7FE08F' : '#FFC23D') : '#FFFFFF';
      ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
    });
  });
}

function updateStatus(ok, msg, hands, pts, now) {
  const rule = $('activeRule');
  rule.replaceChildren(el('span', ok ? 'tag-ok' : 'tag-bad', ok ? '[OK] ' : '[!!] '), document.createTextNode(msg));
  const status = $('statusText');
  status.textContent = msg.toUpperCase();
  status.className = 'status ' + (ok ? 'ok' : 'bad');

  const toast = $('toast');
  if (player.level === 0 && hands.length) { toast.hidden = false; toast.textContent = `TANGAN TERDETEKSI! ${Math.min(2, hands.length)}/2 ${hands.length >= 2 ? '✓' : ''}`; }
  else toast.hidden = true;

  const metric = $('metricPill');
  if (hands.length && pts.length >= 2) {
    const t = hands[0].pts; const a = t[pts[0]], b = t[pts[1]];
    metric.hidden = false; metric.textContent = `TITIK ${pts[0]} ↔ ${pts[1]} = ${Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(2)}`;
  } else metric.hidden = true;

  if (holdDone) return;
  if (ok) { holdStart = holdStart || now; lastOkAt = now; }
  else if (now - lastOkAt > GRACE_MS) { holdStart = 0; }
  const progress = holdStart ? Math.min(1, (now - holdStart) / HOLD_MS) : 0;
  setHold(progress);
  if (progress >= 1) {
    holdDone = true;
    if (LEVELS[player.level].coach) {
      $('coachButton').disabled = false;
      $('coachHint').textContent = 'Mantap! Panggil coach untuk cek lalu tekan COACH OK.';
    } else levelUp();
  }
}

function setHold(progress) {
  const filled = Math.round(progress * 5);
  [...$('holdBar').children].forEach((c, i) => c.classList.toggle('on', i < filled));
  $('holdBar').setAttribute('aria-valuenow', String(filled));
}

// ---------- levels ----------
function renderLevels() {
  const list = $('levelList'); list.replaceChildren();
  LEVELS.forEach((lv, i) => {
    const state = i < player.level ? 'clear' : i === player.level ? 'now' : 'lock';
    const li = el('li', 'level ' + state);
    li.append(el('span', 'num', String(i)));
    const txt = el('span', 'txt');
    txt.append(el('span', null, lv.name), el('span', null, lv.sub), el('span', 'state' + (state === 'now' ? ' blink' : ''), { clear: 'CLEAR!', now: 'MAIN SEKARANG', lock: 'TERKUNCI' }[state]));
    li.append(txt);
    if (state === 'now') li.setAttribute('aria-current', 'step');
    list.append(li);
  });
  const lv = LEVELS[Math.min(player.level, LEVELS.length - 1)];
  $('hudLevel').textContent = String(player.level);
  $('levelHelp').textContent = player.level >= LEVELS.length ? 'Semua level CLEAR! Kamu keren 🎉' : lv.help;
  showGuide(Math.min(player.level, LEVELS.length - 1));
  $('chainCard').hidden = !lv.chains;
  $('coachButton').disabled = true;
  $('coachHint').textContent = lv.coach ? 'Tahan posisi 3 detik dulu, lalu panggil coach.' : 'Level ini naik otomatis setelah tahan 3 detik.';
  holdStart = 0; lastOkAt = 0; holdDone = player.level >= LEVELS.length; setHold(0);
  renderChains();
}


function showGuide(level) {
  $('workshopVideoUnavailable').hidden = level !== 0;
  $('workshopVideoControls').hidden = false;
  if (videoLevel === level) return;
  window.CourseVideo.openLesson(VIDEO_LESSONS[level]);
  videoLevel = level;
}

function renderChains() {
  const n = getChains();
  $('chainCount').textContent = String(n);
  $('hudChains').textContent = `${Math.min(n, 99)} / ${CHAIN_TARGET}`;
}

function levelUp() {
  window.CourseVideo.pause();
  const cleared = LEVELS[player.level];
  journal('Workshop: level CLEAR', `${player.name || 'Player'} · ${cleared.name}`);
  player.level += 1; savePlayer();
  $('levelUpCleared').textContent = `${cleared.name} CLEAR`;
  $('levelUpNext').textContent = player.level < LEVELS.length ? LEVELS[player.level].name : 'LAYAR SPESIAL!';
  $('levelUp').hidden = false;
  $('levelUpButton').focus();
}

// ---------- finish + photo booth ----------
function showFinish() {
  window.CourseVideo?.pause?.();
  cancelAnimationFrame(rafId);
  $('finishName').textContent = (player.name || 'PLAYER').toUpperCase();
  $('finishChains').textContent = String(getChains());
  for (const id of ['welcomeScreen', 'gameScreen', 'journalScreen', 'boothScreen']) $(id).hidden = true;
  $('finishScreen').hidden = false;
  window.scrollTo(0, 0);
  $('replayButton').focus();
}

function replay() {
  player.level = 0; savePlayer();
  journal('Workshop: main lagi dari awal', player.name || 'Player');
  $('finishScreen').hidden = true;
  showGame();
  if (stream && landmarker) { cancelAnimationFrame(rafId); loop(); }
}

const BOOTH_SIZE = 1080;
let boothRaf = 0;
let logoImg = null;
let photoBlob = null;
let boothFlipped = false;

// Photo filters. Canvas filters work in Chrome/Edge/Firefox; where unsupported the photo stays natural.
const FILTERS = {
  normal: { base: 'none', manual: null },
  cerah:  { base: 'brightness(1.1) contrast(1.06) saturate(1.15)', manual: { b: 1.1, c: 1.06, s: 1.15 } },
  glow:   { base: 'brightness(1.12) contrast(0.96) saturate(1.1)', glow: 0.35, manual: { b: 1.16, c: 0.92, s: 1.1 } },
  pink:   { base: 'brightness(1.08) saturate(1.2)', tint: 'rgba(255,120,180,0.16)', glow: 0.2, manual: { b: 1.1, s: 1.2, tint: [255, 120, 180, 0.1] } },
  retro:  { base: 'sepia(0.35) contrast(1.1) saturate(1.3) brightness(1.03)', tint: 'rgba(255,190,120,0.10)', manual: { p: 0.35, c: 1.1, s: 1.3, b: 1.03, tint: [255, 190, 120, 0.06] } },
};

// Older Safari ignores ctx.filter. Detect it once and fall back to per-pixel math.
let canvasFilterOk = null;
function supportsCanvasFilter() {
  if (canvasFilterOk === null) {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 1;
      const x = c.getContext('2d');
      x.filter = 'brightness(0)'; x.fillStyle = '#fff'; x.fillRect(0, 0, 1, 1);
      canvasFilterOk = 'filter' in x && x.getImageData(0, 0, 1, 1).data[0] < 10;
    } catch { canvasFilterOk = false; }
  }
  return canvasFilterOk;
}

function applyManualFilter(ctx, S, m) {
  const img = ctx.getImageData(0, 0, S, S); const d = img.data;
  const b = m.b ?? 1, c = m.c ?? 1, s = m.s ?? 1, p = m.p ?? 0;
  const [tr, tg, tb, ta] = m.tint || [0, 0, 0, 0];
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * b, g = d[i + 1] * b, bl = d[i + 2] * b;
    r = (r - 128) * c + 128; g = (g - 128) * c + 128; bl = (bl - 128) * c + 128;
    const gray = 0.299 * r + 0.587 * g + 0.114 * bl;
    r = gray + (r - gray) * s; g = gray + (g - gray) * s; bl = gray + (bl - gray) * s;
    if (p) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * bl, sg = 0.349 * r + 0.686 * g + 0.168 * bl, sb = 0.272 * r + 0.534 * g + 0.131 * bl;
      r += (sr - r) * p; g += (sg - g) * p; bl += (sb - bl) * p;
    }
    if (ta) { r += (tr - r) * ta; g += (tg - g) * ta; bl += (tb - bl) * ta; }
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
  }
  ctx.putImageData(img, 0, 0);
}
const currentFilter = () => FILTERS[document.querySelector('input[name=filter]:checked')?.value] || FILTERS.cerah;

function loadLogo() {
  if (logoImg) return Promise.resolve(logoImg);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { logoImg = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = 'assets/pyladies-yogyakarta.png';
  });
}

async function openBooth() {
  $('finishScreen').hidden = true; $('boothScreen').hidden = false;
  $('boothPhoto').hidden = true; $('boothCanvas').hidden = false;
  $('boothAfter').hidden = true; $('boothBefore').hidden = false;
  boothFlipped = $('cameraBox').classList.contains('flipped');
  $('boothFlip').setAttribute('aria-pressed', String(boothFlipped));
  $('boothStatus').textContent = 'Menyalakan kamera…';
  await Promise.all([loadLogo(), document.fonts?.load?.('24px "Press Start 2P"').catch(() => {})]);
  try {
    if (!stream) stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } });
    const v = $('boothVideo'); v.srcObject = stream; await v.play();
    $('boothStatus').textContent = 'Siap! Pose dulu, lalu tekan AMBIL FOTO.';
    drawBoothLoop();
  } catch {
    $('boothStatus').textContent = 'Kamera tidak bisa dinyalakan. Izinkan kamera di browser, lalu coba lagi.';
  }
}

function drawBoothLoop() {
  cancelAnimationFrame(boothRaf);
  const tick = () => { drawBooth($('boothCanvas')); boothRaf = requestAnimationFrame(tick); };
  tick();
}

function drawBooth(canvas) {
  const S = BOOTH_SIZE; canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  const v = $('boothVideo');
  ctx.fillStyle = '#3B2433'; ctx.fillRect(0, 0, S, S);
  if (v.videoWidth) {
    const scale = Math.max(S / v.videoWidth, S / v.videoHeight);
    const w = v.videoWidth * scale, h = v.videoHeight * scale;
    ctx.save();
    if (boothFlipped) { ctx.translate(S, 0); ctx.scale(-1, 1); }
    const f = currentFilter();
    const dx = (S - w) / 2, dy = (S - h) / 2;
    if (!supportsCanvasFilter()) {
      ctx.drawImage(v, dx, dy, w, h);
      ctx.restore();
      if (f.manual) applyManualFilter(ctx, S, f.manual);
      drawFrame(ctx, S);
      return;
    }
    ctx.filter = f.base;
    ctx.drawImage(v, dx, dy, w, h);
    if (f.glow) {                       // soft skin glow: blurred copy screened on top
      ctx.globalAlpha = f.glow; ctx.globalCompositeOperation = 'screen';
      ctx.filter = `${f.base === 'none' ? '' : f.base} blur(10px)`.trim();
      ctx.drawImage(v, dx, dy, w, h);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.filter = 'none';
    if (f.tint) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = f.tint; ctx.fillRect(0, 0, S, S); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }
  drawFrame(ctx, S);
}

// Pixel "twibbon": pink border, brick floor, PyLadies logo, crochet.py, 10 tahun PyJo.
function drawFrame(ctx, S) {
  const B = 36, INK = '#2A0A1E', PINK = '#E0307A', SKY = '#FFD6E8', GOLD = '#FFC23D', WHITE = '#FFFFFF';
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PINK;
  ctx.fillRect(0, 0, S, B); ctx.fillRect(0, 0, B, S); ctx.fillRect(S - B, 0, B, S);
  ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.strokeRect(B, B, S - 2 * B, S - 2 * B);
  for (let x = 0; x < S; x += 24) { ctx.fillStyle = (x / 24) % 2 ? SKY : PINK; ctx.fillRect(x, 0, 24, 12); }

  // brick floor
  const FH = 170, fy = S - FH;
  ctx.fillStyle = '#D93A78'; ctx.fillRect(0, fy, S, FH);
  ctx.fillStyle = '#7A1640';
  for (let y = fy; y < S; y += 34) {
    ctx.fillRect(0, y, S, 4);
    const off = ((y - fy) / 34) % 2 ? 34 : 0;
    for (let x = -off; x < S; x += 68) ctx.fillRect(x, y, 4, 34);
  }
  ctx.fillStyle = INK; ctx.fillRect(0, fy, S, 8);

  ctx.textBaseline = 'middle';
  const font = (px) => `${px}px "Press Start 2P", monospace`;

  // title plate on the floor
  ctx.font = font(52);
  const title = 'crochet.py';
  const tw = ctx.measureText(title).width;
  const px = 60, py = fy + 34, ph = 100;
  ctx.fillStyle = INK; ctx.fillRect(px + 10, py + 10, tw + 60, ph);
  ctx.fillStyle = SKY; ctx.fillRect(px, py, tw + 60, ph);
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(px, py, tw + 60, ph);
  ctx.fillStyle = INK; ctx.fillText('crochet', px + 30, py + ph / 2 + 4);
  ctx.fillStyle = PINK; ctx.fillText('.py', px + 30 + ctx.measureText('crochet').width, py + ph / 2 + 4);

  // name + clear count on the right of the floor
  ctx.font = font(22); ctx.textAlign = 'right';
  ctx.fillStyle = WHITE; ctx.fillText((player.name || 'PLAYER').toUpperCase(), S - 60, fy + 60);
  ctx.fillStyle = GOLD; ctx.fillText(`★ ${LEVELS.length}/${LEVELS.length} CLEAR`, S - 60, fy + 110);
  ctx.textAlign = 'left';

  // PyLadies logo badge (top-left)
  const L = 170, lx = B + 24, ly = B + 24;
  ctx.fillStyle = INK; ctx.fillRect(lx + 8, ly + 8, L, L);
  ctx.fillStyle = WHITE; ctx.fillRect(lx, ly, L, L);
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(lx, ly, L, L);
  if (logoImg) {
    ctx.imageSmoothingEnabled = true;
    const r = Math.min((L - 24) / logoImg.width, (L - 24) / logoImg.height);
    const w = logoImg.width * r, h = logoImg.height * r;
    ctx.drawImage(logoImg, lx + (L - w) / 2, ly + (L - h) / 2, w, h);
    ctx.imageSmoothingEnabled = false;
  }

  // "10 TAHUN PYJO" ribbon (top-right)
  ctx.font = font(26);
  const rib = '10 TAHUN PYJO';
  const rw = ctx.measureText(rib).width + 48, rh = 70, rx = S - B - 24 - rw, ry = B + 24;
  ctx.fillStyle = INK; ctx.fillRect(rx + 8, ry + 8, rw, rh);
  ctx.fillStyle = GOLD; ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(rx, ry, rw, rh);
  ctx.fillStyle = INK; ctx.fillText(rib, rx + 24, ry + rh / 2 + 3);
  ctx.font = font(16); ctx.fillStyle = WHITE; ctx.textAlign = 'right';
  ctx.fillText('PYTHON JOGJA', S - B - 24, ry + rh + 34);
  ctx.textAlign = 'left';
}

function takePhoto() {
  let n = 3;
  $('shootButton').disabled = true;
  const count = $('boothCount');
  count.hidden = false; count.textContent = String(n);
  $('boothStatus').textContent = 'Siap-siap…';
  const t = setInterval(() => {
    n -= 1;
    if (n > 0) { count.textContent = String(n); return; }
    clearInterval(t);
    count.hidden = true;
    cancelAnimationFrame(boothRaf);
    const canvas = $('boothCanvas');
    drawBooth(canvas);
    // black screen + white flash
    const flash = $('boothFlash');
    flash.hidden = true; void flash.offsetWidth; flash.hidden = false;
    setTimeout(() => { flash.hidden = true; }, 750);
    canvas.toBlob((blob) => {
      photoBlob = blob;
      const img = $('boothPhoto');
      if (img.src) URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(blob);
      img.hidden = false; canvas.hidden = true;
      $('boothBefore').hidden = true; $('boothAfter').hidden = false;
      $('shootButton').disabled = false;
      $('boothStatus').textContent = 'Cekrek! Fotomu siap dibagikan.';
    }, 'image/png');
  }, 1000);
}

function downloadPhoto() {
  if (!photoBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(photoBlob);
  a.download = `crochetpy-${(player.name || 'player').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function retakePhoto() {
  $('boothPhoto').hidden = true; $('boothCanvas').hidden = false;
  $('boothAfter').hidden = true; $('boothBefore').hidden = false;
  $('boothStatus').textContent = 'Siap! Pose dulu, lalu tekan AMBIL FOTO.';
  drawBoothLoop();
}

function closeBooth() {
  cancelAnimationFrame(boothRaf);
  $('boothScreen').hidden = true;
  showFinish();
}

// ---------- journal ----------
function showJournal() {
  window.CourseVideo.pause();
  const s = courseState();
  $('journalPlayer').textContent = player.name || 'PLAYER';
  $('statLevels').textContent = `${Math.min(player.level, LEVELS.length)} / ${LEVELS.length}`;
  $('statChains').textContent = String(getChains());
  $('statNow').textContent = player.level < LEVELS.length ? LEVELS[player.level].name : 'SEMUA CLEAR!';
  const log = $('journalLog'); log.replaceChildren();
  const events = (Array.isArray(s.events) ? s.events : []).slice(0, 40);
  if (!events.length) log.append(el('li', 'empty', 'Belum ada catatan. Ayo main!'));
  for (const ev of events) {
    const li = el('li');
    const when = ev.at ? new Date(ev.at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    li.append(el('span', null, [ev.title, ev.detail].filter(Boolean).join(' · ')), Object.assign(el('time', null, when), { dateTime: ev.at || '' }));
    log.append(li);
  }
  $('gameScreen').hidden = true; $('welcomeScreen').hidden = true; $('journalScreen').hidden = false;
  window.scrollTo(0, 0);
}

function hideJournal() {
  $('journalScreen').hidden = true;
  if (player.level >= LEVELS.length) showFinish(); else showGame();
}

// ---------- wiring ----------
function showGame() {
  $('welcomeScreen').hidden = true; $('gameScreen').hidden = false;
  $('hudPlayer').textContent = player.name || 'PLAYER';
  renderLevels();
}

function init() {
  window.CourseVideo.init();
  for (let i = 0; i < 5; i++) $('holdBar').append(document.createElement('i'));
  $('playerName').value = player.name || '';
  document.querySelector(`input[name=hand][value=${player.hand === 'left' ? 'left' : 'right'}]`).checked = true;

  $('startForm').addEventListener('submit', (e) => {
    e.preventDefault();
    player.name = $('playerName').value.trim().slice(0, 12);
    player.hand = document.querySelector('input[name=hand]:checked').value;
    savePlayer();
    showGame();
  });
  $('cameraButton').addEventListener('click', startCamera);
  $('journalButton').addEventListener('click', showJournal);
  $('journalBack').addEventListener('click', hideJournal);
  $('journalReset').addEventListener('click', () => {
    if (!confirm('Hapus progres level workshop? Hitungan chain di journal tetap ada.')) return;
    player.level = 0; savePlayer(); journal('Workshop: progres di-reset'); showJournal();
  });
  $('flipButton').addEventListener('click', () => {
    const on = $('cameraBox').classList.toggle('flipped');
    $('flipButton').setAttribute('aria-pressed', String(on));
  });
  $('runButton').addEventListener('click', () => runRules($('rulesEditor').value));
  $('resetRulesButton').addEventListener('click', () => {
    $('rulesEditor').value = defaultParams;
    try { localStorage.removeItem(WORKSHOP_STORE + '-params'); } catch { /* ignore */ }
    runRules(defaultParams, true);
    $('rulesMessage').textContent = 'Angka dikembalikan ke bawaan.';
  });
  $('rulesEditor').addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); const t = e.target; const s = t.selectionStart; t.setRangeText('    ', s, t.selectionEnd, 'end'); }
  });
  $('coachButton').addEventListener('click', () => { if (holdDone) levelUp(); });
  $('chainPlus').addEventListener('click', () => { setChains(getChains() + 1); renderChains(); });
  $('chainMinus').addEventListener('click', () => { setChains(getChains() - 1); renderChains(); });
  $('levelUpButton').addEventListener('click', () => {
    $('levelUp').hidden = true;
    if (player.level >= LEVELS.length) showFinish(); else renderLevels();
  });
  $('replayButton').addEventListener('click', replay);
  $('boothOpenButton').addEventListener('click', openBooth);
  $('shootButton').addEventListener('click', takePhoto);
  $('downloadButton').addEventListener('click', downloadPhoto);
  $('retakeButton').addEventListener('click', retakePhoto);
  $('boothFlip').addEventListener('click', () => {
    boothFlipped = !boothFlipped;
    $('boothFlip').setAttribute('aria-pressed', String(boothFlipped));
  });
  $('boothBack').addEventListener('click', closeBooth);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(rafId); else if (stream && landmarker) { cancelAnimationFrame(rafId); loop(); } });

  if (player.name) { if (player.level >= LEVELS.length) showFinish(); else showGame(); }
  startPython();
}

init();
