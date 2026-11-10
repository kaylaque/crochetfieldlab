const assert=require('assert'),fs=require('fs'),vm=require('vm');
const sandbox={window:{}};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('stitch-motion.js','utf8'),sandbox);
const {KNOT_MOTION,CHAIN_MOTION,sampleMotion,mirrorPose,phaseAt}=sandbox.window.StitchMotion;
assert.deepEqual(KNOT_MOTION.phases.map(p=>p.name),['Lay yarn','Cross to form a loop','Pull a bight through','Place loop on hook','Tighten the sliding knot']);
assert.deepEqual(CHAIN_MOTION.phases.map(p=>p.name),['One loop on hook','Yarn over','Pull through','New chain V']);
for(const motion of [KNOT_MOTION,CHAIN_MOTION]){
  assert.equal(motion.durationMs,6000);
  for(let i=1;i<motion.phases.length;i++)assert.deepEqual(motion.phases[i-1].to,motion.phases[i].from);
  for(let t=0;t<=6000;t+=250){
    const {pose}=sampleMotion(motion,t);
    for(const points of Object.values(pose.paths))for(const point of points){
      assert.equal(point.length,3);assert.ok(point.every(Number.isFinite));
    }
  }
  for(const phase of motion.phases){
    const a=sampleMotion(motion,phaseStart(motion,phase));
    const b=sampleMotion(motion,phaseStart(motion,phase)+phase.durationMs-1);
    assert.equal(a.phaseIndex,b.phaseIndex);
  }
  for(const phase of motion.phases){
    const mid=sampleMotion(motion,phaseStart(motion,phase)+phase.durationMs/2).pose;
    assert.notDeepEqual(mid,phase.from,`${phase.name} must animate away from its from pose`);
    assert.ok(maxDelta(mid,phase.to)<maxDelta(mid,phase.from),`${phase.name} must progress toward its to pose`);
    assert.ok(maxDelta(mid,phase.from)>0.05,`${phase.name} must move visibly by mid-phase`);
  }
  const lastPhase=motion.phases.at(-1);
  const lastEnd=sampleMotion(motion,phaseStart(motion,lastPhase)+lastPhase.durationMs-1).pose;
  assert.notDeepEqual(lastEnd,lastPhase.from,`${lastPhase.name} must not hold a frozen pose`);
  assert.ok(maxDelta(lastEnd,lastPhase.from)>0.05,`${lastPhase.name} must move visibly`);
}
function phaseStart(motion,phase){return motion.phases.indexOf(phase)*phase.durationMs;}
function maxDelta(a,b){
  let max=0;
  for(const name of Object.keys(a.paths))for(let i=0;i<a.paths[name].length;i++)
    for(let j=0;j<3;j++)max=Math.max(max,Math.abs(a.paths[name][i][j]-b.paths[name][i][j]));
  for(const key of Object.keys(a.hook))max=Math.max(max,Math.abs(a.hook[key]-b.hook[key]));
  return max;
}
const p=KNOT_MOTION.phases[0].from,m=mirrorPose(p);
for(const name of Object.keys(p.paths))for(let i=0;i<p.paths[name].length;i++){
  assert.equal(m.paths[name][i][0],-p.paths[name][i][0]);
  assert.equal(m.paths[name][i][1],p.paths[name][i][1]);
  assert.equal(m.paths[name][i][2],p.paths[name][i][2]);
}
assert.equal(m.hook.angle,-p.hook.angle);
sampleMotion(KNOT_MOTION,500);
const directSeek=sampleMotion(KNOT_MOTION,3000).pose;
sampleMotion(KNOT_MOTION,4500);
assert.deepEqual(sampleMotion(KNOT_MOTION,3000).pose,directSeek);
for(const phase of KNOT_MOTION.phases.slice(2)){
  assert.deepEqual(phase.from.paths.working.at(-1),phase.from.paths.active[0]);
  assert.deepEqual(phase.to.paths.working.at(-1),phase.to.paths.active[0]);
}
assert.equal(phaseAt(KNOT_MOTION,6000),4);
assert.equal(phaseAt(CHAIN_MOTION,6000),3);
console.log('PASS: motion phases, continuity, interpolation, boundaries, mirroring.');
