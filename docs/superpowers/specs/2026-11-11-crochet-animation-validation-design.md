# Crochet Animation Validation Skill — Design Spec

**Status:** Draft for user review

## Goal

Add a project-local, reusable `crochet-animation-validation` skill that gives evidence-based acceptance decisions for beginner crochet animations. Install the upstream `threejs-animation` skill alongside it as a reference for future Three.js animation work, while validating the current Canvas 2D renderer on its own terms.

## Scope and installation

- Place skills under `.omp/skills/`, matching this repository's local skill convention.
- Install only `CloudAI-X/threejs-skills/skills/threejs-animation/SKILL.md` and its applicable MIT license notice. Treat its three.js r186/WebGL/WebGPU guidance as conditional reference; do not imply this app uses Three.js or migrate the renderer.
- Do not install/configure `microsoft/playwright-mcp` or `ahujasid/mcp-for-blender`. They are MCP servers, not skills. Use the existing browser automation capability and current app tests; no MCP config, Blender addon, or package dependency is in scope.
- The custom skill applies to crochet stitch animation and visual-guidance validation in this repository, not generic animation authoring.

## Validation contract

For every requested animation validation, report each criterion as **PASS**, **FAIL**, or **UNVERIFIED**, with a concrete evidence reference and the observed checkpoint/frame/state. A missing approved reference or unavailable inspection surface yields UNVERIFIED, never an inferred PASS. A defect that contradicts available evidence is FAIL.

| Criterion | PASS requires | Failure / unknown handling |
|---|---|---|
| Yarn continuity | Inspect adjacent keyframes and transitions; all visible strands remain continuous, with no unexplained break, detached loop, or strand identity switch. | Any unexplained discontinuity is FAIL; absent rendered evidence is UNVERIFIED. |
| Stitch structure | Compare the insertion point and front/behind crossing order against an approved stitch reference/checkpoint. | Wrong opening or over/under order is FAIL; no approved geometric reference is UNVERIFIED. |
| Hook interaction | Observe the hook capture the intended working yarn and carry it through the intended stitch/loop, not merely pass nearby. | Missed or wrong strand is FAIL; no inspectable sequence is UNVERIFIED. |
| Loop count | At each approved named checkpoint, compare visible loops on the hook to the approved expected count; check displayed DOM count against the image. | Any mismatch is FAIL; absent approved checkpoint/count is UNVERIFIED. |
| Playback state | Exercise pause, seek, replay, and speed changes; confirm the selected pose/checkpoint and learner progress/counters remain consistent and controls do not drift or skip state. | Any unintended state/counter mutation or wrong pose is FAIL; unexercised controls are UNVERIFIED. |
| Teaching clarity | At a paused checkpoint, a novice can identify the next action and target from the instruction/frame. | An observed novice unable to identify either is FAIL. Without a real novice observation, mark UNVERIFIED; agent inference is not a substitute. |

## Evidence procedure

1. Read the accepted stitch reference (lesson/spec/pattern) and identify the expected insertion opening, crossing order, loop count checkpoints, and intended hook/yarn roles. If it is missing or ambiguous, stop the affected checks at UNVERIFIED and request that reference.
2. Use structural motion tests for keyframe validity/continuity and real browser rendering for visual claims. Inspect the transition and settled frame for every named checkpoint, with a front view plus any angle needed to resolve depth. Use screenshots or direct browser evidence where available; record tool limitations honestly.
3. Exercise playback controls at fixed checkpoints. Compare the visible pose, DOM checkpoint/count, and saved learner state before and after; playback must not count stitches or change journal/progress state.
4. For teaching clarity, observe a beginner using the paused frame without coaching. Record the participant's identified action and target without collecting unnecessary personal data. If no session is run, report UNVERIFIED and propose that human acceptance activity separately.
5. Deliver a six-row result table containing criterion, status, checkpoint, evidence, and defect/limitation. No overall PASS if any criterion is FAIL or UNVERIFIED.

## Skill authoring and verification

Use skill-writing TDD: before writing the skill, run at least three realistic, multi-pressure scenarios without it and record the agents' actual shortcuts/rationalizations verbatim. Then write the smallest skill that prevents those specific failures, rerun the scenarios with the skill loaded, and document any new loopholes and retests. Require criterion-by-criterion reporting, no unsupported PASS, and honest UNVERIFIED status for unavailable visual or novice evidence. Do not write the skill before baseline scenarios.

## Out of scope

No renderer rewrite, Three.js migration, Blender scene pipeline, Playwright MCP installation, auto-counting, computer-vision judgment, screenshot baseline suite, or new product behavior. These can be reconsidered only if later validation demonstrates a concrete need.

## Acceptance

- Both project-local skill directories are discoverable under `.omp/skills/`; upstream source attribution and license are retained.
- Custom skill contains all six criteria, pass/fail/unverified rules, required evidence/checkpoint reporting, and the novice-observation limit.
- Pre-skill pressure results and post-skill compliance verification are recorded; no unsupported claim of visual or beginner validation is allowed.
- Existing repository tests remain green; no runtime behavior, dependencies, or MCP settings change.
