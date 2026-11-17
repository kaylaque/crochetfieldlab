# Single-crochet teaching animation with coordinated hands

Status: proposed design for review; not an implementation plan or a correctness certification.

## Purpose and success

Help a beginner perform one US single crochet into the second foundation chain from the hook. Teach where to place the hook, how to manage yarn and fabric with both hands, and how to recognize each completed action. Physical plausibility serves instruction; cinematic realism does not.

The user requested a more teacher-like animation, including animated hands. This design chooses simplified 3D hands, a right-handed knife grip, and one demonstrated yarn-tension route as defaults. These are proposed instructional choices, not claims that other grips are wrong. A practitioner must approve the demonstrated grip and routing before learner release.

Success means a beginner can follow the sequence, identify one versus two loops, and use a recovery explanation without off-screen instructor help. Automated checks cannot establish that outcome.

## Existing system and scope change

The current home lesson uses `stitch-motion.js` and `stitch-renderer.js`. The dedicated studio uses `stitch-scene.js`, `stitch-canvas.js`, `studio-editor.js`, and `studio.js`. They do not currently share a single-crochet motion definition.

The prior studio design explicitly excluded animated hands, WebGL, physics, and learner integration. This proposal supersedes those exclusions only for the single-crochet teaching sequence described here. Other lessons, camera tracking, manual counters, journal behavior, and unrelated edits stay unchanged.

In scope:
- One fixed seven-chain foundation and one single crochet.
- Both articulated hands, a hook, continuous yarn, and supported foundation geometry.
- Six settled checkpoints, intermediate contact poses, front/side studio inspection, and a learner teaching camera.
- Teacher-paced playback, self-checks, and targeted recovery explanations.
- One shared reviewed sequence used by studio and home lesson.

Out of scope:
- Arbitrary user-driven crochet or general yarn/fabric simulation.
- Photorealistic skin, animated arms/body, multiple grip libraries, or automatic assessment.
- Animated demonstrations for other stitch types.
- Hand-tracking input, automatic stitch counts, or camera-based correctness claims.

## Approach and tradeoffs

Choose authored 3D motion with deterministic contact constraints. A small Three.js renderer provides actual depth occlusion, articulated hands, and tube-shaped yarn. Pin its version and ship assets locally; no runtime CDN dependency.

Alternatives considered:
- Extend Canvas with layered hand drawings: lower renderer cost, but unreliable occlusion and limited inspection of finger/yarn contacts.
- Full dynamic yarn and hand simulation: accommodates arbitrary movement, but introduces instability, expensive collision work, and nondeterministic seeking that the fixed lesson does not need.

The chosen system is a physically plausible teaching illustration, not a physical simulator. Deterministic evaluation and readable technique outrank secondary jiggle or skin detail.

## Technique and teaching checkpoints

The sequence uses front-to-back insertion under both top loops of the second chain, with yarn-over direction back to front. A practitioner must confirm the reference before pose authoring is accepted.

| Checkpoint | Learner instruction | Hand action | Settled loops |
|---|---|---|---|
| Ready | Find the second chain from your hook. | Hook hand holds the hook; yarn hand pinches the foundation below the target and supports the working yarn over its index finger. | 1 |
| Insert | Slide the hook under both top loops of that chain. | Hook hand advances through the opening; yarn hand keeps the target open without hiding it. | 1 |
| Yarn over | Catch the working yarn from back to front. | Hook hand rotates the throat toward the strand; yarn-hand index maintains the yarn route. | 1 |
| Pull up a loop | Bring the caught yarn back through the chain. | Hook hand carries the strand through; yarn hand permits controlled feed while holding the foundation. | 2 |
| Yarn over again | Catch the working yarn once more. | Hook hand catches the supplied strand; yarn hand maintains space between hook and fabric. | 2 |
| Pull through both | Draw the caught yarn through both loops. | Hook hand rotates and withdraws through the loops; yarn hand steadies the forming stitch. | 1 |

Loop labels describe seated loops on the shaft, not every bend or temporary caught strand. Count changes occur at authored formation/release events, never from an arbitrary interpolation midpoint.

## Hands, yarn, and contact

### Representation

Use a lightweight articulated hand rig: wrist, palm, thumb, and four fingers with fixed bone lengths and bounded joint rotations. Render smooth simplified forms with restrained shading and clear separation from the pink yarn and blue hook. No unlicensed downloaded hand assets; procedural geometry avoids an external asset prerequisite.

The hook-hand wrist transform and grip-relative finger poses maintain grip as the hook rotates. The yarn hand has authored wrist/finger poses for foundation support, tension, and feed. Fingers are not rigid decorative shapes attached to the hook.

### Contact model

Each authored contact records participants, local attachment coordinates, an active time interval, and whether it is fixed grip, sliding yarn support, or fabric pinch. Use model-space distances tied to hook/yarn radius, not screen pixels.

- Hook grip: thumb/index contact the handle; remaining fingers support it without intersecting the shaft.
- Foundation pinch: yarn-hand thumb and supporting finger remain on a stable fabric region below the target.
- Tension route: working yarn passes over the index finger and continues visibly toward the supply. Hidden portions remain continuous in 3D.
- Hook catch: yarn enters the throat before the pull begins and remains carried until its release event.
- Sliding contacts: yarn can feed over a finger or hook surface; contact does not incorrectly pin one material point forever.

Evaluate hook and hand transforms first, then resolve yarn paths against their contacts. Author intermediate poses around catches, insertion, and releases rather than blending only six endpoints.

### Plausible yarn behavior

Model yarn as connected centerline regions with stable point correspondence, radius, rest-length budgets, and declared contact/crossing events. Constrain continuity and nonpenetration at sampled transitions. Redistribute available slack during pulls instead of stretching a strand without limit. Foundation deformation is small and authored around its support and insertion contacts.

Actual yarn identity must continue through newly formed loops; a new loop must emerge from the carried bight, not appear as a disconnected object. The final stitch remains attached to the foundation. Finite-thickness loops must clear the hook head during pull-through.

This is not a claim of conservation-accurate textile mechanics. Validation identifies excessive stretch, detached contacts, penetration, or ambiguous topology for repair rather than silently forcing an impossible pose.

## Shared scene architecture

### Scene data and evaluation

Extend the scene contract in `stitch-scene.js` to include hand rigs/poses, contact intervals, yarn correspondence, and teaching events. New exported authoring data uses schema version 2. Before defining the exact schema in the implementation plan, inspect all current import/export consumers and references.

`sceneAt(definition, timeMs)` remains a pure function of definition and time. It resolves the same hands, yarn, hook, count, and instruction on repeated or backward seeks. No accumulated simulation state, wall-clock dependence, or independent hand animation timers.

Use rigid-transform interpolation and bounded joint interpolation; do not linearly interpolate matrix elements. Contact intervals define when attachment is required and how contact engages/releases continuously. Geometry validation must cover the evaluated result, not only control points.

### Rendering

A new single-crochet 3D adapter consumes resolved frames; it owns mesh setup, camera, lighting, depth, resize, and disposal, not lesson state. Studio and learner use the same adapter and evaluator with different controls. Existing renderers continue serving other lessons.

Reuse meshes and typed buffers during playback; do not rebuild hand rigs or tube meshes every frame. Pause rendering when the scene is unchanged. Respect device pixel ratio with a bounded rendering resolution and provide explicit graphics-error feedback.

If WebGL is unavailable, show the existing written instructions and linked tutorial with a clear message that the interactive animation is unavailable. Do not silently substitute a different or unreviewed animation.

### Studio authoring

Keep front and side inspection, timeline, undo/redo, and import/export. Extend the inspector for hand joints, grip/pinch anchors, contact intervals, and intermediate poses. Contact validation identifies the time, hand/finger or yarn region, and violated constraint. Authoring controls do not appear in the home lesson.

Accept version-1 drafts through a one-time deterministic import conversion: preserve their yarn/hook work, add the new data explicitly as unreviewed, and do not invent valid hand contacts. Export and new persistence use version 2. Keep the old studio draft intact until conversion and the first new save succeed; failed conversion must preserve the in-memory scene. No permanent alternate v1 runtime path.

### Home integration

Replace only the home lesson's single-crochet motion path after review. Remove the obsolete single-crochet poses and callers at cutover; retain knot/chain motion. Studio and learner must resolve identical geometry at shared timestamps.

Playback never writes learner counters, progress, or journal. Only existing explicit learner actions count stitches. New presentation preferences remain session-only unless separately requested.

## Teaching interaction

Start paused on Ready. Show one concrete instruction, the expected settled loop count, and the current action name beside the animation.

- **Next action:** animate one transition, then stop at its settled checkpoint.
- **Previous action:** return to the preceding settled checkpoint.
- **Replay action:** replay the transition ending at the selected checkpoint; Ready replays setup without advancing a stitch.
- **Play sequence / Pause:** optional continuous demonstration, stopping at the final stitch rather than looping unexpectedly.
- **Speed:** 0.25×, 0.5×, and 1× alter time only.
- **Timeline:** seeking pauses playback and updates all geometry and teaching state together.
- **Show hands:** hide hand meshes for inspection without changing yarn routing, contacts, or pose.
- **Teaching / Side view:** explicit camera choices; no automatic camera swing during an action.
- **Mirrored view:** reflect the complete scene and camera convention, including hands, contacts, highlights, and hook orientation. Describe it as a mirrored demonstration, not a separately validated left-handed grip.

Each checkpoint includes an optional self-check and a local recovery explanation. Examples: identify both top loops before insertion; recognize two seated loops after pull-up; loosen an overly tight loop before forcing the hook through. Recoveries use the same valid checkpoints and may replay the relevant action; no second unvalidated animation set. Learners self-report their state; the app never claims to see their work.

## Visibility and accessibility

Use a close oblique teaching view that keeps the insertion point, hook throat, and counted loops readable. Hand silhouettes must not obscure those targets during the decisive motion. Prefer camera/pose adjustment over ghosting the hands; hiding hands is an optional inspection aid, not the solution to an unreadable default.

At 320px, 390px, and desktop widths, instructions and controls remain outside the drawing area. Use only the current action's spatial callout; leader lines and labels must avoid each other and the active target. Keep all controls keyboard accessible with visible focus. Announce action/count changes at checkpoints, not every animation frame. Provide equivalent written steps and do not encode meaning solely with color.

Reduced motion starts paused, disables automatic camera motion, and supports direct checkpoint changes without tweening. Explicit slow replay remains available. No automatic playback on load or return to the lesson.

## Validation and release gates

### Automated structural evidence

Verify deterministic repeated/reverse sampling, finite transforms, constant bone lengths, joint bounds, contact continuity, yarn junction continuity, loop formation transitions, bounded stretch, and nonpenetration around hook/finger contacts. Check boundaries and intermediate samples around every catch/release; six endpoint checks alone are insufficient.

Exercise malformed imports, atomic conversion, failed storage, undo/redo of hand/contact edits, and export/reimport. Prove studio persistence never accesses learner storage. Keep tests focused on observable geometry/state invariants rather than source strings or renderer call counts.

### Browser evidence

Capture settled checkpoints and the critical transitions in teaching/front/side views, with hands shown and hidden. Inspect hook catch/carry, pinch stability, yarn routing, crossings, two-loop legibility, and label visibility. Exercise all playback controls, mirror, viewport changes, reduced motion, and graphics failure. Compare learner storage before and after studio editing and learner playback.

Record defects separately from missing evidence. Passing structural tests is not a visual or technique pass. Use the project's six-row crochet validation report; attach hand/contact findings as supporting evidence without replacing its criteria.

### Human gates

1. A crochet practitioner approves grip, tension route, target insertion, yarn-over direction, contacts, crossings, loop counts, and completed stitch. Any unresolved technique defect blocks home cutover.
2. Observe 3–5 beginners attempting the stitch and recovering from an intentional mistake. Record interventions, confusion points, and completion without help. Revise observed teaching failures before claiming beginner effectiveness; the sample is qualitative evidence, not a statistical guarantee.

Both technique accuracy and teaching effectiveness remain UNVERIFIED until their respective evidence exists. Studio authoring can be delivered before human review; learner cutover cannot bypass the technique gate.

## Delivery boundaries

1. Extend deterministic scene/contact data and author the coordinated sequence in the studio.
2. Add shared 3D rendering and hand/contact editing; demonstrate the full sequence in-browser.
3. Complete practitioner review and repair observed defects.
4. Integrate teacher-paced home playback using the reviewed shared sequence, removing the old single-crochet path.
5. Conduct beginner observation and repair teaching failures before claiming teaching validation.

These are design boundaries, not permission to deliver stubs. The implementation plan must specify exact interfaces, fixtures, migration behavior, verification commands, and evidence artifacts. Human review availability is an external prerequisite, not an automated check to be simulated.
