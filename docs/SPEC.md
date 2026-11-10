# Crochet Field Lab — Product Specification

## Goal
A beginner-friendly, mobile-first crochet learning website combining guided stitch illustrations, optional camera assistance, and resumable progress.

## Users & primary flow
**User:** Someone learning crochet with a phone or laptop and their own yarn/hook.

1. Pick a lesson → see **current step, next action, and progress**.
2. Rotate/zoom the illustrative stitch guide; open the linked video chapter if needed.
3. Optionally enable camera and hand-landmark overlay for framing.
4. Practice, manually confirm each stitch/row, and check off lessons.
5. Pause → return later to the same step and stitch counts.

## Functional requirements

| ID | Requirement | Version |
|---|---|---|
| F01 | Eight lessons: materials, slip knot, grip, yarn over, chain, single crochet, rows, fastening off | v1 |
| F02 | Step navigation, next-action prompt, self-check tips, video chapter links | v1 |
| F03 | Rotatable, zoomable **illustrative** yarn/hook model | v1 |
| F04 | Browser camera with front/back switch and optional hand-landmark overlay | v1 |
| F05 | Manual chain/stitch/row count, undo, lesson completion and journal | v1 |
| F06 | Automatic local save; pause and resume in the same browser | v1 |
| F07 | Camera-angle guidance and hook/yarn detection | Research |
| F08 | Automatic stitch counting and mistake feedback from video | Research |
| F09 | AI explanations, pattern import, and generated 3D lessons | Later |

## Acceptance criteria (v1)
- A beginner can complete the first course **without enabling the camera or AI**.
- A refresh retains the selected step, completed lessons, stitch counts, and journal in the same browser.
- Counting can be corrected; navigation and camera permissions fail gracefully.
- Layout works on laptop and mobile screen widths.
- The UI never labels stitches as *correct* based only on hand landmarks.

## Out of scope for v1
Photorealistic stitch simulation, automatic recognition, multi-device sync, user accounts, and cloud video storage.

## Related documents
- [README](../README.md) — setup, preview, deployment, privacy, and limitations
- [Architecture](ARCHITECTURE.md) — current runtime and proposed computer-vision extension
- [Roadmap](ROADMAP.md) — phases, status, and next sprint
- [Design system](../DESIGN_SYSTEM.md) — visual tokens and component vocabulary
- [Browser E2E evidence](tests/crochetfieldlab-2026-11/e2e-evidence.md) — captured UI and deployment checks
