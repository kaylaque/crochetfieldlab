// Depth-aware instructional renderer for the guided stitch motion model.
// Draws a pastel stage, already-counted chain Vs, the sampled 3D pose, the hook,
// and the perpetually illustrative badge. Pure drawing: it reads only its options
// and never touches lesson state, counters, journals, or storage.
(() => {
'use strict';

const COLORS = { ink: '#3b3355', yarn: '#ec9cad', yarnLight: '#ffc8d0', yarnShade: '#b987a6', metal: '#c9ddf5', metalHighlight: '#f1f7ff' };
const SAMPLES_PER_SEGMENT = 12;
const MAX_VISIBLE_VS = 11;
const MODEL_UNIT = .18;      // same model-to-canvas scale as app.js
const CAMERA_DISTANCE = 8;

// Catmull-Rom through four control scalars; duplicated endpoints at path boundaries.
const catmull = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const curve = (steps, fn) => Array.from({ length: steps + 1 }, (_, i) => fn(i / steps));

// `width` and `height` are the canvas drawing-buffer size in pixels; `dpr` describes
// that buffer's pixel ratio so minimum stroke widths stay visible on dense displays.
function camera(o) {
  return {
    yaw: finite(o.yaw, -.23),
    pitch: finite(o.pitch, .13),
    zoom: clamp(finite(o.zoom, 1), .25, 3),
    width: Math.max(1, finite(o.width, 620)),
    height: Math.max(1, finite(o.height, 385)),
    // Buffer pixel ratio, used only to keep hairline strokes legible on retina canvases.
    px: Math.max(1, finite(o.dpr, 1))
  };
}

function project([x, y, z], cam) {
  const ax = x * Math.cos(cam.yaw) - z * Math.sin(cam.yaw);
  const az = x * Math.sin(cam.yaw) + z * Math.cos(cam.yaw);
  const by = y * Math.cos(cam.pitch) - az * Math.sin(cam.pitch);
  const bz = y * Math.sin(cam.pitch) + az * Math.cos(cam.pitch);
  const f = CAMERA_DISTANCE / (CAMERA_DISTANCE + bz * .18);
  return [cam.width / 2 + ax * cam.height * MODEL_UNIT * cam.zoom * f, cam.height * .51 - by * cam.height * MODEL_UNIT * cam.zoom * f];
}

// A degenerate path (a single point, or every point identical) draws nothing. Inactive
// loop paths collapse like this instead of inventing geometry the motion did not ask for.
function spline(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const [first] = points;
  if (points.every(p => p[0] === first[0] && p[1] === first[1] && p[2] === first[2])) return null;
  const samples = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || points[i + 1];
    for (let s = i ? 1 : 0; s <= SAMPLES_PER_SEGMENT; s++) {
      const t = s / SAMPLES_PER_SEGMENT;
      samples.push([0, 1, 2].map(k => catmull(p0[k], p1[k], p2[k], p3[k], t)));
    }
  }
  return samples;
}

function strokePath(ctx, points, color, width, alpha = 1) {
  if (!points || points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

function drawStage(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#e6ecfb');
  bg.addColorStop(1, '#f6e8f1');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(95,90,140,.12)';
  for (let x = 24; x < w; x += 32) for (let y = 24; y < h; y += 32) {
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  const shadow = ctx.createRadialGradient(w / 2, h * .78, 10, w / 2, h * .78, h * .42);
  shadow.addColorStop(0, 'rgba(70,60,120,.14)');
  shadow.addColorStop(1, 'rgba(70,60,120,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * .78, h * .38, h * .17, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Counted stitches are connected zigzag legs: each V's outer tips meet its neighbours'
// tips, so 0–11 counted chains read as one fabric instead of separated loops.
function drawCompletedChains(ctx, counted, cam) {
  if (!counted) return;
  const visible = Math.min(counted, MAX_VISIBLE_VS);
  // Fixed stitch pitch keeps one V the same size as eleven; only the row's extent changes.
  const stepX = .44, halfX = .22, baseY = -.28, startX = -(visible - 1) * stepX / 2;
  const width = 15 * cam.height / 420 * cam.zoom;
  const inkWidth = width + Math.max(2.4 * cam.px, width * .24);
  for (let i = 0; i < visible; i++) {
    const x = startX + i * stepX, z = .1 + (i % 2) * .12;
    const points = [[x - halfX, baseY + .14, z + .04], [x, baseY - .12, z], [x + halfX, baseY + .14, z + .04]].map(p => project(p, cam));
    strokePath(ctx, points, COLORS.ink, inkWidth);
    strokePath(ctx, points, i % 2 ? COLORS.yarnLight : COLORS.yarn, width);
    strokePath(ctx, points, 'rgba(255,255,255,.55)', Math.max(1.2 * cam.px, width * .15));
  }
}

// One yarn strand in four passes: ink outline, cooler underside, warm blush body,
// restrained highlight. The underside is offset down the model's y axis, which reads
// as roundness under this projection without a second topology.
function drawStrand(ctx, points, id, cam) {
  const samples = spline(points);
  if (!samples) return;
  const width = 16 * cam.height / 420 * cam.zoom;
  const active = id === 'active';
  // Project the centerline once and the shifted underside copy separately: both are
  // 3D model points, so neither may reach the 2D path builder unprojected.
  const center = samples.map(p => project(p, cam));
  const underside = samples.map(([x, y, z]) => project([x, y - .045, z], cam));
  strokePath(ctx, center, COLORS.ink, width + Math.max(2.4 * cam.px, width * .24));
  strokePath(ctx, underside, COLORS.yarnShade, width * .92, .85);
  strokePath(ctx, center, active ? COLORS.yarnLight : COLORS.yarn, width);
  strokePath(ctx, center, active ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.6)', Math.max(1.4 * cam.px, width * .16));
}

// Hook metal stays blue; yarn never borrows that hue.
// The local hook shape is asymmetric (handle at negative local x, curl at positive x),
// so mirror mode must reflect local x before rotating: rotating the unreflected shape
// would keep the handle and curl on their original sides and only flip the throat.
function drawHook(ctx, hook, cam, mirror) {
  const scale = clamp(finite(hook.scale, .7), .2, 2);
  const angle = finite(hook.angle, -.2);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (lx, ly) => {
    const mx = mirror ? -lx : lx;
    return [hook.x + mx * cos - ly * sin, hook.y + mx * sin + ly * cos, .4];
  };
  const shaft = spline(curve(30, t => at((-1.7 + 2.6 * t) * scale, (.12 + t * .12) * scale)));
  const tip = spline(curve(24, t => at((.9 + .11 * Math.sin(Math.PI * t) + .20 * t) * scale, (.23 + .25 * Math.sin(Math.PI * t) - .19 * t) * scale)));
  if (!shaft || !tip) return;
  const unit = cam.height / 420 * cam.zoom;
  const shaftWidth = 24 * scale * unit, tipWidth = 13 * scale * unit;
  for (const [path, width] of [[shaft, shaftWidth], [tip, tipWidth]]) {
    strokePath(ctx, path.map(p => project(p, cam)), COLORS.ink, width + Math.max(2.4 * cam.px, width * .24));
    strokePath(ctx, path.map(p => project(p, cam)), COLORS.metal, width);
    strokePath(ctx, path.map(p => project(p, cam)), COLORS.metalHighlight, Math.max(1.4 * cam.px, width * .28), .9);
  }
}

function drawBadge(ctx, w, h) {
  const cx = w * .75, cy = h * .78;
  ctx.save();
  ctx.fillStyle = 'rgba(255,251,254,.86)';
  ctx.strokeStyle = 'rgba(59,51,85,.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(cx - 52, cy - 13, 104, 26, 13);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5d537a';
  ctx.textAlign = 'center';
  ctx.font = `${Math.max(9, w * .013)}px ui-monospace,monospace`;
  ctx.fillText('ILLUSTRATIVE 3D', cx, cy + 4);
  ctx.restore();
}

// Manual counting is a learning choice, not a limit: all counted Vs stay real in the
// counter, while the drawing honestly shows the last 11 and says so in words.
function drawOverflowLabel(ctx, cam, counted) {
  ctx.save();
  ctx.fillStyle = 'rgba(87,74,124,.82)';
  ctx.textAlign = 'left';
  ctx.font = `${Math.max(11, cam.width * .014)}px ui-monospace,monospace`;
  ctx.fillText(`Last 11 of ${counted} counted`, 16, 92);
  ctx.restore();
}

function render(ctx, o) {
  if (!ctx || !o || !o.motion) return { phaseIndex: 0, visibleCompletedVs: 0 };
  const sampled = window.StitchMotion.sampleMotion(o.motion, o.playheadMs);
  const mirror = !!o.mirror;
  const pose = mirror ? window.StitchMotion.mirrorPose(sampled.pose) : sampled.pose;
  const cam = camera(o);
  const counted = Math.max(0, Math.floor(finite(o.completedCount, 0)));
  drawStage(ctx, cam.width, cam.height);
  drawCompletedChains(ctx, counted, cam);
  for (const id of pose.order) drawStrand(ctx, pose.paths[id], id, cam);
  drawHook(ctx, pose.hook, cam, mirror);
  drawBadge(ctx, cam.width, cam.height);
  if (counted > MAX_VISIBLE_VS) drawOverflowLabel(ctx, cam, counted);
  return { phaseIndex: sampled.phaseIndex, visibleCompletedVs: Math.min(counted, MAX_VISIBLE_VS) };
}

if (!window.StitchMotion) throw new Error('StitchRenderer: load stitch-motion.js first');
window.StitchRenderer = { render };
})();
