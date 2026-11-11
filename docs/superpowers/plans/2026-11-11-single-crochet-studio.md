# Single-Crochet Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated authoring studio for six single-crochet checkpoints, with deterministic scene evaluation, front/side geometry editing, validation, draft recovery, and JSON import/export.

**Architecture:** Add a renderer-independent `stitch-scene.js` model and a Canvas `stitch-canvas.js` adapter. Add a pure `studio-editor.js` state layer and a separate `studio.html` UI. The learner viewer and its existing uncommitted changes remain untouched during this milestone.

**Tech Stack:** Vanilla browser JavaScript, Canvas 2D, HTML/CSS, Node `vm`/`assert` tests, existing static build.

**Spec:** `docs/superpowers/specs/2026-11-11-single-crochet-studio-design.md`

## Global Constraints

- Preserve all existing uncommitted changes. Never `git add -A`, `git add .`, or bulk-stage the worktree.
- No Three.js, WebGL, new dependencies, hands, camera recognition, auto-counting, physics, or fabric simulation.
- Studio is a separate page; learner navigation, counters, progress, journal, and camera remain unchanged.
- Studio storage uses only `crochet-lab-studio-draft-v1`; it must never read/write `crochet-field-lab-progress-v1`.
- Six checkpoints, exact IDs and loop counts:
  `ready` 1, `insert` 1, `catch-yarn` 1, `pull-up` 2, `catch-again` 2, `pull-through-both` 1.
- Every checkpoint has the same seven region IDs: `fabricExit`, `firstLoop`, `chainOpeningFront`, `chainOpeningBack`, `hookContact`, `newLoop`, `workingYarn`.
- Fixed region point counts: `fabricExit` 4, `firstLoop` 12, `chainOpeningFront` 4, `chainOpeningBack` 4, `hookContact` 5, `newLoop` 12, `workingYarn` 6.
- Target is the second foundation chain from the hook, under both top loops, yarn over back to front. Right-handed data only; mirroring is a view operation.
- `sceneAt()` is pure and deterministic. No event-history-dependent state.
- Validation statuses are exactly `PASS`, `WARN`, `FAIL`, `UNVERIFIED`; automated checks never claim crochet correctness.
- Default studio layouts: front and side canvases side by side on desktop, stacked at 680 px and below; no control covers a canvas.
- Build entries must add the new browser assets while preserving existing script order.

## Review Focus

- A stale authoring draft or invalid import must never erase the current in-memory stitch; Task 3 pins rejection and draft preservation.
- Dragging in one view must not alter the hidden-axis coordinate; Task 3 pins front X/Y versus side Z/Y edits.
- A collapsed region such as `newLoop` must retain point identity/count rather than changing shape between checkpoints; Task 1 pins all fixed counts.
- Keyboard focus and pointer hit-testing must not select invisible/degenerate points; Task 4 pins hit-test filtering and keyboard selection.
- The studio must not touch learner progress, counters, or journal; Task 3 pins storage namespace isolation and Task 5 verifies browser storage.

---

### Task 1: Renderer-Independent Scene Model and Validation

**Files:**
- Create: `stitch-scene.js`
- Create: `tests/test-scene.cjs`

**Interfaces:**
- Produces `window.StitchScene` with:
  - `SINGLE_CROCHET`: definition.
  - `sceneAt(definition, timeMs)` → `{checkpointId, checkpointIndex, progress, settled, yarnRegions, hook, highlights, loopCount, instruction}`.
  - `poseAtCheckpoint(definition, id)` → checkpoint object.
  - `mirrorScene(frame)` → x-reflected deep copy.
  - `validateDefinition(definition)` → `[{code,status,message,checkpoint?}]`.
  - `validateTransition(definition, fromId, toId)` → validation array.
- Definition schema version: `1`.

- [ ] **Step 1: Write failing scene-model tests**

Create `tests/test-scene.cjs`:

```js
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const sandbox={window:{}};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('stitch-scene.js','utf8'),sandbox);
const S=sandbox.window.StitchScene,D=S.SINGLE_CROCHET;
assert.equal(D.schemaVersion,1);assert.equal(D.checkpoints.length,6);
assert.deepEqual(Array.from(D.checkpoints,c=>c.id),['ready','insert','catch-yarn','pull-up','catch-again','pull-through-both']);
assert.deepEqual(Array.from(D.checkpoints,c=>c.loopsOnHook),[1,1,1,2,2,1]);
const counts={fabricExit:4,firstLoop:12,chainOpeningFront:4,chainOpeningBack:4,hookContact:5,newLoop:12,workingYarn:6};
for(const cp of D.checkpoints)for(const [id,n] of Object.entries(counts)){
  assert.equal(cp.yarn[id].length,n,`${cp.id}:${id}`);
  assert.ok(cp.yarn[id].every(p=>p.length===3&&p.every(Number.isFinite)));
}
for(let i=1;i<D.checkpoints.length;i++)for(const id of Object.keys(counts)){
  assert.deepEqual(D.checkpoints[i].yarn[id].length,D.checkpoints[i-1].yarn[id].length);
}
assert.equal(S.SINGLE_CROCHET.foundation.chains,7);
assert.deepEqual(D.foundation.target,{chainIndex:5,insertion:'both-top-loops'});
const f=S.sceneAt(D,0),again=S.sceneAt(D,0);
assert.deepEqual(f,again);assert.equal(f.checkpointId,'ready');assert.equal(f.loopCount,1);
const last=S.sceneAt(D,D.durationMs);assert.equal(last.checkpointId,'pull-through-both');assert.equal(last.loopCount,1);
const back=S.sceneAt(D,D.transitions[0].durationMs*.5);assert.equal(back.checkpointId,'insert');
const m=S.mirrorScene(f);for(const region of m.yarnRegions)for(let i=0;i<region.points.length;i++)assert.equal(region.points[i][0],-f.yarnRegions.find(r=>r.id===region.id).points[i][0]);
assert.equal(m.hook.position[0],-f.hook.position[0]);assert.equal(m.hook.orientation[1],-f.hook.orientation[1]);
const bad=JSON.parse(JSON.stringify(D));bad.checkpoints[1].yarn.firstLoop.pop();assert.ok(S.validateDefinition(bad).some(v=>v.status==='FAIL'));
console.log('PASS: scene checkpoints, identity, determinism, mirroring, validation.');
```

- [ ] **Step 2: Run it red**

Run: `node tests/test-scene.cjs`
Expected: FAIL because `stitch-scene.js` does not exist.

- [ ] **Step 3: Implement the scene model and seed checkpoints**

Create `stitch-scene.js` as an IIFE. Define helpers:

```js
const line=(a,b,n)=>Array.from({length:n},(_,i)=>[a[0]+(b[0]-a[0])*i/(n-1),a[1]+(b[1]-a[1])*i/(n-1),a[2]+(b[2]-a[2])*i/(n-1)]);
const ellipse=(cx,cy,rx,ry,z,n=12)=>Array.from({length:n},(_,i)=>{const a=Math.PI*2*i/n;return [cx+rx*Math.cos(a),cy+ry*Math.sin(a),z+Math.sin(a*2)*.04];});
const y=(regions)=>({fabricExit:regions.fabricExit,firstLoop:regions.firstLoop,chainOpeningFront:regions.chainOpeningFront,chainOpeningBack:regions.chainOpeningBack,hookContact:regions.hookContact,newLoop:regions.newLoop,workingYarn:regions.workingYarn});
const cp=(id,name,instruction,loopsOnHook,yarn,hook,highlights)=>({id,name,instruction,loopsOnHook,yarn,hook,contacts:[{region:'hookContact',hookPart:'throat'}],highlights});
```

Seed the fixed foundation at target x `.88`, base y `-.28`, z `.22`:
`chainOpeningFront=line([.68,-.08,.16],[1.08,-.34,.24],4)`, `chainOpeningBack=line([.68,-.16,.08],[1.08,-.42,.16],4)`.
Use `fabricExit=line([1.75,-.58,.02],[1.12,-.4,.14],4)`.

Each checkpoint uses these exact region forms, changing hook and active-loop values:

| checkpoint | firstLoop | hookContact | newLoop | workingYarn | hook pos / orientation |
|---|---|---|---|---|---|
| ready | `ellipse(.18,.48,.28,.34,.3)` | `line([.02,.6,.3],[.36,.34,.3],5)` | `ellipse(.32,.46,.01,.01,.3)` (degenerate) | `line([1.7,-.3,.08],[.42,.3,.22],6)` | `[.1,.1,0] / [0,0,-.15]` |
| insert | `ellipse(.22,.46,.27,.32,.28)` | `line([.58,-.02,.2],[1.06,-.3,.24],5)` | degenerate at target | `line([1.7,-.25,.08],[.7,.05,.17],6)` | `[.72,-.18,.1] / [0,0,-.55]` |
| catch-yarn | same firstLoop | `line([.66,-.05,.2],[1.04,-.28,.24],5)` | degenerate at throat | `line([1.7,-.2,.08],[.94,-.2,.22],6)` | `[.78,-.15,.12] / [0,0,-.8]` |
| pull-up | `ellipse(.02,.5,.25,.33,.3)` | `line([1.2,-.35,.24],[.45,.12,.28],5)` | `ellipse(.28,.52,.22,.3,.34)` | `line([1.8,-.35,.08],[.44,.28,.25],6)` | `[.5,.05,.12] / [0,0,-.75]` |
| catch-again | same firstLoop | `line([.46,.02,.22],[.8,-.12,.26],5)` | `ellipse(.34,.5,.2,.29,.34)` | `line([1.8,-.28,.08],[.72,-.18,.25],6)` | `[.62,.02,.14] / [0,0,-.9]` |
| pull-through-both | `ellipse(.2,.5,.24,.33,.3)` | `line([.42,.1,.24],[.9,-.2,.28],5)` | degenerate at loop | `line([1.8,-.4,.08],[.4,.32,.24],6)` | `[.78,-.08,.14] / [0,0,-.6]` |

`insert.highlights=['chainOpeningFront','chainOpeningBack']`; pull-up and catch-again highlight both loops; final highlights the remaining loop. Foundation chain and target metadata stay in `SINGLE_CROCHET.foundation`.

Implement `sceneAt`:

```js
function sceneAt(def,ms){
  const total=def.durationMs,t=Math.max(0,Math.min(total,ms));
  let index=def.checkpoints.length-1;
  for(let i=0;i<def.transitions.length;i++){const tr=def.transitions[i];if(t<tr.endMs){index=i;break;}}
  if(index===def.checkpoints.length-1){const last=def.checkpoints[index];return settledFrame(last,index);}
  const tr=def.transitions[index],raw=(t-tr.startMs)/tr.durationMs,p=Math.max(0,Math.min(1,raw)),eased=p*p*(3-2*p);
  const a=def.checkpoints[index],b=def.checkpoints[index+1];
  return {checkpointId:a.id,checkpointIndex:index,progress:p,settled:p===1,
    yarnRegions:Object.entries(a.yarn).map(([id,pts])=>({id,points:pts.map((q,i)=>[q[0]+(b.yarn[id][i][0]-q[0])*eased,q[1]+(b.yarn[id][i][1]-q[1])*eased,q[2]+(b.yarn[id][i][2]-q[2])*eased])})),
    hook:{position:a.hook.position.map((v,i)=>v+(b.hook.position[i]-v)*eased),orientation:a.hook.orientation.map((v,i)=>v+(b.hook.orientation[i]-v)*eased)},
    highlights:[...a.highlights],loopCount:a.loopsOnHook,instruction:a.instruction};
}
```

Transitions are generated in order with `startMs=i*1000`, `endMs=(i+1)*1000`, `durationMs=1000`; definition duration is `6000`. Final frame is the last checkpoint.

Implement mirroring with x negation of all yarn points and hook `position[0]`, `orientation[1]`, `orientation[2]`. Implement validation for schema version, exact checkpoint/region IDs, fixed point counts, finite numbers, duplicate/missing endpoints, target chain index 5, and loop counts. Return `FAIL` items; add `PASS` summary only if no failures.

- [ ] **Step 4: Run scene tests green**

Run: `node tests/test-scene.cjs`
Expected: `PASS: scene checkpoints, identity, determinism, mirroring, validation.`

- [ ] **Step 5: Commit only new scene files**

```bash
git add stitch-scene.js tests/test-scene.cjs
git commit -m "feat: add single crochet scene model"
```

### Task 2: Canvas Adapter with Front and Side Authoring Views

**Files:**
- Create: `stitch-canvas.js`
- Create: `tests/test-canvas.cjs`

**Interfaces:**
- Consumes `window.StitchScene.sceneAt()` frames.
- Produces `window.StitchCanvas` with:
  - `layoutFrame(frame, view)` → `{project(point), handles:[{region,index,x,y,visible}], hookHandles, bounds}`.
  - `drawScene(ctx, frame, view)` → layout.
- `view`: `{mode:'front'|'side',zoom:1,panX:0,panY:0,mirror:false,ghost:false,selected:null,width:620,height:385}`.
- Front projection uses X/Y; side uses Z/Y, with Y vertical in both.

- [ ] **Step 1: Write failing adapter tests**

Create `tests/test-canvas.cjs` with a recording context. Load `stitch-scene.js` then `stitch-canvas.js`. Assert:

```js
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const drawn=[];
const ctx=new Proxy({createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}},beginPath(){},moveTo(x,y){drawn.push([x,y])},lineTo(x,y){drawn.push([x,y])},stroke(){},fillText(){},save(){},restore(){},translate(){},clearRect(){},fillRect(){},arc(){},fill(){},ellipse(){},roundRect(){}},{set(o,k,v){o[k]=v;return true}});
const sandbox={window:{}};vm.createContext(sandbox);
for(const f of ['stitch-scene.js','stitch-canvas.js'])vm.runInContext(fs.readFileSync(f,'utf8'),sandbox);
const S=sandbox.window.StitchScene,C=sandbox.window.StitchCanvas;
const frame=S.sceneAt(S.SINGLE_CROCHET,0);
const view={mode:'front',zoom:1,panX:0,panY:0,mirror:false,ghost:false,selected:null,width:620,height:385};
const layout=C.drawScene(ctx,frame,view);
assert.equal(layout.handles.length,47); // fixed counts: 4+12+4+4+5+12+6
assert.ok(layout.handles.some(h=>h.visible));
assert.ok(drawn.length>20&&drawn.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=620&&y>=0&&y<=385));
const front=C.layoutFrame(frame,view),side=C.layoutFrame(frame,{...view,mode:'side'});
assert.notDeepEqual(front.handles.map(h=>[h.x,h.y]),side.handles.map(h=>[h.x,h.y]));
const mirrored=C.layoutFrame(S.mirrorScene(frame),view);
assert.notDeepEqual(mirrored.handles.map(h=>h.x),front.handles.map(h=>h.x));
console.log('PASS: canvas front/side layouts, projected geometry, visible handles, mirroring.');
```

- [ ] **Step 2: Run it red**

Run: `node tests/test-canvas.cjs`
Expected: FAIL because `stitch-canvas.js` does not exist.

- [ ] **Step 3: Implement adapter**

Implement orthographic mapping:

```js
const fit=(v,w,h)=>Math.min(w/6,h/4.2)*v.zoom;
function projectPoint(p,view){
  const x=view.mode==='front'?p[0]:p[2],yy=p[1];
  return [view.width/2+(view.mirror?-x:x)*fit(view,view.width,view.height)+view.panX,
          view.height*.55-yy*fit(view,view.width,view.height)+view.panY];
}
```

Draw:
- dot-grid stage and soft shadow;
- existing foundation V row for the seven chains;
- target V glow before motion, using the second chain from the right;
- ghost layer at alpha `.2` when enabled;
- yarn regions sorted into back/front layers using z; draw continuous sampled Catmull-Rom paths with underside and highlight;
- hook tip/throat/shaft with a small circular handle at each hook-contact point;
- selected point ring;
- all labels in DOM, not canvas-only.

Build handles for every point, with `visible` false for degenerate regions (`newLoop` at ready/insert/catch-yarn, final). Hit-testing uses only visible handles.

- [ ] **Step 4: Run adapter tests**

Run: `node tests/test-scene.cjs && node tests/test-canvas.cjs`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add stitch-canvas.js tests/test-canvas.cjs
git commit -m "feat: render single crochet front and side views"
```

### Task 3: Pure Studio Editor State, Undo, Drafts, and JSON

**Files:**
- Create: `studio-editor.js`
- Create: `tests/test-studio-editor.cjs`

**Interfaces:**
- Produces `window.StudioEditor.create(def, storage)` → editor object:
  - `getState()` → `{definition,selectedCheckpoint,selectedPoint,canUndo,canRedo,dirty}`.
  - `selectCheckpoint(id)`, `selectPoint(region,index)`.
  - `movePoint(region,index,axis,delta)` where axis is `x`,`y`, or `z`.
  - `moveHook(axis,delta)`, `rotateHook(axis,delta)`.
  - `moveCheckpoint(direction)`, `undo()`, `redo()`, `resetCheckpoint(id)`.
  - `validate()` → validation array.
  - `exportJSON()`, `importJSON(text)` → `{ok,error?}`.
  - `saveDraft()`, `loadDraft()` → `{ok,error?}`.
- Storage key: `crochet-lab-studio-draft-v1`.
- `storage` is injected `{getItem,setItem}`; never touched directly by tests.

- [ ] **Step 1: Write failing editor tests**

Create `tests/test-studio-editor.cjs`. Load `stitch-scene.js` and `studio-editor.js`, create an in-memory storage object, and assert:

```js
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const sandbox={window:{}};vm.createContext(sandbox);
for(const f of ['stitch-scene.js','studio-editor.js'])vm.runInContext(fs.readFileSync(f,'utf8'),sandbox);
const {StitchScene,StudioEditor}=sandbox.window;
const e=StudioEditor.create(StitchScene.SINGLE_CROCHET,storage);
e.selectCheckpoint('insert');e.selectPoint('firstLoop',2);
const before=e.getState().definition.checkpoints[1].yarn.firstLoop[2].slice();
e.movePoint('firstLoop',2,'x',.1);
const after=e.getState().definition.checkpoints[1].yarn.firstLoop[2].slice();
assert.equal(after[2],before[2]);assert.equal(after[1],before[1]);assert.equal(after[0],before[0]+.1);
e.undo();assert.deepEqual(e.getState().definition.checkpoints[1].yarn.firstLoop[2],before);
e.redo();assert.equal(e.getState().definition.checkpoints[1].yarn.firstLoop[2][0],before[0]+.1);
const good=e.exportJSON();store.set('crochet-field-lab-progress-v1','LEARNER');
const bad=e.importJSON('{bad');assert.equal(bad.ok,false);assert.ok(e.getState().definition.checkpoints[1].yarn.firstLoop[2][0]===before[0]+.1);
const imported=e.importJSON(good);assert.equal(imported.ok,true);
e.saveDraft();assert.ok(store.has('crochet-lab-studio-draft-v1'));
assert.equal(store.get('crochet-field-lab-progress-v1'),'LEARNER');
const e2=StudioEditor.create(StitchScene.SINGLE_CROCHET,storage);assert.equal(e2.loadDraft().ok,true);
assert.deepEqual(e2.getState().definition,e.getState().definition);
assert.ok(e2.validate().some(v=>v.status==='PASS'));
console.log('PASS: editor point edits, undo/redo, import rejection, draft isolation, validation.');
```

- [ ] **Step 2: Run it red**

Run: `node tests/test-studio-editor.cjs`
Expected: FAIL because `studio-editor.js` does not exist.

- [ ] **Step 3: Implement editor**

- Deep-clone the definition on create.
- Keep `undoStack`/`redoStack` of serialized definitions, capped at 50.
- Mutations push the prior state before changing a coordinate.
- `movePoint` validates axis and finite delta; only that axis changes.
- `moveHook` edits position; `rotateHook` edits orientation.
- `validate` delegates to `StitchScene.validateDefinition`.
- `importJSON` parses into a temporary object, verifies `schemaVersion===1`, required checkpoint IDs, region IDs/counts, and finite points before replacing. Failure leaves current definition untouched.
- `exportJSON` returns pretty JSON of the current definition.
- `saveDraft` writes only `crochet-lab-studio-draft-v1`.
- `loadDraft` parses/validates exactly like import and reports storage errors.
- `resetCheckpoint` restores that checkpoint from the original seed and is undoable.

- [ ] **Step 4: Run editor tests**

Run: `node tests/test-studio-editor.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add studio-editor.js tests/test-studio-editor.cjs
git commit -m "feat: add single crochet studio editor state"
```

### Task 4: Dedicated Studio Page and Interaction

**Files:**
- Create: `studio.html`
- Create: `studio.js`
- Create: `studio.css`
- Modify: `scripts/build-static.mjs`

**Interfaces:**
- Loads `stitch-scene.js`, `stitch-canvas.js`, `studio-editor.js`, then `studio.js`.
- Uses only `#studioApp`; no learner DOM IDs.
- Front and side canvases share the selected checkpoint/point.

- [ ] **Step 1: Add failing browser-surface check**

Extend `tests/test-studio-editor.cjs` with a small exported UI helper instead of asserting source text. Add to `studio-editor.js` a pure `hitTest(layout,selected)` that returns the nearest visible handle within 12 px and ignores invisible handles. Test:

```js
const layout={handles:[{region:'newLoop',index:0,x:10,y:10,visible:false},{region:'workingYarn',index:1,x:20,y:20,visible:true}]};
assert.equal(StudioEditor.hitTest(layout,{x:11,y:11}),null);
assert.deepEqual(StudioEditor.hitTest(layout,{x:22,y:21}),{region:'workingYarn',index:1});
```

Run `node tests/test-studio-editor.cjs`; it must fail because `hitTest` is missing.

- [ ] **Step 2: Implement hit-testing**

Add `hitTest(layout,point)` returning the nearest visible handle within 12 CSS pixels or `null`.

- [ ] **Step 3: Build the studio page**

`studio.html`:

- Header: title, schema version, Save draft, Export, Import, Reset checkpoint.
- Checkpoint rail: six buttons with name, loop count, validation badge.
- Dual canvases: front and side, both focusable, labeled.
- Inspector: region select, point index, X/Y/Z numeric inputs, hook X/Y/Z and orientation X/Y/Z, loop count, instruction.
- Timeline: previous, next, scrubber, replay, play/pause, speed `0.25/0.5/1`.
- Status region with `aria-live="polite"` for validation and import errors.

`studio.js`:

- Initialize editor with `window.localStorage`; load draft if valid, else seed.
- Render canvases with selected checkpoint pose; fit inside CSS box with DPR.
- Pointer down selects a visible handle or hook gizmo; drag updates only the view plane.
- Empty-canvas drag pans.
- Keyboard: `Tab` moves controls, arrow keys nudge selected point by `.01`, `Delete` is disabled, `Escape` deselects.
- Inspector inputs call editor methods; invalid numeric input is rejected visibly.
- Save/export/import/reset/draft states call editor.
- Checkpoint and timeline changes update instruction, loop count, and both canvases.

`studio.css`:

- Desktop 3-column grid; dual canvases side by side.
- `@media(max-width:680px)` stacks canvases and inspector; no horizontal overflow.
- Focus-visible rings; canvas `touch-action:none`.
- No learner theme or progress controls.

Add `'studio.html','studio.js','studio.css','stitch-scene.js','stitch-canvas.js','studio-editor.js'` to build entries.

- [ ] **Step 4: Run automated tests and build**

Run: `node tests/test-studio-editor.cjs && node tests/test-scene.cjs && node tests/test-canvas.cjs && npm run build`
Expected: all pass; build includes studio assets.

- [ ] **Step 5: Commit**

```bash
git add studio.html studio.js studio.css studio-editor.js tests/test-studio-editor.cjs scripts/build-static.mjs
git commit -m "feat: add single crochet authoring studio"
```

### Task 5: Browser Proof, Documentation, and Cleanup

**Files:**
- Modify: `DESIGN_SYSTEM.md`
- Modify: `docs/ARCHITECTURE.md`
- Possibly modify source/tests for defects only

**Interfaces:**
- No learner-facing behavior changes.
- Studio URL: `/studio.html` from repository root or built preview.

- [ ] **Step 1: Serve and inspect**

Run `python3 -m http.server 8000 --bind 127.0.0.1`. Open `/studio.html`. Inspect:

- Six checkpoints front and side.
- Target second V highlight, loop counts `1,1,1,2,2,1`.
- Drag a yarn point in front: X/Y change, Z unchanged; in side: Z/Y change, X unchanged.
- Select a degenerate `newLoop` point: it must not be hit-testable/visible.
- Undo/redo/reset; autosave reload; export/import round-trip; invalid import preserves draft.
- Validation badges and messages; malformed edit shows `FAIL` without crashing.
- Playback scrub, reverse seek, speed changes; same time yields identical geometry.
- 320/390 px layouts; keyboard focus; no console errors.
- Learner page remains unchanged; studio does not modify learner localStorage.

- [ ] **Step 2: Fix any discovered defect first**

Add a focused failing test to the owning file, watch it fail, then patch. Re-run:
`node tests/test-scene.cjs && node tests/test-canvas.cjs && node tests/test-studio-editor.cjs && npm test && npm run build`.

- [ ] **Step 3: Update documentation**

`DESIGN_SYSTEM.md`: add the studio authoring surface, scene contract, front/side editing convention, validation statuses, and explicit boundary that dashed/degenerate regions are not selectable.

`docs/ARCHITECTURE.md`: document `stitch-scene.js`, `stitch-canvas.js`, `studio-editor.js`, `studio.html`, storage key isolation, and future Three.js adapter.

Do not update learner README/roadmap for internal studio behavior. If mentioning the studio in README, label it an authoring tool and avoid learner-facing claims.

- [ ] **Step 4: Final verification and cleanup**

Run all tests/build. Stop preview servers, close browser tabs, delete temporary screenshots. Confirm `git status --short` shows only intended new/modified files and pre-existing user changes untouched.

- [ ] **Step 5: Commit**

```bash
git add DESIGN_SYSTEM.md docs/ARCHITECTURE.md
git commit -m "docs: document single crochet authoring studio"
```
