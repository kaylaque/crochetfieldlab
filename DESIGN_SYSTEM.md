# Crochet Field Lab — Design System (v1)

## Reference interpretation

- **Interaction reference:** `https://ardchain.github.io/esp32-field-lab/`. We use the concept of an educational field/lab environment: numbered steps, an instrument-like central visualization, clearly separated instruction and feedback controls, and repeatable guided practice. The original source code and computed CSS were **not** available from this environment, so this is a new implementation, not a literal extraction.
- **Tone-based shading reference:** Gooch, Gooch, Shirley & Cohen, *A Non-Photorealistic Lighting Model for Automatic Technical Illustration*, SIGGRAPH 1998 — verified at <https://users.cs.northwestern.edu/~ago820/SIG98/abstract.html> (DOI [10.1145/280814.280950](https://dl.acm.org/doi/10.1145/280814.280950)). The paper keeps shading in the mid-tones and uses hue shifts — not only luminance — to describe surface orientation, reserving extremes for edge lines and highlights. Our yarn uses the same idea with two flat passes (warm body, cooler underside) instead of a lighting shader.
- **Outline reference:** the five outline techniques surveyed by Alexander Ameye at <https://ameye.dev/notes/rendering-outlines/> (verified): rim/fresnel, vertex extrusion ("inverted hull" back-face shell), blurred buffer, jump flood, and full-screen edge detection. We deliberately use none of those passes; the contour is a single ink stroke with round joins, which is simpler than a shell and stays crisp at every zoom.
- **Curriculum source:** `https://www.youtube.com/watch?v=aAxGTnVNJiE` (simplydaisy's crochet tutorial). The app links to original video chapter timestamps and provides original supporting text and illustrated geometry; it does not replicate the video.

## Design principle

**The student never has to remember where they left off.** Show their place, their next physical motion, a reference illustration, a camera view, and a reversible manual count on one screen. Avoid implied automatic precision.

## Experience layout

| Region | Desktop | Phone |
|---|---|---|
| Header | Wordmark + Learn/Journal + course identity | Condensed wordmark + tabs |
| Progress | Main heading + completion bar and pause | Stack heading and completion bar |
| Left rail | Persistent full step list | Horizontal scrollable step chips |
| Center | Lesson title, rotatable illustrated 3D, next-action instruction, counter, controls | Full-width sequenced sections |
| Right rail | Camera, framing aid, self-check, source tutorial | Stacked section after lesson |
| History | Separate journal view with counts, row logs, lesson history | 2-column stats + history |

## Style tokens

| Token | Color | Usage |
|---|---|---|
| Ink | `#2f2a44` | Main text, borders, dark actions |
| Paper | `#f7f4fb` | App background |
| Card | `#fffbfe` | Panels and controls |
| Blue | `#b9d1f2` | Progress, status dots, soft instructional affordances |
| Blue deep | `#3f5d8c` | Completed-step labels and quiet blue text |
| Lilac | `#dac9f4` | Brand glyph, quiet highlights |
| Purple | `#6f5aa8` | Active-step borders and selected controls |
| Blush | `#f1b5c2` | Yarn color and visual focus |
| Pink soft | `#f6d3e1` | Next-action card and soft pink surfaces |
| Mauve | `#ae6a86` | Editorial italic accent |
| Rose | `#a34163` | Destructive actions only |

Typography:
- UI sans-serif: DM Sans, fallback system sans-serif.
- Editorial accent: Fraunces, fallback Georgia.
- Instrument labels: DM Mono, fallback monospace.

Shape & spacing:
- Main panel borders: 1–1.5 px cool lavender-grey.
- Controls: rounded ~8–13 px; modal ~19 px.
- Explicit labels: `01 / 08`, `YOUR NEXT MOVE`, `CAMERA ASSIST`, `ACTIVITY LOG`.
- Clear hierarchy: large editorial lesson heading → single concrete next action → small reassuring tip.
- 3D viewport: pastel blue/pink stage, dotted background, outline tubes, rotate / zoom actions; never overclaim physical realism.

## Component vocabulary

`TopBar` • `CourseProgress` • `LessonRail` • `LessonHeading` • `StitchStage` • `PlaybackBar` • `HandednessSelect` • `NextMove` • `CountControl` • `LiveCamera` • `HandLandmarkOverlay` • `SelfReview` • `TutorialDeepLink` • `Journal` • `PauseModal`.

## Guided stitch motion (lessons 2, 4, 5)

Only the slip-knot lesson (step 2) and the two chain lessons (steps 4 and 5) animate. The other five lessons keep their static illustrations and expose no play/pause button, scrubber, phase buttons, handedness control, or speed control.

**Phase labels.** Knot: `Lay yarn` → `Cross to form a loop` → `Pull a bight through` → `Place loop on hook` → `Tighten the sliding knot`. Chain: `One loop on hook` → `Yarn over` → `Pull through` → `New chain V`. The phase name is discrete — it changes only at a phase boundary, never once per frame — and it owns a full-width row of the playback panel so it never ellipsizes, verified from 320 px to 1440 px.

**Timeline.** Both motions share one 6,000 ms playhead: 1,200 ms per knot phase, 1,500 ms per chain phase. The settled final frame holds for 800 ms before the loop repeats. Speeds `0.25×`, `0.5×`, and `1×` change timing only; geometry and phase boundaries are identical at every speed. Slider travel of 0–1000 maps exactly onto the 6,000 ms animation, so dragging to the maximum parks the thumb at the settled end instead of snapping backwards. Slider input, the phase buttons, Play, and Pause all read and write that same playhead.

**Settle poses.** Inside each phase the pose eases over the first 82% and holds its end pose for the remaining 18%, so pausing or stepping to a boundary always lands on a rest pose rather than a blur. The last keyframe of a phase is the first keyframe of the next, so phases chain without a jump.

**Warm/cool yarn.** Front-facing yarn uses warm blush `#ec9cad`; the strand the current phase is teaching uses the lighter `#ffc8d0`. A cooler mauve `#b987a6` pass offset down the model's y axis reads as the shaded underside, and a narrow white highlight follows the centre line. The active strand never turns blue: blue metal belongs to the hook alone.

**Consistent ink.** Strands and both hook segments are outlined in ink `#3b3355` before their fill, with round caps and joins and a width that scales with canvas height and zoom. The contour is a single stroke — no second shell pass, no hatching, no tonal falloff.

**Continuous strands.** A pose holds three paths: tail, working, and the active bight or loop. Each path is one continuous Catmull-Rom strand sampled from 3D control points, so a bight that appears during a phase is connected to the working side instead of being a floating loop. A path whose points collapse to one place draws nothing, so a strand that has not appeared yet is simply absent.

**Crossing depth.** Paths are stroked in the declared order `tail → working → active` from 3D points whose z offsets place them in front of or behind one another, so a bight pulled through the old loop reads on top of it while the first loop reads as passing behind. The hook sits at z ≈ 0.4 and is drawn last, so yarn passes behind the metal. There is no per-pixel depth buffer, and the illustration does not claim one.

**Mirror mode.** `Left-handed · mirrored` reflects the x coordinate of every pose point and negates the hook's angle, so hook travel, crossings, and loop direction all mirror without a second motion definition. It is viewer memory for the session: it survives lesson changes, is never written to progress or `localStorage`, and never changes counts or the journal. Reset restores the front angle and zoom but leaves handedness and the playhead alone.

**Counts.** Lesson 5 draws exactly the counted V stitches from 0 to 11. Above 11 it draws the last 11 and adds the words `Last 11 of N counted`; the counter keeps the real total. Playback and scrubbing never add, remove, or persist a counted stitch.

## Interaction states

- Camera: off / asking permission / on / blocked / unavailable.
- Hand tracking: off / loading / active / cannot load. Never display *correct* solely from hand landmarks.
- Lesson: current / completed / earlier / next, all revisitable.
- Stitch count: increment / decrement / next row. Only user-confirmed counts are persisted.
- Session: active / paused / resumed. Camera powers off when paused or journal is open.

## Future design extensions

1. Add a camera position guide for top-down vs 45-degree framing; the mirrored practice view already covers left/right handedness.
2. Add semi-transparent hook insertion target on segmented yarn when measured confidence is adequate.
3. Build confidence-calibrated, temporal *action* feedback instead of frame-level yes/no labels.
4. Provide explanation cards with the observed evidence and an *I disagree* button, not just a verdict.
5. Add multiple projects, row and pattern schemas, count import/export, and optional sync.
