---
name: crochet-animation-validation
description: Use when reviewing crochet stitch motion, yarn/hook animation, stitch-guidance, loop-count checkpoints, or playback-state validation.
---

# Crochet animation validation

Validate the rendered lesson against `docs/superpowers/specs/2026-11-11-single-crochet-teaching-design.md` before judging visuals. Its single-crochet settled-end loop counts are Insert 1, Yarn over 1, Pull up a loop 2, Yarn over again 2, Pull through both 1. If that reference or a relevant checkpoint is unavailable or ambiguous, mark affected checks UNVERIFIED; do not infer expected behavior.

## Inspection

- Inspect the relevant motion data and adjacent keyframes/transitions for structure, then use the running page to capture actual browser frames at the relevant settled poses and transitions. Code, tests, arrays, labels, and screenshots without a clear checkpoint do not establish visible behavior.
- For Yarn continuity, inspect yarn paths across adjacent keyframes and rendered transitions. For Stitch structure, verify the intended insertion location, that the stitch action is depicted, and that the rendered yarn/hook over-under crossing order matches the approved reference; absent or ambiguous crossing evidence in the reference means UNVERIFIED, while an observed frame/reference mismatch means FAIL. For Hook interaction, inspect rendered hook/yarn catch, carry, and contact. Structural evidence alone cannot PASS these visual claims; without browser frames, mark them UNVERIFIED.
- At every loop-count checkpoint, compare the visible paused-frame count with both the approved phase count and the DOM count at that same checkpoint. Any disagreement is FAIL; do not waive it. Record frame/phase and the three observations.
- Exercise Playback state: pause, seek, replay, and change speed. Confirm the same target pose is reached consistently and compare learner progress/storage before and after; any mutation caused by playback controls is FAIL. Unexercised behavior is UNVERIFIED.
- Teaching clarity requires observing a real novice use the lesson to understand and perform the action. Without participant evidence, mark UNVERIFIED; copy quality, agent opinion, or proxy scores are not evidence.

Use only evidence actually inspected. Separate structural evidence from rendered evidence; state limitations explicitly. Mark PASS only when the criterion is demonstrated, FAIL for an observed contradiction/defect, and UNVERIFIED when required evidence is missing. Do not convert missing evidence into FAIL unless an actual defect is observed.

## Report

Return exactly six criterion rows, using these labels and statuses:

| Criterion | Status | Checkpoint/frame | Evidence | Defect/limitation |
|---|---|---|---|---|
| Yarn continuity | PASS / FAIL / UNVERIFIED | | | |
| Stitch structure | PASS / FAIL / UNVERIFIED | | | |
| Hook interaction | PASS / FAIL / UNVERIFIED | | | |
| Loop count | PASS / FAIL / UNVERIFIED | | | |
| Playback state | PASS / FAIL / UNVERIFIED | | | |
| Teaching clarity | PASS / FAIL / UNVERIFIED | | | |

Do not report an overall PASS if any row is FAIL or UNVERIFIED.
