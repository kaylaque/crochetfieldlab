# Guided Stitch Motion Design

## Purpose

Help a beginner watch, pause, rotate, slow down, and imitate the physical movements for a slip knot and foundation chain. The viewer must show continuous, connected yarn and hook motion that can be practiced, rather than decorative changes between unrelated illustrations.

The first release uses right-handed choreography with a left-handed mirror toggle. It remains instructional: no physical simulation, camera-based assessment, automatic stitch counting, or correctness claim.

## Scope

- Lessons 2, 4, and 5: slip knot, chain movement, and counted chain practice.
- Existing playback, timeline, speed, phase-step, camera-angle, pointer, keyboard, and reduced-motion behavior.
- Declarative motion data, continuous keyframe interpolation, warm/cool instructional shading, and handedness mirroring.
- Documentation needed to describe the shipped model and visual rules.

The other five lessons retain static explanatory illustrations. WebGL, Three.js, hatching, hand animation, camera tracking, and new dependencies are out of scope.

## Current Problems

- `drawKnotProcess()` and `drawChainProcess()` contain pose data and rendering decisions in `app.js`.
- The hook is mostly stationary and strand control points do not consistently preserve identity between phases.
- Knot drawings can read as unrelated rings and sticks rather than a working-strand bight pulled through a first loop.
- Chain drawings read as repeated ovals rather than connected V stitches.
- Uniform white highlights do not adequately distinguish front-facing yarn from underside or crossing depth.
- Adding another outline pass would decorate the current shapes without correcting their instructional meaning.

## Selected Architecture

### `stitch-motion.js`

Owns instructional phase definitions and pose data. It has no DOM, storage, camera, or lesson-state dependencies.

Each lesson exports ordered phases. Every animated phase has a start pose and an end pose with the same structure:

- `name`: the existing user-facing phase label.
- `durationMs`: time allocated to the movement and its settle hold.
- `tail`: control points for the tail strand where applicable.
- `working`: control points for the continuous working strand.
- `activeLoop`: control points for the current loop or bight.
- `hook`: position, rotation, and scale.
- `depthOrder`: stable identifiers describing back-to-front drawing order.
- `chainAnchor`: attachment point for the existing chain where applicable.

A pose uses stable strand and loop identifiers across keyframes. Interpolation is only defined between matching structures; the renderer must not infer topology from unrelated arrays.

The knot model has five phases:

1. `Lay yarn`
2. `Cross to form a loop`
3. `Pull a bight through`
4. `Place loop on hook`
5. `Tighten the sliding knot`

The chain model has four phases shared by lessons 4 and 5:

1. `One loop on hook`
2. `Yarn over`
3. `Pull through`
4. `New chain V`

### `stitch-renderer.js`

Owns interpolation, mirroring, projection, and Canvas drawing. Its public entry point accepts:

- a motion definition,
- playhead time,
- viewing yaw, pitch, and zoom,
- handedness,
- completed chain count,
- a Canvas 2D context and viewport dimensions.

It does not read or mutate application state. The existing `P`, transform, projection, curve, and stroke behavior may move into this module when they are only used by the stitch renderer.

### `app.js`

Retains curriculum, progress, persistence, camera, and viewer controls. It selects the motion definition for the active lesson and passes playback and view state to the renderer. Manual `state.chains` supplies completed stitches only. Playback and scrubbing never call `count()` or write progress.

## Motion and Topology

### Slip knot

- **Lay yarn:** tail and working strand lie apart; both endpoints remain visible.
- **Cross to form a loop:** the working strand travels above the tail while the first loop closes. Crossing depth is explicit.
- **Pull a bight through:** a folded section of the working strand moves from back to front through the first loop. It remains connected to the working side and is not drawn as an independent loop.
- **Place loop on hook:** the hook enters the opened bight while the first loop gathers at its base.
- **Tighten the sliding knot:** the base loop contracts under tail/working tension while the hook loop remains open and adjustable.

### Chain

- **One loop on hook:** the completed chain and one current loop are visible.
- **Yarn over:** the connected working strand moves behind and then over the hook; the hook rotates to catch it.
- **Pull through:** the hook draws that same strand through the old loop. The old loop opens into a V.
- **New chain V:** the new V settles beside the completed chain and exactly one replacement loop remains on the hook.

The animated next stitch is instructional only. Lesson 5 renders the manual count: exactly `state.chains` Vs from 0–11, and the last 11 plus `Last 11 of N counted` above 11.

### Timing

- Existing phase names and inspection controls remain unchanged.
- Every phase eases from its start pose to its end pose, then settles briefly.
- Speed alters timing only; geometry and phase boundaries are identical at every speed.
- Scrubbing and playback use the same normalized-time interpolation function.
- Reduced motion starts paused, while scrub and phase stepping remain available.
- The completed final pose holds before the timeline repeats.

## Handedness

The viewer offers `Right-handed` and `Left-handed · mirrored` beside the existing speed and angle controls, only on knot/chain lessons.

Mirror mode reflects the x-coordinate of every pose and reverses the corresponding hook yaw. It mirrors the entire choreography, including strand crossings; it does not duplicate motion definitions or change lesson text.

The selected handedness persists in viewer memory across lesson changes for the session. It is not written to lesson progress or `localStorage`. Camera/reset behavior is unchanged except that the viewer reset does not clear handedness.

## Visual System

Use verified concepts from the reference techniques rather than claiming to reproduce their shaders:

- Gooch-inspired warm/cool shading keeps forms readable in shadow.
- Front-facing yarn uses the existing warm blush.
- Underside/back-facing yarn uses a cooler, darker blush/lilac.
- Highlights are narrow and restrained; active yarn must not resemble metal.
- Ink contours retain the existing color, round joins, and consistent apparent width.
- Crossings are drawn back-to-front using the motion definition's stable depth order.
- No additional shell-outline pass, hatching, or photorealistic material.
- The pastel stage and `ILLUSTRATIVE 3D` badge remain.

`DESIGN_SYSTEM.md` will replace the unverified shell-outline-only interpretation with these verified references and add rules for motion legibility, crossing depth, continuous strands, and handedness.

## Data Flow

```text
Lesson + playhead + speed + view + handedness + manual count
                         │
                         ▼
                  app.js integration
                         │
                         ▼
        stitch-motion.js pose interpolation inputs
                         │
                         ▼
             stitch-renderer.js Canvas frame
```

No data flows from the renderer into progress, counters, journal, camera, or storage.

## Error Handling

- Motion development helpers reject mismatched pose structures and missing required paths instead of substituting generic loops.
- Invalid durations or non-finite coordinates fail during development/tests.
- Runtime rendering receives validated bundled definitions; no network-loaded motion data exists.
- A lesson without an animated definition uses the existing static scene path.
- Hidden tab, paused session, journal view, and reduced-motion rules continue to prevent unintended playback advancement.

## Verification

### Automated behavior

- Keyframes in a phase have matching structures and finite coordinates.
- Strand endpoints are continuous at phase boundaries.
- The knot's bight remains connected to the working strand.
- The chain ends with one loop on the hook and one new V.
- Mirroring maps corresponding x-coordinates and hook angles exactly.
- Existing playback, reduced-motion, counter, and journal smoke regressions remain green.
- `npm test` and `npm run build` pass.

### Browser evidence

- Inspect every knot and chain phase at start, middle, end, and settle.
- Confirm continuous connected motion, readable crossings, a single final hook loop, and connected counted Vs.
- Compare right-handed and mirrored choreography.
- Exercise front/top/side presets, free drag, pinch, wheel, keyboard zoom/rotation, speed, scrub, phase steps, replay, reset, and lesson changes.
- Verify desktop and 320/390 px layouts without controls covering yarn.
- Confirm reduced-motion pause and no console errors.
- Confirm playback and scrubbing do not change stored counts or journal entries.

## Documentation

- Add this approved design spec before implementation.
- Update `DESIGN_SYSTEM.md` with the selected visual and motion rules.
- After implementation, update `README.md`, `docs/ARCHITECTURE.md`, and `docs/ROADMAP.md` only for behavior that actually shipped.

## Success Criteria

A beginner can watch the working strand and hook perform an ordered movement, pause or scrub to any part of that movement, slow it down, rotate it, and mirror it for left-handed practice. The same motion remains topologically connected and visually legible throughout. Manual learning progress remains entirely learner-controlled.
