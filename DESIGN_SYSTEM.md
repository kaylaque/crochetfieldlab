# Crochet Field Lab — Design System (v1)

## Reference interpretation

- **Interaction reference:** `https://ardchain.github.io/esp32-field-lab/`, for numbered steps, separated instruction and feedback, and repeatable guided practice.
- **Visual reference:** the pixel-arcade workshop merged in `workshop.html` and `workshop.css`.
- **Curriculum source:** `https://www.youtube.com/watch?v=aAxGTnVNJiE` (simplydaisy's crochet tutorial). The app embeds the original video and provides original supporting text; it does not rehost the footage.

## Design principle

**The student never has to remember where they left off.** Show their place, their next physical motion, a tutorial, a camera view, and a reversible manual count. Avoid implied automatic precision.

## Experience layout

| Region | Desktop | Phone |
|---|---|---|
| Header | Wordmark + Learn/Journal + course identity | Condensed wordmark + tabs |
| Progress | Main heading + completion bar and pause | Stack heading and completion bar |
| Left rail | Persistent full step list | Horizontal scrollable step chips |
| Center | Lesson title, tutorial video, next-action instruction, counter, controls | Full-width sequenced sections |
| Right rail | Camera, framing aid, self-check | Stacked section after lesson |
| History | Separate journal view with counts, row logs, lesson history | 2-column stats + history |

## Style tokens

The course follows the pink pixel-arcade identity from the workshop (`workshop.css`):

| Token | Color | Usage |
|---|---|---|
| Ink | `#2A0A1E` | Text, borders and header |
| Pink | `#FFD6E8` | Page background |
| Paper | `#FFF0F6` | Controls and supporting panels |
| Accent | `#E0307A` | Active lesson and navigation |
| Soft pink | `#FF8FC0` | Secondary controls |
| Gold | `#FFC23D` | Primary actions and step numbers |

Headings and labels use Press Start 2P, matching the workshop; longer course copy uses DM Sans for readability. Panels and controls use squared corners, dark borders and offset shadows. Video playback remains optional and retains the course's existing controls and tracking behavior.

## Tutorial playback

The tutorial is loaded from YouTube only after the learner opts in. Each lesson has a relevant segment, phase navigation and its own saved position. Playback remains separate from manual stitch counts and course completion.

## Interaction states

- Camera: off / asking permission / on / blocked / unavailable.
- Hand tracking: off / loading / active / cannot load. Never display *correct* solely from hand landmarks.
- Lesson: current / completed / earlier / next, all revisitable.
- Stitch count: increment / decrement / next row. Only user-confirmed counts are persisted.
- Session: active / paused / resumed. Camera powers off when paused or journal is open.

## Future design extensions

1. Add a camera position guide for top-down vs 45-degree framing.
2. Add semi-transparent hook insertion target on segmented yarn when measured confidence is adequate.
3. Build confidence-calibrated, temporal *action* feedback instead of frame-level yes/no labels.
4. Provide explanation cards with the observed evidence and an *I disagree* button, not just a verdict.
5. Add multiple projects, row and pattern schemas, count import/export, and optional sync.
