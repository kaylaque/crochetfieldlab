# Single-Crochet Teaching Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Teach one US single crochet through five animated, annotated actions while addressing the reviewed help, layout, wording, and accessibility issues.

**Architecture:** Extend the existing browser-global `StitchMotion` model and `StitchRenderer` path with a five-phase single-crochet motion, preserving its exact three-path schema. Keep instruction text, projected guides, transient help, and camera layout in `app.js` and the existing HTML/CSS; playback and guidance never write learner progress.

**Tech Stack:** Vanilla JavaScript, Canvas 2D, HTML/CSS, Node `vm` smoke harness, real-browser visual inspection.

**Spec:** `docs/superpowers/specs/2026-11-11-single-crochet-teaching-design.md`

## Global Constraints

- Preserve all existing uncommitted changes, especially the hook-before-yarn renderer fix, its regression test, and the corresponding design-system text.
- No new dependencies, automated counting, camera recognition, generic depth sorter, or all-scene extraction. Existing knot/chain motions and five static scenes remain functional.
- Single crochet has five phases and six connected keyframes; settled loop counts are `1,1,2,2,1`. The only single-stitch counting action remains `+ Stitch`.
- Every actual user-visible instruction and loop count must be available as DOM text, not only canvas pixels. Reduced motion starts paused.
- Never claim 3–5 beginner sessions occurred unless real participants were observed. The 20-minute duration is an estimate.
- For all tasks, preserve the `index.html` script order and `scripts/build-static.mjs` asset list; no module conversion.

## Review Focus

1. **Selecting the current lesson or returning from the journal:** existing feedback must stay visible; Task 1 tests both.
2. **Scrub at the last slider endpoint and step to a settled phase:** show phase 5 and one loop, without jumping back or advancing counters; Task 3 tests both.
3. **Left-handed guides and side/zoom extremes:** marker and arrow reflect with the same model coordinates as the actual yarn; Task 3 requires browser inspection of both hands, three presets, and zoom extremes.
4. **Camera denied, stopped, or collapsed:** no unexpected camera/tracking restart, hidden panel reclaims the grid, and a visible opt-in remains; Task 5 exercises these states.
5. **No recorded foundation chains or repeated seeking:** the lesson still shows its fixed example and never changes progress or journal; Tasks 2–3 test zero and nonzero persisted counters and repeatedly seek.

## File map

- `stitch-motion.js`: six single-crochet poses, five phase names, validated/exported `SINGLE_MOTION`.
- `stitch-renderer.js`: existing projector and seven-V drawing; retain current hook-before-strands order. Add only a small explicit guide/foundation interface if required to align target coordinates.
- `app.js`: scene dispatch, phase instructions and guides, transient feedback, troubleshooting, camera lifecycle and layout state.
- `index.html`: loop-count/instruction text, trouble choices, compact camera control, relocated tutorial/self-check, entry copy and reset name.
- `styles.css`: camera-off/on grid, accessible text/controls, responsive guide and lesson layout.
- `tests/test-smoke.cjs`: existing `makeTestEnv()` behavior regressions; extend its simulated DOM only as necessary to exercise real consumer-visible behavior.
- `DESIGN_SYSTEM.md`, `README.md`: update only affected motion and camera/learning documentation.

---

### Task 1: Correct stale feedback

**Files:** Modify `app.js` (`changeStep`); test `tests/test-smoke.cjs`.

**Interfaces:** `window.crochetLab.changeStep(i)` clamps indices as before; feedback remains DOM-local and is not persisted.

- [ ] Add this regression near the existing state-machine checks:

```js
const feedbackEnv = makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(5)', feedbackEnv.sandbox);
feedbackEnv.callUI('needHelp', 'click');
const singleTip = feedbackEnv.el('reviewFeedback').textContent;
assert.match(singleTip, /Two loops/);
vm.runInContext('changeStep(5)', feedbackEnv.sandbox);
assert.equal(feedbackEnv.el('reviewFeedback').textContent, singleTip);
vm.runInContext("setView('journal'); setView('learn')", feedbackEnv.sandbox);
assert.equal(feedbackEnv.el('reviewFeedback').textContent, singleTip);
vm.runInContext('changeStep(6)', feedbackEnv.sandbox);
assert.equal(feedbackEnv.el('reviewFeedback').textContent, '');
vm.runInContext('changeStep(7)', feedbackEnv.sandbox);
assert.equal(feedbackEnv.el('reviewFeedback').textContent, '');
```

- [ ] Run `npm test`; confirm the first real lesson change fails the new empty-feedback assertion, not setup.
- [ ] Compute the clamped `next` before mutating `state.step`; clear `$('reviewFeedback').textContent` only if `next !== state.step`. Preserve `state.paused=false`, persistence, and `render()`:

```js
function changeStep(i){const next=Math.max(0,Math.min(LESSONS.length-1,i));if(next!==state.step)$('reviewFeedback').textContent='';state.step=next;state.paused=false;persist();render();}
```

- [ ] Run `npm test`; confirm the regression and existing state-machine checks pass. Do not clear feedback from `render()`, which also runs for counting and journal return.

### Task 2: Author and validate the single-crochet motion

**Files:** Modify `stitch-motion.js`; test `tests/test-smoke.cjs`.

**Interfaces:** Export `window.StitchMotion.SINGLE_MOTION`; `sampleMotion(SINGLE_MOTION, ms)` and `mirrorPose(pose)` retain their existing signatures. Add `single` to `PHASE_NAMES` as `['Insert','Yarn over','Pull up a loop','Yarn over again','Pull through both']`.

- [ ] Add a regression using the actual motion model, not mock poses:

```js
const singleMotion = sandbox.window.StitchMotion.SINGLE_MOTION;
assert.ok(singleMotion, 'single-crochet motion exists');
assert.deepEqual(Array.from(singleMotion.phases, p => p.name),
  ['Insert','Yarn over','Pull up a loop','Yarn over again','Pull through both']);
assert.equal(singleMotion.durationMs, 6000);
for (let i = 0; i < singleMotion.phases.length; i++) {
  const phase = singleMotion.phases[i];
  for (const id of ['tail','working','active']) {
    assert.equal(phase.from.paths[id].length, phase.to.paths[id].length);
    for (const point of [...phase.from.paths[id], ...phase.to.paths[id]])
      assert.ok(point.length === 3 && point.every(Number.isFinite));
    if (i) assert.deepEqual(Array.from(phase.from.paths[id], p => Array.from(p)),
      Array.from(singleMotion.phases[i-1].to.paths[id], p => Array.from(p)));
  }
}
```

- [ ] Run `npm test`; confirm it fails because `SINGLE_MOTION` is absent.
- [ ] Author six real `pose(...)` keyframes with `P(...)` and `H(...)` in `stitch-motion.js`; do not copy chain poses or use repeated placeholders. Keep identical point counts within each of the three paths across all six poses. `active` must visibly represent one loop, then two distinguishable loops after pull-up, then one loop after pull-through. Move the hook tip into the second V of a fixed seven-V foundation during insertion; keep the working-yarn path attached to the pulled-up section. Use front-view coordinates within the existing stage and preserve the hook-before-strands rendering rule. The existing fixed V row is centered using `stepX=.44`, `startX=-(7-1)*.44/2`; its second V from the right has center x `.88`, base y `-.28`, z `.22`. Establish one shared target anchor from that geometry and mirror x for left-handed view.
- [ ] Build/export/validate with the existing factory and validator:

```js
const SINGLE_MOTION = makeMotion('single', singlePoses);
validateMotion(SINGLE_MOTION);
// Include SINGLE_MOTION in the existing window.StitchMotion export.
```

- [ ] Run `npm test`; inspect the real six poses in the browser while developing. Passing structural tests alone is not acceptance: an indistinguishable pair of loops, detached working yarn, or a marker over a different V requires adjusting the keyframes before continuing.

### Task 3: Wire animation, settled phase controls, and guides

**Files:** Modify `app.js`, `index.html`, and, only if necessary to share actual foundation geometry, `stitch-renderer.js`; test `tests/test-smoke.cjs`.

**Interfaces:** Existing `StitchRenderer.render(ctx, options)` returns `{phaseIndex, visibleCompletedVs}`. Map `single` to `SINGLE_MOTION`; its illustrative foundation count is fixed at 7, independent of `state.chains`. Add a DOM phase instruction/loop count (`#singleGuide`, hidden outside lesson 6). Guide data are keyed by phase, with model-space anchor and arrow coordinates; mirror x before projecting with `proj()`.

- [ ] Add a behavior test for settled phase navigation and state isolation:

```js
const singleEnv = makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(5)', singleEnv.sandbox);
assert.equal(singleEnv.el('viewerPlaybackControls').hidden, false);
assert.equal(singleEnv.el('viewerPlayButton').textContent, '▶');
const before = JSON.stringify(singleEnv.sandbox.window.crochetLab.getState());
for (const [i, loops] of [1,1,2,2,1].entries()) {
  vm.runInContext(`seekPhase(${i})`, singleEnv.sandbox);
  assert.match(singleEnv.el('singleGuide').textContent, new RegExp('\\b' + loops + ' loop'));
}
singleEnv.el('viewerTimeline').value = '1000';
singleEnv.callUI('viewerTimeline','input');
assert.equal(singleEnv.el('viewerTimeline').value, '1000');
assert.match(singleEnv.el('singleGuide').textContent, /1 loop/);
assert.equal(JSON.stringify(singleEnv.sandbox.window.crochetLab.getState()), before);
```

- [ ] Run `npm test`; confirm failure because the single scene is still static or the guide is absent.
- [ ] Add `SINGLE_PHASES`, `SINGLE_GUIDES`, `#singleGuide` with `aria-live="polite"`, and explicit scene-to-motion dispatch. Use the model's existing 6000 ms duration and only fixed seven Vs for `single`; keep `chain`'s actual user count and overflow label unchanged.
- [ ] `seekPhase()` currently seeks the start of each phase, not its settled end. For `single` only, seek to `idx * 1200 + 984` ms (82% of a 1200 ms phase); this is within the same phase and at the end of the easing interval. Keep knot/chain seeking behavior unchanged. At slider 1000 the last phase remains selected and the loop label is one.
- [ ] Draw a second-V highlight and phase-relevant arrows/labels after the renderer, using the same `.88,-.28,.22` foundation anchor and `proj()`. Apply the same mirror operation to anchor and arrow geometry as to the pose; keep corresponding DOM instructions legible and independent of the canvas.
- [ ] Run `npm test`. Start `npm run preview`, use the lesson rail and real controls, and inspect all five settled phases at front/top/side, right/left, zoom `.64` and `1.65`; verify the hook actually enters the marked V, loop counts correspond to visible loops, working yarn remains connected, and arrows/labels are not misleading. Fix the geometry or guide placement if inspection fails. Capture temporary screenshots for review, not committed pixel baselines.

### Task 4: Add troubleshooting and clarify copy

**Files:** Modify `app.js`, `index.html`, `styles.css`; test `tests/test-smoke.cjs`.

**Interfaces:** Four lesson-6-only buttons are ordinary keyboard-operable controls; selecting one changes `#reviewFeedback` without asserting automatic detection or changing stitch counters. Other lessons retain `needHelp` and existing tips.

- [ ] Add a regression that selects lesson 6, activates each troubleshooting control, checks its recovery text, and verifies `chains`, `singles`, `row`, `rowStitches`, and completion state are unchanged. Exercise navigation away and back and ensure stale advice does not leak. Example for the first control:

```js
const troubleEnv = makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(5)', troubleEnv.sandbox);
const countsBefore = troubleEnv.sandbox.window.crochetLab.getState();
troubleEnv.callUI('troubleTight','click');
assert.match(troubleEnv.el('reviewFeedback').textContent, /loosen/i);
assert.equal(troubleEnv.sandbox.window.crochetLab.getState().singles, countsBefore.singles);
vm.runInContext('changeStep(6)', troubleEnv.sandbox);
assert.equal(troubleEnv.el('reviewFeedback').textContent, '');
```

- [ ] Run `npm test`; confirm missing controls/handlers are the failure.
- [ ] Add buttons `troubleTight`, `troubleFind`, `troubleExtra`, `troubleDropped` and handlers with the recovery copy in the spec. Hide those controls outside lesson 6; keep `needHelp` for all other lessons. Reuse the existing feedback element and avoid adding a second persistent help store.
- [ ] Update the lesson-6 hint to `The loop on your hook does not count as a chain stitch.` Add `aria-label="Reset 3D view"` to `#viewerResetButton`. Add the entry outcome, yarn/hook materials, and `About 20 minutes` estimate; preserve the eight-step course and existing title/tone.
- [ ] Run `npm test`, then verify all four actual buttons and the reset button's accessible name with the browser accessibility tree.

### Task 5: Reflow optional camera and tutorial access

**Files:** Modify `index.html`, `app.js`, `styles.css`; test `tests/test-smoke.cjs` and real browser.

**Interfaces:** Place the existing `#videoLink` and review controls in the learning center, retaining IDs and video attribution. `#cameraButton` remains a reachable opt-in even when the camera sidebar is collapsed. Reflow `#learnView` based on actual camera state; `stopCamera()` must stop tracks and tracking, reset controls, and leave no auto-restart on the next opt-in.

- [ ] Add deterministic tests using a fake `navigator.mediaDevices.getUserMedia` stream to verify opening the panel does not call `getUserMedia` or enable tracking, denied permission leaves an accessible retry and collapsed/off state, successful explicit activation opens the panel, and stopping calls each track's `stop()` exactly once. Assert journal/pause stops an active stream. Extend `makeTestEnv` with a fake stream only for these state-transition tests, not a mock that merely echoes a setter.
- [ ] Run `npm test`; confirm the missing collapsed-camera/opt-in behavior fails.
- [ ] Move the existing tutorial and self-check DOM nodes rather than duplicating IDs. Add a compact accessible camera button and explicit camera-active class/hidden state. A two-column lesson layout is the default; activating the camera reveals the third column. On mobile, stack the revealed camera below the instruction with no page-level horizontal overflow.
- [ ] Preserve privacy: acquiring a stream occurs only on an explicit camera action, enabling landmarks only on the existing explicit landmark action, and stopping/collapsing does not restart tracking on a future camera activation. Update `stopCamera()` to reset the tracking state consistently rather than leaving `tracking=true` for `startCamera()` to reuse.
- [ ] Run `npm test`. In a real browser check camera-off desktop and mobile, permission-denied retry, explicit opt-in, stop, pause, journal transition, tutorial accessibility and attribution, and no unrequested camera/landmark activation. Use a fake browser media device where real permission is unavailable; report that limitation.

### Task 6: Contrast, docs, and integrated proof

**Files:** Modify `styles.css`, `DESIGN_SYSTEM.md`, `README.md`; test existing suite and actual browser.

**Interfaces:** Preserve existing visual identity and responsive breakpoints; text meets WCAG AA 4.5:1 for normal text and 3:1 for large text against its actual background. Do not treat a source-string CSS assertion as visual proof.

- [ ] Adjust supporting text and label sizes/colors at their actual selectors and surfaces; provide a non-color cue for the highlighted V and current phase. Preserve focus indicators.
- [ ] Update `DESIGN_SYSTEM.md` and `README.md` to describe single-crochet playback, DOM loop count, troubleshooting, collapsed camera, and unchanged manual counting. Do not claim camera-based stitch verification.
- [ ] Run `npm test` and `npm run build`. Since the build replaces generated `dist/`, inspect its tracked/user-owned status before running; preserve any unrelated user changes.
- [ ] Launch the built or local page in a browser. Complete one single-crochet cycle using phase controls, check each settled loop count, request/recover from each issue, navigate lessons/journal, toggle handedness and reduced motion, and manually count one stitch. Inspect 320/390 px mobile and desktop layouts, keyboard navigation, focus, contrast against actual surfaces, and console errors.
- [ ] Report all checks actually performed, any unverified camera/angle, and the absence of human usability evidence. Propose an observed 3–5 beginner session as a separate human acceptance activity; do not invent participants or results.
