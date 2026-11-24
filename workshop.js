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

async function loadLandmarker() {
  const mod = await import(TASKS_VISION + '/vision_bundle.mjs');
  const files = await mod.FilesetResolver.forVisionTasks(TASKS_VISION + '/wasm');
  const opts = { baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 };
  try { return await mod.HandLandmarker.createFromOptions(files, opts); }
  catch { opts.baseOptions.delegate = 'CPU'; return await mod.HandLandmarker.createFromOptions(files, opts); }
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
      : 'Kamera/pendeteksi gagal: ' + (err?.message || 'error tidak dikenal');
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
  try { result = landmarker.detectForVideo(video, now); } catch { return; }
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
  $('levelUpNext').textContent = player.level < LEVELS.length ? LEVELS[player.level].name : 'SEMUA LEVEL SELESAI!';
  $('levelUp').hidden = false;
  $('levelUpButton').focus();
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
  showGame();
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
  $('levelUpButton').addEventListener('click', () => { $('levelUp').hidden = true; renderLevels(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(rafId); else if (stream && landmarker) { cancelAnimationFrame(rafId); loop(); } });

  if (player.name) showGame();
  startPython();
}

init();
