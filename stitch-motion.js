// Declarative stitch motion model: keyframed poses plus pure sampling.
// Consumed by app.js as window.StitchMotion; no rendering or timing state lives here.
(() => {
const P = (...points) => points;
const pose = (tail, working, active, hook, order = ['tail', 'working', 'active']) => ({ paths: { tail, working, active }, hook, order });
const H = (x, y, angle = -.2, scale = .7) => ({ x, y, angle, scale });

// Knot keyframes: yarn laid out wide -> apart -> crossed loop -> bight through -> bight on hook -> sliding knot tight.
// Each labeled phase animates one keyframe into the next, so the last phase really tightens the knot.
const knotPoses = [
  pose(P([-2.7, -.75, 0], [-1.45, -.4, 0]), P([2.5, -.75, 0], [1.75, -.55, 0], [1.05, -.3, 0]), P([1.05, -.3, 0], [1.05, -.3, 0], [1.05, -.3, 0]), H(1.35, .2, -.14)),
  pose(P([-2, -.5, 0], [-.8, -.2, 0]), P([1.8, -.5, 0], [1.2, -.35, 0], [.8, -.2, 0]), P([.8, -.2, 0], [.8, -.2, 0], [.8, -.2, 0]), H(1.2, .15, -.2)),
  pose(P([-2, -.5, 0], [-.55, -.1, -.25]), P([1.8, -.5, 0], [.55, .55, .25], [-.55, -.1, .25]), P([-.55, -.1, .25], [-.55, -.1, .25], [-.55, -.1, .25]), H(1.2, .15, -.2)),
  pose(P([-2, -.5, 0], [-.55, -.1, -.25]), P([1.8, -.5, 0], [.55, .55, .25], [-.55, -.1, .25]), P([-.55, -.1, .25], [-.15, .65, .3], [.25, -.1, .3]), H(1.2, .15, -.2)),
  pose(P([-2, -.5, 0], [-.3, -.15, -.15]), P([1.8, -.5, 0], [.6, .45, .2], [-.3, -.15, .2]), P([-.3, -.15, .2], [.15, .55, .35], [.55, -.05, .35]), H(.65, .05, -.35)),
  pose(P([-2, -.5, 0], [-.18, -.12, -.1]), P([1.8, -.5, 0], [.65, .35, .2], [-.18, -.12, .2]), P([-.18, -.12, .2], [.2, .45, .35], [.55, -.02, .35]), H(.72, .02, -.35))
];
// Chain keyframes: slack loop settles onto hook -> yarn over -> pull through -> new chain V.
// Four labeled phases, so the final "New chain V" phase actively draws the new loop through.
const chainPoses = [
  pose(P(), P([-2.5, -.8, 0], [-1.65, -.5, 0], [-.85, -.25, 0]), P([-.45, .1, .1], [.1, .62, .1], [.55, .1, .1]), H(.9, .15, -.16)),
  pose(P(), P([-1.8, -.55, 0], [-1.1, -.35, 0], [-.45, -.2, 0]), P([-.25, .05, .15], [.05, .5, .15], [.35, .05, .15]), H(.8, .1, -.25)),
  pose(P(), P([-1.8, -.55, 0], [-.1, .55, -.2], [.5, .35, .3]), P([-.25, .05, .15], [.05, .5, .15], [.35, .05, .15]), H(.72, .05, -.55)),
  pose(P(), P([-1.8, -.55, 0], [.15, .2, .25], [.55, -.15, .3]), P([-.35, .05, .1], [.05, .35, .1], [.45, .05, .1]), H(.55, -.15, -.35)),
  pose(P(), P([-1.8, -.55, 0], [.15, .2, .2], [.55, -.15, .25]), P([-.3, .05, .1], [.05, .4, .15], [.4, .05, .15]), H(.65, -.05, -.3))
];

const PHASE_NAMES = {
  knot: ['Lay yarn', 'Cross to form a loop', 'Pull a bight through', 'Place loop on hook', 'Tighten the sliding knot'],
  chain: ['One loop on hook', 'Yarn over', 'Pull through', 'New chain V']
};

// Keyframes outnumber phases by one: phase i animates poses[i] into poses[i + 1].
const makeMotion = (name, poses) => {
  const names = PHASE_NAMES[name];
  if (!names) throw new Error(`StitchMotion: unknown motion "${name}"`);
  if (poses.length !== names.length + 1) throw new Error(`StitchMotion: ${name} needs ${names.length + 1} keyframes for ${names.length} phases`);
  const durationMs = 6000 / names.length;
  return {
    name,
    durationMs: 6000,
    phases: names.map((phaseName, i) => ({
      name: phaseName,
      durationMs,
      from: poses[i],
      to: poses[i + 1]
    }))
  };
};

// Development guard: the sampler assumes equal point counts and uniform phase
// durations, so reject any motion that would silently produce broken poses.
function validateMotion(motion) {
  const fail = message => { throw new Error(`StitchMotion: ${message}`); };
  if (!motion || typeof motion !== 'object') fail('motion must be an object');
  const label = motion.name || 'motion';
  if (!(motion.durationMs > 0)) fail(`${label}: durationMs must be a positive number`);
  if (!Array.isArray(motion.phases) || !motion.phases.length) fail(`${label}: phases must be a non-empty array`);

  const keyList = object => Object.keys(object).sort().join(',');
  const checkPose = (value, where) => {
    if (!value || typeof value !== 'object') fail(`${where} must be a pose object`);
    if (!value.paths || keyList(value.paths) !== 'active,tail,working') fail(`${where} must have exactly tail/working/active paths`);
    if (Object.keys(value.paths).length !== 3) fail(`${where} must have exactly tail/working/active paths`);
    for (const [pathName, points] of Object.entries(value.paths)) {
      if (!Array.isArray(points)) fail(`${where}.${pathName} must be an array`);
      for (const point of points) {
        if (!Array.isArray(point) || point.length !== 3) fail(`${where}.${pathName} has a malformed point`);
        if (!point.every(Number.isFinite)) fail(`${where}.${pathName} has a non-finite coordinate`);
      }
    }
    if (!value.hook || keyList(value.hook) !== 'angle,scale,x,y') fail(`${where}.hook must have exactly x/y/angle/scale`);
    if (!Object.values(value.hook).every(Number.isFinite)) fail(`${where}.hook has a non-finite value`);
    if (!Array.isArray(value.order) || value.order.length !== 3) fail(`${where}.order must list three paths`);
    if (value.order.slice().sort().join(',') !== 'active,tail,working') fail(`${where}.order must list tail/working/active`);
  };

  motion.phases.forEach((phase, i) => {
    const where = `${label}.phases[${i}]`;
    if (typeof phase.name !== 'string' || !phase.name) fail(`${where} needs a name`);
    if (!(phase.durationMs > 0)) fail(`${where}: durationMs must be a positive number`);
    if (Math.abs(phase.durationMs - motion.durationMs / motion.phases.length) > 1e-9) fail(`${where} must last durationMs/phases.length`);
    checkPose(phase.from, `${where}.from`);
    checkPose(phase.to, `${where}.to`);
    for (const pathName of Object.keys(phase.from.paths)) {
      const from = phase.from.paths[pathName], to = phase.to.paths[pathName];
      if (from.length !== to.length) fail(`${where}.${pathName} has unequal from/to point counts`);
    }
    const next = motion.phases[i + 1];
    if (next) {
      for (const pathName of Object.keys(phase.from.paths)) {
        if (phase.to.paths[pathName].length !== next.from.paths[pathName].length) fail(`${where}.to does not connect to the next phase for ${pathName}`);
      }
    }
  });
}

const KNOT_MOTION = makeMotion('knot', knotPoses), CHAIN_MOTION = makeMotion('chain', chainPoses);
validateMotion(KNOT_MOTION);
validateMotion(CHAIN_MOTION);

const lerp = (a, b, t) => a + (b - a) * t;
// Ease across the first 82% of a phase, then hold, so each operation settles before the next.
const smooth = t => { const u = Math.max(0, Math.min(1, t / .82)); return u * u * (3 - 2 * u); };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
// Non-finite playheads read as the start; oversized playheads clamp to the end.
const safePlayhead = ms => { const value = Number(ms); return Number.isNaN(value) ? 0 : value; };

function interpolate(a, b, t) {
  return {
    paths: Object.fromEntries(Object.keys(a.paths).map(k => [k, a.paths[k].map((p, i) => p.map((v, j) => lerp(v, b.paths[k][i][j], t)))])),
    hook: Object.fromEntries(Object.keys(a.hook).map(k => [k, lerp(a.hook[k], b.hook[k], t)])),
    order: [...a.order]
  };
}

function phaseAt(motion, ms) {
  const phaseMs = motion.durationMs / motion.phases.length;
  return clamp(Math.floor(Math.max(0, safePlayhead(ms)) / phaseMs), 0, motion.phases.length - 1);
}

function sampleMotion(motion, ms) {
  const phaseIndex = phaseAt(motion, ms), phase = motion.phases[phaseIndex];
  const start = phaseIndex * phase.durationMs;
  const t = smooth((clamp(safePlayhead(ms), 0, motion.durationMs) - start) / phase.durationMs);
  return { phaseIndex, pose: interpolate(phase.from, phase.to, t) };
}

function mirrorPose(p) {
  return {
    paths: Object.fromEntries(Object.entries(p.paths).map(([k, points]) => [k, points.map(([x, y, z]) => [-x, y, z])])),
    hook: { ...p.hook, x: -p.hook.x, angle: -p.hook.angle },
    order: [...p.order]
  };
}

window.StitchMotion = { KNOT_MOTION, CHAIN_MOTION, sampleMotion, mirrorPose, phaseAt };
})();
