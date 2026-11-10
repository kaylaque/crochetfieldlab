# Crochet Field Lab — Design System (v1)

## Reference interpretation

- **Interaction reference:** `https://ardchain.github.io/esp32-field-lab/`. We use the concept of an educational field/lab environment: numbered steps, an instrument-like central visualization, clearly separated instruction and feedback controls, and repeatable guided practice. The original source code and computed CSS were **not** available from this environment, so this is a new implementation, not a literal extraction.
- **3D illustration reference:** `https://bsw.kadcom.dev/trik/garis-tepi-cangkang/`. We interpret the requested outline/cartoon direction using ink-colored contours, soft fill colors, simplified shading, and visible loops. Its exact styling, shader, materials, and design tokens could not be verified.
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
| Ink | `#25312e` | Main text, borders, dark actions |
| Paper | `#f8f6f0` | App background |
| Card | `#fffcf5` | Panels and controls |
| Sage | `#c5e2be` | Success/progress and soft instructional affordances |
| Lilac | `#dac9f4` | Brand glyph, quiet highlights |
| Blush | `#f1b5c2` | Yarn color and visual focus |
| Butter | `#f4df9e` | Next-action card |
| Soft orange | `#f6c48e` | Supporting accent |


Typography:
- UI sans-serif: DM Sans, fallback system sans-serif.
- Editorial accent: Fraunces, fallback Georgia.
- Instrument labels: DM Mono, fallback monospace.

Shape & spacing:
- Main panel borders: 1–1.5 px warm-grey.
- Controls: rounded ~8–13 px; modal ~19 px.
- Explicit labels: `01 / 08`, `YOUR NEXT MOVE`, `CAMERA ASSIST`, `ACTIVITY LOG`.
- Clear hierarchy: large editorial lesson heading → single concrete next action → small reassuring tip.
- 3D viewport: pastel sage/cream stage, dotted background, outline tubes, rotate / zoom actions; never overclaim physical realism.

## Component vocabulary

`TopBar` • `CourseProgress` • `LessonRail` • `LessonHeading` • `StitchStage` • `NextMove` • `CountControl` • `LiveCamera` • `HandLandmarkOverlay` • `SelfReview` • `TutorialDeepLink` • `Journal` • `PauseModal`.

## Interaction states

- Camera: off / asking permission / on / blocked / unavailable.
- Hand tracking: off / loading / active / cannot load. Never display *correct* solely from hand landmarks.
- Lesson: current / completed / earlier / next, all revisitable.
- Stitch count: increment / decrement / next row. Only user-confirmed counts are persisted.
- Session: active / paused / resumed. Camera powers off when paused or journal is open.

## Future design extensions

1. Add a camera position guide for top-down vs 45-degree angle and left/right handedness.
2. Add semi-transparent hook insertion target on segmented yarn when measured confidence is adequate.
3. Build confidence-calibrated, temporal *action* feedback instead of frame-level yes/no labels.
4. Provide explanation cards with the observed evidence and an *I disagree* button, not just a verdict.
5. Add multiple projects, row and pattern schemas, count import/export, and optional sync.
