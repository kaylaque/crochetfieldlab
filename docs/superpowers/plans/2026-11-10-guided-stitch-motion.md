# Guided Stitch Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace decorative knot/chain frame changes with continuous, inspectable, handedness-aware yarn and hook motion that a beginner can imitate.

**Architecture:** Load two dependency-free browser scripts before `app.js`: `stitch-motion.js` owns validated keyframes and interpolation, and `stitch-renderer.js` owns projection and Canvas drawing. `app.js` retains lesson state and controls, calls the renderer only for `knot`, `motion`, and `chain`, and keeps all existing static scenes and persistence behavior.

**Tech Stack:** Browser ES2020 JavaScript, Canvas 2D, Node.js built-in `assert`/`vm` tests, existing static build.

**Spec:** `docs/superpowers/specs/2026-11-10-guided-stitch-motion-design.md`

## Global Constraints

- Scope is lessons 2, 4, and 5; the other five lessons remain static explanatory illustrations.
- No WebGL, Three.js, hatching, hand animation, camera tracking, or new dependencies.
- Playback and scrubbing never call `count()` or mutate progress, counters, journal entries, or `localStorage`.
- Phase labels remain exactly: knot = `Lay yarn`, `Cross to form a loop`, `Pull a bight through`, `Place loop on hook`, `Tighten the sliding knot`; chain = `One loop on hook`, `Yarn over`, `Pull through`, `New chain V`.
- The knot bight remains connected to the working strand; chain completion leaves exactly one loop on the hook.
- Right-handed choreography is mirrored for left-handed mode; no second choreography or stored handedness.
- Chain counts are manual: 0–11 Vs exactly, and above 11 the last 11 plus `Last 11 of N counted`.
- Reduced motion starts paused; scrub and phase stepping remain available.
- The pastel stage, ink outlines, and `ILLUSTRATIVE 3D` badge remain.

## Review Focus

- Exact phase-boundary seeks must not select the wrong segment or lose strand continuity; Task 1 pins interpolation at 0, every boundary, and total duration.
- Mirroring must reverse every strand x-coordinate and hook yaw, not merely translate the picture; Task 1 pins pose mirroring and Task 4 checks it visually.
- Counts above 11 must not silently clamp the label or accumulate animated Vs; Task 2 pins completed-chain layout and Task 3 preserves counter behavior.
- Different speeds and scrub positions must produce the same pose for the same playhead; Task 1 pins speed-independent sampling and Task 3 retains playback tests.
- Static lessons must not gain playback controls or animated drawing work; Task 3 pins animated-scene selection and Task 4 checks static lessons.

---

### Task 1: Validated Motion Model and Interpolation

**Files:**
- Create: `stitch-motion.js`
- Create: `tests/test-motion.cjs`

**Interfaces:**
- Produces browser global `window.StitchMotion` with:
  - `KNOT_MOTION`, `CHAIN_MOTION`: `{name, phases:[{name,durationMs,from,to}],durationMs}`.
  - `sampleMotion(motion, playheadMs)`: `{phaseIndex,pose}` with finite, structurally matching poses.
  - `mirrorPose(pose)`: a new pose with all path x-coordinates negated and `hook.angle` negated.
  - `phaseAt(motion, playheadMs)`: zero-based clamped phase index.
- Pose shape: `{paths:{tail:number[][],working:number[][],active:number[][]},hook:{x,y,angle,scale},order:string[]}`. A path may be an empty array only where the operation has no such strand; matching `from`/`to` paths always have equal point counts.

- [ ] **Step 1: Write failing model tests**

Create `tests/test-motion.cjs` using Node `assert`, `fs`, and `vm`. Load `stitch-motion.js` into `{window:{}}` and assert the public behavior:

```js
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
}
function phaseStart(motion,phase){return motion.phases.indexOf(phase)*phase.durationMs;}
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
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node tests/test-motion.cjs`
Expected: FAIL because `stitch-motion.js` does not exist.

- [ ] **Step 3: Implement the motion model**

Create `stitch-motion.js` as an IIFE assigning `window.StitchMotion`. Use this exact pose representation and interpolation contract:

```js
(()=>{
const P=(...points)=>points;
const pose=(tail,working,active,hook,order=['tail','working','active'])=>({paths:{tail,working,active},hook,order});
const H=(x,y,angle=-.2,scale=.7)=>({x,y,angle,scale});
const knotPoses=[
  pose(P([-2,-.5,0],[-.8,-.2,0]),P([1.8,-.5,0],[1.2,-.35,0],[.8,-.2,0]),P([.8,-.2,0],[.8,-.2,0],[.8,-.2,0]),H(1.2,.15,-.2)),
  pose(P([-2,-.5,0],[-.55,-.1,-.25]),P([1.8,-.5,0],[.55,.55,.25],[-.55,-.1,.25]),P([-.55,-.1,.25],[-.55,-.1,.25],[-.55,-.1,.25]),H(1.2,.15,-.2)),
  pose(P([-2,-.5,0],[-.55,-.1,-.25]),P([1.8,-.5,0],[.55,.55,.25],[-.55,-.1,.25]),P([-.55,-.1,.25],[-.15,.65,.3],[.25,-.1,.3]),H(1.2,.15,-.2)),
  pose(P([-2,-.5,0],[-.3,-.15,-.15]),P([1.8,-.5,0],[.6,.45,.2],[-.3,-.15,.2]),P([-.3,-.15,.2],[.15,.55,.35],[.55,-.05,.35]),H(.65,.05,-.35)),
  pose(P([-2,-.5,0],[-.18,-.12,-.1]),P([1.8,-.5,0],[.65,.35,.2],[-.18,-.12,.2]),P([-.18,-.12,.2],[.2,.45,.35],[.55,-.02,.35]),H(.72,.02,-.35))
];
const chainPoses=[
  pose(P(),P([-1.8,-.55,0],[-1.1,-.35,0],[-.45,-.2,0]),P([-.25,.05,.15],[.05,.5,.15],[.35,.05,.15]),H(.8,.1,-.25)),
  pose(P(),P([-1.8,-.55,0],[-.1,.55,-.2],[.5,.35,.3]),P([-.25,.05,.15],[.05,.5,.15],[.35,.05,.15]),H(.72,.05,-.55)),
  pose(P(),P([-1.8,-.55,0],[.15,.2,.25],[.55,-.15,.3]),P([-.35,.05,.1],[.05,.35,.1],[.45,.05,.1]),H(.55,-.15,-.35)),
  pose(P(),P([-1.8,-.55,0],[.15,.2,.2],[.55,-.15,.25]),P([-.3,.05,.1],[.05,.4,.15],[.4,.05,.15]),H(.65,-.05,-.3))
];
const makeMotion=(name,poses)=>{const durationMs=6000/poses.length;return {name,durationMs:6000,phases:poses.map((from,i)=>({name:name==='knot'?['Lay yarn','Cross to form a loop','Pull a bight through','Place loop on hook','Tighten the sliding knot'][i]:['One loop on hook','Yarn over','Pull through','New chain V'][i],durationMs,from,to:poses[Math.min(i+1,poses.length-1)]}));};
const KNOT_MOTION=makeMotion('knot',knotPoses),CHAIN_MOTION=makeMotion('chain',chainPoses);
const lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>{const u=Math.max(0,Math.min(1,t/.82));return u*u*(3-2*u);};
function interpolate(a,b,t){return {paths:Object.fromEntries(Object.keys(a.paths).map(k=>[k,a.paths[k].map((p,i)=>p.map((v,j)=>lerp(v,b.paths[k][i][j],t)))])),hook:Object.fromEntries(Object.keys(a.hook).map(k=>[k,lerp(a.hook[k],b.hook[k],t)])),order:[...a.order]};}
function phaseAt(motion,ms){return Math.max(0,Math.min(motion.phases.length-1,Math.floor(Math.max(0,ms)/(motion.durationMs/motion.phases.length))));}
function sampleMotion(motion,ms){const phaseIndex=phaseAt(motion,ms),phase=motion.phases[phaseIndex],start=phaseIndex*phase.durationMs,t=smooth((Math.max(0,Math.min(motion.durationMs,ms))-start)/phase.durationMs);return {phaseIndex,pose:interpolate(phase.from,phase.to,t)};}
function mirrorPose(p){return {paths:Object.fromEntries(Object.entries(p.paths).map(([k,points])=>[k,points.map(([x,y,z])=>[-x,y,z])])),hook:{...p.hook,x:-p.hook.x,angle:-p.hook.angle},order:[...p.order]};}
window.StitchMotion={KNOT_MOTION,CHAIN_MOTION,sampleMotion,mirrorPose,phaseAt};
})();
```

Add a `validateMotion(motion)` development helper inside the IIFE and call it for both definitions before export. It must throw on unequal point counts, malformed points, non-finite values, unequal `from`/`to` hook keys, or non-positive durations. Do not add fallback geometry.

- [ ] **Step 4: Run model tests**

Run: `node tests/test-motion.cjs`
Expected: `PASS: motion phases, continuity, interpolation, boundaries, mirroring.`

- [ ] **Step 5: Commit**

```bash
git add stitch-motion.js tests/test-motion.cjs
git commit -m "feat: add declarative stitch motion model"
```

### Task 2: Depth-Aware Instructional Canvas Renderer

**Files:**
- Create: `stitch-renderer.js`
- Create: `tests/test-renderer.cjs`

**Interfaces:**
- Consumes `window.StitchMotion.sampleMotion()` and `mirrorPose()` from Task 1.
- Produces browser global `window.StitchRenderer` with `render(ctx,options)`.
- `options`: `{motion,playheadMs,yaw,pitch,zoom,mirror,completedCount,width,height,dpr}`.
- `render()` returns `{phaseIndex,visibleCompletedVs}` for behavioral assertions; it performs no storage or application-state access.

- [ ] **Step 1: Write failing renderer tests**

Create `tests/test-renderer.cjs`. Use a recording 2D context that records `stroke`, `fillText`, `translate`, and style assignments. Load both browser scripts into one VM sandbox and assert:

```js
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const calls=[];
const gradient={addColorStop(){}};
const ctx=new Proxy({createLinearGradient(){return gradient},createRadialGradient(){return gradient},beginPath(){calls.push('begin')},moveTo(){calls.push('move')},lineTo(){calls.push('line')},stroke(){calls.push('stroke')},fillText(t){calls.push(['text',t])},save(){},restore(){},translate(){},clearRect(){},fillRect(){},arc(){},fill(){},ellipse(){},roundRect(){}},{set(o,k,v){o[k]=v;return true}});
const sandbox={window:{}};vm.createContext(sandbox);
for(const f of ['stitch-motion.js','stitch-renderer.js'])vm.runInContext(fs.readFileSync(f,'utf8'),sandbox);
const base={motion:sandbox.window.StitchMotion.CHAIN_MOTION,playheadMs:6000,yaw:-.23,pitch:.13,zoom:1,mirror:false,width:620,height:385,dpr:1};
let result=sandbox.window.StitchRenderer.render(ctx,{...base,completedCount:0});
assert.equal(result.visibleCompletedVs,0);
result=sandbox.window.StitchRenderer.render(ctx,{...base,completedCount:11});
assert.equal(result.visibleCompletedVs,11);
result=sandbox.window.StitchRenderer.render(ctx,{...base,completedCount:17});
assert.equal(result.visibleCompletedVs,11);
assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==='text'&&c[1]==='Last 11 of 17 counted'));
calls.length=0;
sandbox.window.StitchRenderer.render(ctx,{...base,completedCount:0});
const strokeCount=calls.filter(c=>c==='stroke').length;
calls.length=0;
sandbox.window.StitchRenderer.render(ctx,{...base,mirror:true,completedCount:0});
assert.equal(calls.filter(c=>c==='stroke').length,strokeCount);
console.log('PASS: completed Vs, overflow label, mirrored rendering.');
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node tests/test-renderer.cjs`
Expected: FAIL because `stitch-renderer.js` does not exist.

- [ ] **Step 3: Implement renderer**

Create `stitch-renderer.js` as an IIFE. Implement:

```js
function render(ctx,o){
  const sampled=window.StitchMotion.sampleMotion(o.motion,o.playheadMs);
  const pose=o.mirror?window.StitchMotion.mirrorPose(sampled.pose):sampled.pose;
  drawStage(ctx,o.width,o.height);
  drawCompletedChains(ctx,o);
  for(const id of pose.order)drawStrand(ctx,pose.paths[id],id,o);
  drawHook(ctx,pose.hook,o);
  drawBadge(ctx,o.width,o.height);
  if(o.completedCount>11)ctx.fillText(`Last 11 of ${o.completedCount} counted`,16,92);
  return {phaseIndex:sampled.phaseIndex,visibleCompletedVs:Math.min(o.completedCount,11)};
}
```

`drawStrand` samples a smooth Catmull-Rom spline through each path's 3D points, projects each sample with the supplied yaw/pitch/zoom, and paints three strokes in this order: a cooler/darker underside offset by 0.045 in model y, the warm blush main strand, then a restrained highlight. The existing ink outline remains beneath the fill. Hook metal stays blue; active yarn is never blue.

For each coordinate and each segment, use this interpolation with endpoint duplication at the path boundaries and 12 samples per segment:

```js
const catmull=(p0,p1,p2,p3,t)=>0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);
```

A degenerate path whose points are all identical draws nothing; this keeps inactive loop paths invisible without introducing topology mismatches.

Use palette constants:

```js
const COLORS={ink:'#3b3355',yarn:'#ec9cad',yarnLight:'#ffc8d0',yarnShade:'#b987a6',metal:'#c9ddf5',metalHighlight:'#f1f7ff'};
```

Completed Vs use two connected legs, not ellipses. For `completedCount=0`, draw none; for 1–11 draw that count; above 11 draw 11. The animated `active` path is never included in `visibleCompletedVs`. Draw existing completed Vs before the active motion and retain the existing badge and count label position.

- [ ] **Step 4: Run renderer and model tests**

Run: `node tests/test-renderer.cjs && node tests/test-motion.cjs`
Expected: both PASS messages.

- [ ] **Step 5: Commit**

```bash
git add stitch-renderer.js tests/test-renderer.cjs
git commit -m "feat: render connected guided stitch motion"
```

### Task 3: Application Integration and Handedness Controls

**Files:**
- Modify: `index.html:71-91,139-141`
- Modify: `app.js:43-190`
- Modify: `styles.css:8-18`
- Modify: `tests/test-smoke.cjs`
- Modify: `scripts/build-static.mjs`

**Interfaces:**
- Consumes `window.StitchMotion.KNOT_MOTION`, `CHAIN_MOTION`, and `window.StitchRenderer.render()` from Tasks 1–2.
- Adds `viewerHandedness` select with values `right` and `left`.
- Keeps existing playback DOM ids and behavior unchanged.

- [ ] **Step 1: Add failing integration assertions**

In `tests/test-smoke.cjs`, load `stitch-motion.js` and `stitch-renderer.js` before `app.js` in both VM harnesses. Add:

```js
const handEnv=makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(1)',handEnv.sandbox);
assert.equal(handEnv.el('viewerHandedness').hidden,false);
assert.equal(handEnv.el('viewerHandedness').value,'right');
handEnv.el('viewerHandedness').value='left';
handEnv.callUI('viewerHandedness','input');
assert.equal(handEnv.el('viewerHandedness').value,'left');
vm.runInContext('changeStep(4)',handEnv.sandbox);
assert.equal(handEnv.el('viewerHandedness').value,'left');
assert.equal(handEnv.storedChains(),0);
assert.deepEqual(handEnv.storedEvents(),[]);
vm.runInContext('changeStep(2)',handEnv.sandbox);
assert.equal(handEnv.el('viewerPlaybackControls').hidden,true);
```

Add a smoke check that switching between right and left does not change `viewerPhaseText`, stored chains, or events.

- [ ] **Step 2: Run smoke tests and watch them fail**

Run: `npm test`
Expected: FAIL because `viewerHandedness` is missing.

- [ ] **Step 3: Integrate motion and renderer**

In `index.html`, add the handedness select beside Speed and Viewing angle:

```html
<select id="viewerHandedness" aria-label="Practice handedness">
  <option value="right" selected>Right-handed</option>
  <option value="left">Left-handed · mirrored</option>
</select>
```

Load scripts before `app.js`:

```html
<script src="stitch-motion.js?v=1"></script>
<script src="stitch-renderer.js?v=1"></script>
<script type="module" src="app.js?v=3"></script>
```

Add both files to `entries` in `scripts/build-static.mjs`.

In `app.js`, add `let handedness='right'`. For animated scenes, replace `drawKnotProcess()` and `drawChainProcess()` calls with one `renderAnimatedScene()` that calls:

```js
window.StitchRenderer.render(g,{
  motion:activeScene==='knot'?window.StitchMotion.KNOT_MOTION:window.StitchMotion.CHAIN_MOTION,
  playheadMs:processProgress,yaw,pitch,zoom,mirror:handedness==='left',
  completedCount:activeScene==='chain'?state.chains:0,
  width:canvas.width,height:canvas.height,dpr:Math.min(2,devicePixelRatio||1)
});
```

Delete the obsolete knot/chain drawing helpers and their unused V helper. Keep the static renderer for other scenes. `syncPlaybackUI()` continues to use the exact existing labels and `currentPhaseIndex()` semantics.

Add:

```js
on('viewerHandedness','input',()=>{
  handedness=$('viewerHandedness').value==='left'?'left':'right';
  drawDiagram();
});
```

Do not reset handedness in `updateScene()` or the viewer Reset handler. Add compact wrapping CSS so three selects fit at 320 px without covering the canvas.

- [ ] **Step 4: Run all automated tests and build**

Run: `npm test && node tests/test-motion.cjs && node tests/test-renderer.cjs && npm run build`
Expected: all tests pass; build lists `stitch-motion.js` and `stitch-renderer.js` in `dist/`.

- [ ] **Step 5: Commit**

```bash
git add app.js index.html styles.css scripts/build-static.mjs tests/test-smoke.cjs
git commit -m "feat: integrate guided motion and handedness controls"
```

### Task 4: Visual Proof and Design Documentation

**Files:**
- Modify: `DESIGN_SYSTEM.md`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`

**Interfaces:**
- Consumes the integrated viewer from Task 3.
- Produces documentation matching observed behavior; no unverified physical-simulation claims.

- [ ] **Step 1: Serve and inspect the built app**

Run `python3 -m http.server 8001 --bind 127.0.0.1 --directory dist`. In Chromium, inspect:

- Lesson 2 at all five phases, including mid-phase and settle poses.
- Lesson 4 and 5 at all four phases, with chain counts 0, 11, and 12.
- Right-handed and left-handed mirrored views.
- Front/top/side/free angles, drag/pinch/wheel, keyboard controls, speed, scrub, phase steps, replay, reset, and lesson switching.
- Desktop, 390 px, and 320 px viewports; reduced-motion paused start and no console errors.

Confirm connected strands, visible hook travel, back-to-front crossings, one final hook loop, connected V stitches, and no control overlap. Verify journal/count storage is unchanged by playback, scrub, or handedness changes.

- [ ] **Step 2: Correct any visual or behavioral defect using TDD**

For each reproducible defect, add a focused failing assertion to `tests/test-motion.cjs`, `tests/test-renderer.cjs`, or `tests/test-smoke.cjs`; run it red, apply the smallest fix, then rerun all tests and the affected browser scene. Do not add hatching, a second renderer, or new dependencies.

- [ ] **Step 3: Update documentation from observed behavior**

In `DESIGN_SYSTEM.md`, cite the verified Gooch and shell-outline references, document warm/cool yarn shading and consistent ink contours, and add continuous-strand, crossing-depth, settle-pose, and mirror-mode rules.

In `README.md`, describe guided moving yarn/hook playback and the handedness control for lessons 2, 4, and 5; other lessons remain static.

In `docs/ARCHITECTURE.md`, document the two new files, their browser-global interfaces, and the one-way data flow into Canvas.

In `docs/ROADMAP.md`, mark only the shipped knot/chain guided-motion work complete. Do not claim all eight lessons have phase models or that the visuals are physically accurate.

- [ ] **Step 4: Final verification and cleanup**

Run `npm test && node tests/test-motion.cjs && node tests/test-renderer.cjs && npm run build`. Close verification tabs and stop the preview server. Remove throwaway screenshots or scripts from the repository if any were created.

- [ ] **Step 5: Commit**

```bash
git add DESIGN_SYSTEM.md README.md docs/ARCHITECTURE.md docs/ROADMAP.md
git commit -m "docs: describe guided stitch motion design"
```
