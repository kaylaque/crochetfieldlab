# Single-Crochet Studio Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` task-by-task. Every task uses test-first development and must be independently verified before it is marked complete.

**Goal:** Complete the approved single-crochet authoring studio milestone without changing learner behavior or learner storage.

**Architecture:** Finish `stitch-scene.js` contract and executable validation; extract shared renderer primitives to `stitch-draw.js`; build the authoring canvas/editor and dedicated studio page around those shared primitives. Keep the studio isolated from learner progression and keep practitioner crochet correctness and novice comprehension explicitly `UNVERIFIED` pending human review.

**Tech Stack:** Browser-global JavaScript, Canvas 2D, static HTML/CSS, Node `vm` tests, existing npm scripts, Chromium.

**Spec:** `docs/superpowers/specs/2026-11-11-single-crochet-studio-design.md`; approved execution plan: `local://single-crochet-studio-plan.md` (already supplied inline in the conversation).

## Global Constraints

- Preserve existing user changes in learner files; learner rendering and lesson behavior remain unchanged.
- Use schema version 1, fixed seven-chain target and six named checkpoints; preserve fixed region point counts.
- Use only `crochet-lab-studio-draft-v1` for studio persistence; never access learner progress/journal keys.
- All malformed shape/time input is named and rejected; structurally valid geometry problems remain importable and visible as validation results.
- Automated checks must not claim crochet correctness or novice comprehension; both remain `UNVERIFIED` without actual human review.
- Tests must verify user-visible behavior, not source text, mocks, or Canvas stroke counts.

## Review Focus

- Structurally valid imported geometry with broken contacts must survive import atomically and remain repairable.
- Missing, extra, nonfinite, or topology-changing regions must fail with checkpoint/region context.
- Duration edits and repeated/backward scrubs must produce the same exact scene at shared timestamps.
- Storage failure, corrupt draft, and malformed import must preserve the usable in-memory draft and never touch learner storage.
- Front/side dragging, mirroring, hook throat projection, and responsive layout must agree between hit testing and rendered pixels.

---

## Task 1: Complete scene schema, deterministic timing, and validation

**Files:** Modify `stitch-scene.js`; expand `tests/test-scene.cjs`; add `tests/test-scene-validation.cjs`.

**Consumes:** Existing `StitchScene.SINGLE_CROCHET`, `sceneAt`, `poseAtCheckpoint`, `mirrorScene`, `validateDefinition`, `validateTransition`.

**Produces:** `sceneAt(definition,time)` recomputes boundaries from transition durations, rejects nonfinite time and malformed shape, eases continuous matching-topology poses, settles exactly at destination boundaries, holds final checkpoint. Validators return itemized `{code,status,message,checkpointId?,regionId?,minimumDistance?}` values, including shape failures, junction continuity, yarn slack, transition jumps, 3D nonadjacent clearance warnings, loop state/count, target opening, throat contact, and human-review `UNVERIFIED` items.

- [ ] Test-first: add assertions for all six exact checkpoint names/instructions/counts; boundary and hold semantics; nonuniform durations; deterministic reverse/repeated samples; deep-copy safety; mirror geometry; invalid schema/time/region/point count/duration.
- [ ] Run `node tests/test-scene.cjs` and `node tests/test-scene-validation.cjs`; confirm failures identify missing behavior.
- [ ] Implement pure validators and scene sampling; do not mutate invalid drafts or the seed.
- [ ] Add fixtures for broken junction, stretched active strand with zero slack, near-crossing yarn, detached hook contact, incorrect loop state, point jump, and verify result code/status/locus.
- [ ] Run focused scene tests, `npm test`; inspect output.

## Task 2: Extract learner drawing primitives without visual drift

**Files:** Create `stitch-draw.js`; modify `stitch-renderer.js`, `index.html`, `tests/test-renderer.cjs`, and the simulated-DOM harness load list.

**Consumes:** Existing pure helpers and `StitchMotion` projection/motion contract.

**Produces:** `window.StitchDraw` exposing existing `COLORS`, `camera`, `project`, `spline`, `strokePath`, `drawStage`, `drawCompletedChains`, `drawStrand`, `drawHook`, `drawBadge`, plus orthographic projection. `StitchRenderer.render(ctx,options)` retains its current public signature and output.

- [ ] Add a learner regression for fixed projected coordinates and recorded semantic path sequence before extraction; run it and observe baseline pass.
- [ ] Move the helper bodies unchanged to `stitch-draw.js`; have renderer call `StitchDraw` helpers without altering call order or geometry.
- [ ] Load `stitch-draw.js` between motion and renderer in `index.html` and test harness.
- [ ] Run `node tests/test-renderer.cjs` and `npm test`; verify parity and learner suite.

## Task 3: Finish authoring canvas geometry, projection, and hit testing

**Files:** Modify `stitch-canvas.js`; expand `tests/test-canvas.cjs`.

**Consumes:** Task 2 `StitchDraw` and Task 1 frame/region records.

**Produces:** `StitchCanvas.layoutFrame(frame,view)` with CSS-pixel `project(point)`, visible active handles, matching hook gizmo/throat transform, and selection mapping; `drawScene(ctx,frame,view)` draws the authoring frame with shared palette/stage/hook/foundation primitives, target highlight, back-to-front yarn order, ghost and mirror behavior.

- [ ] Test front and side coordinates (side depth changes, hidden coordinate invariant), mirror, hook throat alignment, inactive/collapsed and out-of-bounds handles, selected-point mapping.
- [ ] Confirm tests fail on the current minimal canvas.
- [ ] Implement projection and drawing using shared primitives; avoid allocations/geometry rebuilds on idle frames where feasible.
- [ ] Run `node tests/test-canvas.cjs` and `node tests/test-renderer.cjs`.

## Task 4: Complete editor edit transactions, import/export, and recovery

**Files:** Modify `studio-editor.js`; expand `tests/test-studio-editor.cjs`.

**Consumes:** Scene validator and canvas coordinate conventions.

**Produces:** `StudioEditor.create(definition,storage)` with `getState`, selection, begin/end edit, point/hook movement, hook rotation, duration update, undo/redo, selected-checkpoint reset, validate, stable envelope export/import, debounced draft save/recovery. Drag transaction creates exactly one history entry; only visible-plane coordinates change; invalid/inactive edits do not mutate; import shape rejection is atomic while structurally valid geometry defects remain editable and shown; bounded 50-entry history; storage errors do not lose memory state.

- [ ] Write failing tests for front XY/side ZY edits, drag one-undo transaction, duration undo, reset isolation, export/import round-trip, malformed import atomicity (including selection/history/storage), broken-geometry import retention, storage failure, 300ms debounce, and storage spy proving only the studio key is touched.
- [ ] Run `node tests/test-studio-editor.cjs` and observe expected failures.
- [ ] Implement transaction snapshots, validated temporary import, debounce and error state.
- [ ] Run focused test, scene tests, and `npm test`.

## Task 5: Complete accessible studio UI and build integration

**Files:** Modify `studio.html`, `studio.js`, `studio.css`, `scripts/build-static.mjs`; add UI tests in repository's simulated DOM pattern.

**Consumes:** Scene, Canvas, Editor public APIs.

**Produces:** Dedicated `/studio.html` editor with six checkpoints, loop counts, itemized validation, front/side canvases, synchronized selection, point/hook inspector, instruction, duration control, scrub/step/play/pause/replay/speed, ghost, view controls, import/export, undo/redo, confirmed checkpoint reset, accessible native labels/status/detail, pointer capture and cancellation, keyboard nudges, no learner nav link, responsive stacking without horizontal overflow at 320/390px, reduced-motion stopped initial state.

- [ ] Add interaction tests first for checkpoint selection, scrubbing, selection/edit, keyboard focus behavior, import/export and reset confirmation.
- [ ] Implement all controls and pointer paths; empty-canvas pan must not begin an edit; pointerup/cancel must end a drag exactly once.
- [ ] Append all studio and shared assets to static entry list; preserve existing scripts' order; build.
- [ ] Run all focused tests, `npm test`, renderer regression, and `npm run build`.

## Task 6: Real-browser proof and review

**Files:** No planned production file changes; correct authored poses/UI only if browser evidence exposes defects, with a regression test before each correction.

- [ ] Serve `dist/` at `127.0.0.1:8001`; use Chromium to inspect front/side at 0, 1000, 2000, 3000, 4000, 5000, 5500, 6000ms, scrub reverse/forward and compare repeated timestamps.
- [ ] Exercise same point in both views; front drag preserves Z, side drag preserves X; undo/redo; change duration; reset one checkpoint; malformed and broken-geometry import; export/reimport; reload saved draft.
- [ ] At 320px and 390px verify no overlap or horizontal scrolling; test keyboard, reduced motion, and console errors.
- [ ] In a separate learner tab, compare learner localStorage progress and journal before/after studio edits; values must be identical.
- [ ] Report structural/browser verification separately from practitioner crochet correctness and novice comprehension; keep latter two `UNVERIFIED` absent reviewers.
- [ ] Run full focused set: `node tests/test-scene.cjs && node tests/test-scene-validation.cjs && node tests/test-canvas.cjs && node tests/test-studio-editor.cjs && npm test && node tests/test-renderer.cjs && npm run build`.
