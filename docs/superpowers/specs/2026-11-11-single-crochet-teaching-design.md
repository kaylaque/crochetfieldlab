# Single-crochet teaching improvement

## Goal

Help an absolute beginner complete one US single crochet, check the number of loops on the hook, and recover from common mistakes using the page. Preserve the eight-lesson structure, visual identity, manual counting, tutorial attribution, and clear statement that camera assistance does not verify stitches.

The existing lesson compresses several actions into one paragraph and uses a static, unlabeled illustration. A locally reproduced bug leaves the tip requested in lesson 6 visible after navigating to lessons 7 and 8: `selfCheck()` writes to a shared feedback element, while lesson changes do not clear it.

## Scope

Deliver an animated lesson-6 teaching sequence, contextual guidance and troubleshooting, stale-help correction, clearer outcome copy, camera/tutorial layout changes, and accessibility improvements. Do not add camera recognition, automatic counting, dependencies, or an all-scene renderer rewrite. The animation remains illustrative rather than a physics simulation.

## Single-crochet sequence

Add a validated `SINGLE_MOTION` to `stitch-motion.js` and route lesson 6 through the existing animated renderer, sampler, mirroring, phase controls, and reduced-motion behavior. Retain the current `tail`, `working`, and `active` path contract; the active path represents the yarn on the hook, including the two-loop midpoint. All corresponding paths have equal point counts across adjacent keyframes, with six connected keyframes for five phases.

| Phase | Instruction | Loop count at settled end |
|---|---|---:|
| Insert | Insert the hook into the second chain V from the hook. | 1 |
| Yarn over | Bring the working yarn over the hook. | 1 |
| Pull up a loop | Draw the yarn through the chain. | 2 |
| Yarn over again | Bring the working yarn over the hook again. | 2 |
| Pull through both | Draw the yarn through both loops on the hook. | 1 |

The animation must depict the named action and its settled end pose, not merely change a label. In particular, the insertion marker identifies the same second V that the hook enters, two distinguishable loops are visible at the midpoint, and one remains after the final pull-through. Use an illustrative foundation chain independent of the learner's stored chain count. The manual `+ Stitch` action remains the only way to increment the single-crochet counter; playback, seeking, phase navigation, and handedness never update counts, completion, journal entries, or storage.

## Guides and accessibility

For lesson 6, add phase-appropriate visual guides after the animated scene is rendered: highlight the insertion V, show movement arrows, and label the working yarn, loop on hook, and second V when relevant. Project model-space guide anchors using the existing viewer projection; reflect anchor x coordinates and arrow direction for left-handed mode. Guide placement must remain legible at the front, top, and side presets and at supported zoom levels; avoid claiming pixel-perfect depth or physical simulation.

Expose the current action and expected settled-end loop count as DOM text alongside the phase controls, not solely in the canvas. Make phase selection and all troubleshooting choices keyboard-operable. Reduced-motion users start paused at the first phase and can step or seek to every settled pose.

## Help and recovery

Clear transient self-check feedback when the selected lesson actually changes, including navigation through the lesson rail and next/previous controls. Returning from the journal to the same lesson retains its current feedback; selecting the already-active lesson does not erase it. Keep the existing general-tip behavior for other lessons.

Provide lesson-6-specific choices with actionable recovery guidance:

- **Too tight:** loosen the working loop until the hook can slide freely; avoid pulling the working yarn tight after each movement.
- **Cannot find the next stitch:** identify the next chain V; the loop on the hook is not a chain stitch.
- **Extra stitch:** stop, recount the row, and carefully undo the unintended stitch before continuing.
- **Dropped loop:** stop pulling, reinsert the hook through the dropped loop, and restore it before continuing.

Present advice as user-directed guidance, not a claim that the app has detected a mistake. Correct the lesson-6 hint to: “The loop on your hook does not count as a chain stitch.”

## Outcome and layout

At entry, identify the intended outcome as “Make your first 10-stitch crochet swatch,” list yarn and a suitable hook, and present approximately 20 minutes as an estimate, not a guarantee. Keep the warm visual identity and the tutorial's attribution.

Place the existing lesson-specific tutorial link beside the current instruction. When the optional camera is inactive, collapse its panel and allow the lesson content to reclaim the desktop grid column; retain an accessible, clearly labeled camera opt-in. Keep self-check, troubleshooting, and tutorial access available when the camera is collapsed. Starting and stopping the camera must preserve the existing consent, privacy, and hand-detection limitations, and stopping or collapsing it must not silently activate tracking. Reflow the same controls on mobile without horizontal page overflow.

Give the reset control the accessible name “Reset 3D view.” Increase supporting-text size and contrast to a legible minimum and WCAG AA contrast for its text size and background, without relying on color alone to distinguish guide states.

## Verification and acceptance

- Add behavior-focused coverage for lesson-change feedback clearing and retaining feedback on a journal round trip without changing lessons.
- Validate five named phases, connected keyframes, finite coordinates, equal corresponding path lengths, and the 1/1/2/2/1 settled-end teaching labels.
- Exercise playback, phase stepping, seeking, mirroring, troubleshooting, and reduced motion without changing counters or stored progress.
- Inspect the actual rendered lesson at each settled phase, front/top/side presets, both handedness settings, and supported zoom extremes; confirm the target V, arrows, loop count, and hook/yarn crossings remain understandable. Record any angle where the model cannot communicate the action rather than claiming universal correctness.
- Inspect desktop and mobile layout, camera collapse/opt-in, tutorial link placement, keyboard navigation, accessible names, and contrast; verify no browser errors.
- Run the existing full test command. Test the reported stale-tip transition before and after the fix.
- Conduct an observed session with 3–5 beginners as a separate human acceptance activity. Ask participants to complete one single crochet, identify an intentional mistake, and recover using only the page; do not claim usability success before observing it.

## Delivery boundaries

The existing renderer and motion modules remain the source of the animated scenes; no new geometry framework, dependency, or generic depth sorter is introduced. Update the design documentation and existing contract tests to reflect actual behavior. This specification requires review and approval before an implementation plan is written.
