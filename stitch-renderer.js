// Depth-aware instructional renderer for the guided stitch motion model.
// Draws a pastel stage, already-counted chain Vs, the sampled 3D pose, the hook,
// and the perpetually illustrative badge. Pure drawing: it reads only its options
// and never touches lesson state, counters, journals, or storage.
(() => {
'use strict';

const MAX_VISIBLE_VS = 11;
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
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
  const D = window.StitchDraw;
  const cam = D.camera(o);
  const counted = Math.max(0, Math.floor(finite(o.completedCount, 0)));
  D.drawStage(ctx, cam.width, cam.height);
  const drawnCount = o.illustrativeFoundation ? 7 : counted;
  D.drawCompletedChains(ctx, drawnCount, cam);
  D.drawHook(ctx, pose.hook, cam, mirror);
  for (const id of pose.order) D.drawStrand(ctx, pose.paths[id], id, cam);
  D.drawBadge(ctx, cam.width, cam.height);
  if (counted > MAX_VISIBLE_VS) drawOverflowLabel(ctx, cam, counted);
  return { phaseIndex: sampled.phaseIndex, visibleCompletedVs: Math.min(counted, MAX_VISIBLE_VS) };
}

if (!window.StitchMotion) throw new Error('StitchRenderer: load stitch-motion.js first');
window.StitchRenderer = { render };
})();
