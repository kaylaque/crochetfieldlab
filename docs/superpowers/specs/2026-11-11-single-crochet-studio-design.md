# Single-Crochet Authoring Studio Design

## Purpose

Make one US single crochet precise, smooth, and understandable by authoring and validating its geometry before exposing new motion to learners. The first milestone is a dedicated authoring/debug studio; the learner lesson remains on its current renderer until the six checkpoints are approved.

The scene stays on Canvas 2D for this milestone, but its geometry, timing, and validation live behind a renderer-independent contract so a later Three.js view can replace the Canvas adapter without rewriting the stitch model.

## Scope

In scope:

- One right-handed US single crochet into the second foundation chain from the hook.
- Insertion under both top loops of the target V.
- A fixed seven-V teaching foundation, independent of saved chain counts.
- Six authored checkpoints and the transitions between them.
- A dedicated studio with checkpoint inspection, front/side views, control-point editing, hook editing, validation, draft persistence, and JSON import/export.
- Shared scene-model tests and browser-based visual evidence.

Out of scope:

- Learner-facing lesson integration in this milestone.
- Three.js or WebGL implementation.
- Animated hands, camera recognition, automatic counting, collision physics, or fabric simulation.
- Claims of crochet correctness or beginner effectiveness without practitioner and learner review.
- Replacing or discarding existing uncommitted user work.

## Current Context

The repository already has:

- `stitch-motion.js` with validated knot/chain keyframes and pure interpolation.
- `stitch-renderer.js`, a Canvas renderer that projects poses and draws continuous strands.
- An uncommitted single-crochet extension on `fix/visual-animation`.
- A separate draft validation-skill spec that treats renderer migration and auto-counting as out of scope.

This design builds alongside that work. Existing changes are preserved, but provisional single-crochet poses are not accepted until reviewed in the studio.

## Technique Contract

- Stitch: first US single crochet of a row.
- Target: second foundation chain from the hook.
- Insertion: under both top loops of the target V, from front to back.
- Yarn-over direction: back to front over the hook.
- Default view: right-handed teaching view; mirroring reverses geometry, not wording.
- Foundation: seven fixed V stitches, centered in the teaching scene.
- Loop counts: six checkpoints settle at `1, 1, 1, 2, 2, 1` loops on the hook.
- The first loop is the slip-knot/working loop already on the hook. The completed stitch remains connected to the foundation.

Technique conventions are explicit data, not implicit drawing assumptions.

## Architecture

### `stitch-scene.js`

Renderer-independent stitch definition, evaluation, mirroring, and validation.

Exports:

- `SINGLE_CROCHET`: the serializable stitch definition.
- `sceneAt(definition, timeMs)`: pure deterministic frame.
- `poseAtCheckpoint(definition, checkpointId)`: exact authored pose.
- `mirrorScene(scene)`: x-reflection of yarn points, hook position, and hook orientation.
- `validateDefinition(definition)`: structural and motion checks.
- `validateTransition(definition, fromId, toId)`: transition-specific checks.

No DOM, Canvas, storage, lesson, camera, counter, or journal access.

A resolved frame has this shape:

```js
{
  checkpointId,
  checkpointIndex,
  progress,          // 0..1 within the active transition
  settled,           // true at/after the eased transition end
  yarnRegions: [{ id, points: [[x,y,z], ...] }],
  hook: { position: [x,y,z], orientation: [x,y,z] },
  highlights: [string],
  loopCount,
  instruction
}
```

Evaluation is a pure function of time. Seeking backward does not depend on previously fired events.

### `stitch-canvas.js`

First renderer adapter for the scene contract.

- Draws front and side orthographic-style projections.
- Samples continuous centerlines and gives them visible thickness.
- Draws the hook, target highlight, loop labels, and optional ghost structure.
- Preserves named-yarn-region identity across frames.
- Accepts a view object: `{view:'front'|'side', zoom, pan, mirror, ghost}`.
- Contains no editing state and no lesson state.

A later `stitch-three.js` implements the same `drawScene(ctx, scene, view)` boundary with 3D curves and tube geometry.

### `studio.html`, `studio.js`, `studio.css`

Dedicated authoring page:

- Checkpoint rail with six stops, settled loop counts, and validation badges.
- Front and side canvases; selecting a point in either canvas selects the same point in both.
- Dragging in front edits X/Y; dragging in side edits Z/Y.
- Hook position and orientation controls with a visible gizmo.
- Yarn-region inspector and point list.
- Transition scrubber between adjacent checkpoints.
- Highlight selected region; toggle ghost structure.
- Autosave studio draft under a studio-only storage key.
- Import/export JSON.
- Undo, redo, reset selected checkpoint, and reload exported definition.
- No learner navigation, counters, journal, progress, or camera access.

### Existing learner viewer

Unchanged in this milestone. It continues using the current uncommitted single-crochet implementation. Integration waits until the authored checkpoints and transitions pass review.

## Data Model

A definition is serializable and versioned:

```js
{
  schemaVersion: 1,
  id: 'single-crochet',
  technique: {
    target: 'second-chain',
    insertion: 'both-top-loops',
    yarnOver: 'back-to-front',
    handed: 'right'
  },
  foundation: { chains: 7, targetIndex: 5 },
  regions: ['fabricExit','firstLoop','chainOpeningFront','chainOpeningBack','hookContact','newLoop','workingYarn'],
  checkpoints: [{
    id: 'ready',
    name: 'Ready',
    instruction: 'One loop on the hook. Find the second V from the hook.',
    loopsOnHook: 1,
    yarn: {
      fabricExit: [[x,y,z], ...],
      firstLoop: [[x,y,z], ...],
      chainOpeningFront: [[x,y,z], ...],
      chainOpeningBack: [[x,y,z], ...],
      hookContact: [[x,y,z], ...],
      newLoop: [],
      workingYarn: [[x,y,z], ...]
    },
    hook: { position: [x,y,z], orientation: [x,y,z] },
    contacts: [{ region: 'hookContact', hookPart: 'throat' }]
  }],
  transitions: [
    { from: 'ready', to: 'insert', durationMs: 1000 }
  ]
}
```

Constraints:

- Every transition has matching region IDs and equal point counts in its from/to poses.
- Points are finite three-number arrays.
- The same point index in the same region represents the same yarn location unless the transition declares sliding.
- `fabricExit` is anchored to the foundation.
- `workingYarn` maintains a declared supply direction.
- `hookContact` follows the hook throat by a shared contact rule.

## Checkpoints

| Order | ID | Name | Visible state | Loops | Instruction |
|---:|---|---|---|---:|---|
| 1 | `ready` | Ready | One working loop on hook; target second V highlighted | 1 | One loop on the hook. Find the second V from the hook. |
| 2 | `insert` | Insert | Hook tip through the opening, under both top loops, no pierced strand | 1 | Slide the hook under both top loops. |
| 3 | `catch-yarn` | Catch yarn | Working yarn under the hook throat from back to front | 1 | Catch the working yarn with the hook. |
| 4 | `pull-up` | Pull up a loop | Caught strand returns through the opening; two distinct loops on shaft | 2 | Pull the yarn back through the chain. |
| 5 | `catch-again` | Catch yarn again | Working yarn under throat; both loops remain seated | 2 | Yarn over once more. |
| 6 | `pull-through-both` | Pull through both | Caught strand through both loops; they release; one active loop remains | 1 | Pull through both loops. |

## Motion Design

- Checkpoint poses are authored first and validated before transitions are judged.
- Transitions use continuous eased movement with matching endpoint poses and bounded velocity changes.
- Hook and yarn share explicit contact constraints; caught yarn follows the throat.
- Difficult crossings require intermediate poses, not easing alone.
- No bounce, overshoot, or decorative wobble.
- Continuous playback is optional; default is step-by-step.
- The timeline does not repeat seamlessly, because that would look like undoing the stitch.
- Visible labels and instructions derive from the current time, never from event history.

Initial transition durations are 1000 ms each, with the final checkpoint held. Durations are editable per transition in the studio.

## Studio Interaction

Desktop layout:

- Left: checkpoint rail and validation summary.
- Center: front and side canvases side by side.
- Right: inspector for selected point, yarn region, hook pose, contacts, and loop count.
- Bottom: checkpoint timeline, undo/redo, import/export.

Phone layout:

- Checkpoint rail collapses to an accessible select or scroll row.
- Front and side canvases stack.
- Inspector follows the canvases.
- No control covers either canvas.

Interaction rules:

- Selecting a yarn point in either canvas selects its matching point in the other.
- Drag updates only the coordinates belonging to that view plane; the hidden coordinate is unchanged.
- Hook dragging updates position; orientation controls use numeric/ranged inputs.
- Dragging begins only on a visible control point or hook gizmo; empty-canvas drag pans.
- Every edit is undoable.
- Autosave is debounced; explicit Export is required for handoff.
- Studio storage failure is surfaced; the current in-memory draft remains usable.
- Import validates schema version and shape before replacing the draft; invalid import leaves the current draft intact.
- Reset requires confirmation and resets only the selected checkpoint.

## Validation

Validation status is one of `PASS`, `WARN`, `FAIL`, or `UNVERIFIED`.

Automated checks:

- **Schema:** required fields, finite numbers, known regions, known checkpoints.
- **Continuity:** adjacent regions connect; no duplicate or missing endpoints.
- **Identity:** region IDs and point counts match across a transition.
- **Determinism:** repeated evaluation of the same time yields deep-equal frames.
- **Motion:** sampled hook position/orientation and yarn coordinates have bounded frame-to-frame deltas.
- **Yarn supply:** active-yarn length changes stay within declared slack; otherwise fail.
- **Clearance:** sample non-neighbor segment distances; report suspicious intersections and minimum clearance.
- **Loop count:** declared loop count matches the number of authored loop regions expected at that checkpoint.
- **Foundation target:** highlighted opening matches the second V from the hook.
- **Playback:** scrub, reverse seek, and speed changes preserve the same scene for the same time.

`UNVERIFIED` is required when a criterion depends on absent reference footage, practitioner review, or beginner observation. Automated checks must never be presented as proof of crochet correctness.

## Error Handling

- Malformed data fails with checkpoint/region names, not a generic fallback.
- A failed validation remains visible in the studio and is included in export metadata.
- Invalid edits are not silently corrected.
- Import preserves the current draft on failure.
- Storage failures do not destroy the in-memory draft.
- Studio has no path to learner storage keys, counters, progress, or journal.
- Existing lesson behavior is unaffected during this milestone.

## Testing

### Scene-model tests

- Six checkpoints with exact IDs, names, instructions, and loop counts.
- Every transition has matching region IDs and point counts.
- Checkpoint seams are identical objects after import/export round-trip.
- `sceneAt` is deterministic and supports forward/backward seeks.
- Mirroring negates every x coordinate and hook x/orientation as specified.
- Malformed definitions throw with useful context.
- Yarn-length and clearance checks fail on deliberately broken fixtures.
- Foundation highlight targets the second V from the hook.

### Studio tests

- Checkpoint selection and loop count rendering.
- Control-point selection synchronizes between front and side canvases.
- Drag changes only the visible-plane coordinates.
- Undo/redo and reset-selected-checkpoint.
- Autosave draft and recover after reload.
- Export/import round-trip preserves the definition.
- Invalid import leaves the draft unchanged.
- Validation badges update after edits.
- Studio does not read or write learner progress keys.

### Browser proof

- All six checkpoints front and side, zoom extremes.
- Hook enters the marked opening; two loops are visibly distinct at pull-up; one remains after pull-through.
- No immediate visible self-intersection at authored checkpoints and sampled transitions.
- Export, reload, and re-import produce an identical scene.
- Desktop and 320/390 px layouts; keyboard navigation; no console errors.
- Slow-motion and reverse seeking do not change scene geometry for the same time.

### Review boundary

Structural and visual evidence can prove continuity, determinism, and consistency. Crochet correctness and teaching clarity remain `UNVERIFIED` until:
- a practitioner reviews insertion, yarn-over direction, hook rotation, loop structure, and final stitch;
- a beginner identifies the insertion point and next action from a paused frame without coaching.

## Documentation

- Add this design spec.
- During implementation, update `DESIGN_SYSTEM.md` with studio authoring rules and the renderer-independent scene contract.
- Do not update learner README/roadmap for studio behavior until it changes learner-visible behavior.
- Document the later Three.js swap as an adapter implementation of the same contract.

## Build Order

1. Scene schema, six static checkpoints, and validation.
2. Canvas adapter with front/side views.
3. Studio shell and checkpoint inspection.
4. Control-point/hook editing, undo/redo, autosave, import/export.
5. Validation panel and transition scrubber.
6. Browser evidence and documentation.

## Success Criteria

An author can open a dedicated studio, inspect and correct all six single-crochet checkpoints from front and side views, see structural regressions immediately, recover edits after reload, and export a deterministic stitch definition without editing code or touching learner data. The scene contract is stable enough that a later Three.js adapter can replace Canvas without rewriting the stitch definition.

No claim of crochet correctness or beginner effectiveness is made by this milestone.
