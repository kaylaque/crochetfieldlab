const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('stitch-scene.js', 'utf8'), context);
const scene = context.window.StitchScene;
assert.deepEqual(Array.from(scene.SINGLE_CROCHET.checkpoints, c => c.loopsOnHook), [1, 1, 1, 2, 2, 1]);
assert.equal(scene.sceneAt(scene.SINGLE_CROCHET, 500).checkpointId, 'ready');
assert.equal(scene.sceneAt(scene.SINGLE_CROCHET, 6000).settled, true);
assert.notEqual(scene.poseAtCheckpoint(scene.SINGLE_CROCHET, 'ready').regions.firstLoop.points, scene.SINGLE_CROCHET.checkpoints[0].regions.firstLoop.points);
assert.deepEqual(Array.from(scene.SINGLE_CROCHET.checkpoints, c => c.id), ['ready', 'insert', 'catch-yarn', 'pull-up', 'catch-again', 'pull-through-both']);
assert.equal(scene.sceneAt(scene.SINGLE_CROCHET, 1000).checkpointId, 'insert');
assert.equal(scene.sceneAt(scene.SINGLE_CROCHET, 5500).checkpointId, 'pull-through-both');
assert.equal(scene.sceneAt(scene.SINGLE_CROCHET, 0).settled, true);
assert.throws(() => scene.sceneAt(scene.SINGLE_CROCHET, Infinity), /finite/);
const brokenTopology = JSON.parse(JSON.stringify(scene.SINGLE_CROCHET));
const fabricYs=scene.SINGLE_CROCHET.checkpoints[0].regions.fabricExit.points.map(p=>p[1]);
assert.ok(Math.max(...fabricYs)-Math.min(...fabricYs)<=.12,'fabric exit should follow the foundation edge without an abrupt zigzag');
brokenTopology.checkpoints[0].regions.firstLoop.points.pop();
assert.throws(() => scene.sceneAt(brokenTopology, 0), /malformed/);
const endpoint = scene.SINGLE_CROCHET.checkpoints[0].regions.hookContact.points.at(-1);
const expectedThroat = [-.38 + .7*(.9*Math.cos(-.12)-.23*Math.sin(-.12)), .12 + .7*(.9*Math.sin(-.12)+.23*Math.cos(-.12)), -.88+.9*.7];
assert.deepEqual(Array.from(endpoint), expectedThroat);
const checkpoints = scene.SINGLE_CROCHET.checkpoints;
const tip = c => c.regions.hookContact.points.at(-1);
assert.ok(Math.hypot(...tip(checkpoints[0]).map((v, i) => v - tip(checkpoints[1])[i])) > .25,
  'insertion must move the hook throat into the target opening');
assert.ok(checkpoints[1].hook.position[2] > checkpoints[0].hook.position[2] + .1,
  'insertion must pass through the chain in depth, not merely slide sideways');
assert.ok(checkpoints[3].regions.newLoop.active && !checkpoints[2].regions.newLoop.active);
assert.ok(Math.hypot(...checkpoints[3].regions.newLoop.points[5].map((v, i) => v - checkpoints[3].regions.firstLoop.points[5][i])) > .12,
  'the two seated loops must be distinguishable');
for (const c of checkpoints) {
  assert.deepEqual(Array.from(c.regions.firstLoop.points[0]), Array.from(c.regions.fabricExit.points.at(-1)),
    `${c.id}: the old loop must remain attached to the fabric`);
  assert.deepEqual(Array.from(c.regions.firstLoop.points.at(-1)), Array.from(c.regions.hookContact.points[0]),
    `${c.id}: loop must reach the hook contact`);
}
const beforePullUp = scene.sceneAt(scene.SINGLE_CROCHET, 2990);
assert.equal(beforePullUp.regions.newLoop.active, true, 'the pulled loop emerges during the movement');
assert.ok(Math.hypot(...beforePullUp.regions.newLoop.points[5].map((v,i)=>v-beforePullUp.regions.newLoop.points[0][i])) > .01,
  'the new loop is visible before the pull-up transition finishes');
const beforeRelease = scene.sceneAt(scene.SINGLE_CROCHET, 4990);
assert.equal(beforeRelease.regions.newLoop.active, true, 'both loops release during the final draw-through');
for (const c of checkpoints.filter(c=>c.regions.newLoop.active)) {
  assert.deepEqual(Array.from(c.regions.newLoop.points[0]),Array.from(c.regions.firstLoop.points.at(-1)));
  assert.deepEqual(Array.from(c.regions.newLoop.points.at(-1)),Array.from(c.regions.firstLoop.points.at(-1)));
}
const insertionThroat=tip(checkpoints[1]);
assert.ok(insertionThroat[2] >= .18 && insertionThroat[2] <= .26,
  'at insertion the hook throat must sit between the two top-chain strands in depth');
assert.ok(Math.abs(insertionThroat[0]-.88) < .04,
  'the hook throat must enter the highlighted second V');
assert.ok(Math.abs(checkpoints[3].regions.newLoop.points[5][0]-checkpoints[3].regions.firstLoop.points[5][0]) > .28,
  'both loops need distinct front-view centers at normal zoom');
assert.ok(checkpoints[0].regions.fabricExit.points.at(-1)[0]-checkpoints[0].regions.fabricExit.points[0][0] <= .5,
  'fabric exit belongs to the target chain, not a line through the entire foundation row');
