# Crochet Field Lab — Development Roadmap

| Priority | Focus | Deliverable / exit criterion | Prototype status |
|---|---|---|---|
| **P0 — Fundamental course** | Improve lesson clarity, mobile layout, guided 3D motion and self-checks | Beginners can finish slip knot → foundation chain → single crochet → first rows without AI | Started — eight steps, responsive layout, self-checks; illustrations are not physically accurate |
| **P1 — Progress & projects** | Better row/stitch correction, checkpoints, resumable project state, optional export | Users can leave mid-row and reliably recover their place | Partial — manual counts, undo, rows, pause/resume, journal; no named checkpoints or export |
| **P2 — Camera assistance** | Angle/framing guide; test hand, hook and yarn tracking | Useful framing guidance across phone/laptop cameras | Partial — camera preview and optional hand landmarks; no hook or yarn tracking |
| **P3 — Stitch recognition** | Label short videos; recognize foundation-chain phases; automate counting cautiously | Measure counting error, false corrections, latency on unseen users | Not started |
| **P4 — AI tutor** | Evidence-based mistake explanations, next-action hints, optional voice | Feedback improves learning versus static guidance in user testing | Not started |
| **P5 — Product exploration** | Pattern import, procedural 3D, custom projects, community content | Validate demand before building a broader pattern platform | Not started |

## Closest workstreams, in order

### 1. Make the stitch studio precise and controllable (P0)

“Precise” means correct loop topology, hook path, and phase timing — not photorealism.

- Define a declarative stitch model: loop IDs, hook path, contact points, and phase boundaries for each lesson.
- Drive the renderer from that model instead of per-scene drawing code.
- Add a phase timeline: scrub, play/pause, 0.25× and 0.5× speed, step backward/forward.
- Add front/top/side presets, active-loop highlighting, hook-path tracing, and tap/touch labels.
- Add isolate controls for yarn, hook, and the working loop.
- Keep Canvas 2D until the model abstraction and frame-time measurements justify WebGL or Three.js.
- Acceptance: every lesson has named phase stops; the 11-chain practice shows the correct loop count; controls work with touch and keyboard; reduced-motion still communicates each phase; 60 fps desktop and 30 fps phone targets.

### 2. Add a camera setup guide (P2)

This guide checks whether the camera can see the work. It must not claim the stitch is correct.

- Define a per-step camera recipe: top-down for foundation chain, 45° for single crochet, plus distance, hand count, and lighting.
- Draw a translucent target frame, hand zones, and hook-tip zone over the video.
- Match overlay coordinates to `object-fit: cover` video geometry.
- Time the hints after a short violation, not on every frame: show after roughly 500 ms, hide after the scene is stable, and enforce a cooldown.
- Show one action at a time, in priority order: both hands visible → hook tip visible → yarn path visible → angle → distance → lighting.
- Keep the guide opt-in, dismissible, and quiet. Offer mute and opacity controls.
- Support mirrored preview and left-handed framing.
- Acceptance: 3–5 first-time testers reach a usable frame without live coaching; no wording implies stitch correctness; the manual lesson path works with the guide off.

### 3. Prototype foundation-chain tracking (P3)

Track one bounded action first. Do not start with every stitch type.

- Define phases: loop on hook, yarn over, pull through, new loop formed. Count only completed, stable phases.
- Inputs: hand landmarks, hook-tip position, yarn/loop segmentation, and short temporal windows of roughly 1–2 seconds.
- Model: temporal classifier plus a finite-state machine or HMM for smoothing and invalid-transition rejection.
- Output a proposal: `countDelta`, confidence, and a short reason. Never write progress automatically.
- Ask for confirmation: “Saw 8 new chains — accept, correct, or ignore?” Provide undo.
- Label data with action phases, not just stitch names. Include negatives: wrong insertion point, dropped loop, tight stitch, occlusion.
- First dataset: 3–5 beginners, 2+ camera angles, 2 yarn colors, left and right hands, varied lighting.
- Provisional precision gates, to revise after the baseline benchmark:
  - phase F1 ≥ 0.80 on held-out clips;
  - count within ±1 stitch on at least 90% of 11-chain trials;
  - false-correction rate below 2%;
  - every count change remains user-confirmable.
- Stop conditions: if confidence is low, say “I can’t see clearly” and stop prompting. Manual counting remains the source of truth.

### 4. Prove efficiency and keep frustration low

- Inference at 10–15 fps, not every camera frame; crop to a region of interest around the hands.
- Downscale model input, use a quantized model, and prefer WebGPU with WASM fallback.
- Pause all inference when the tab is hidden, the session is paused, or the camera is off.
- Degrade overlay quality before dropping lesson controls.
- Instrument overlay update time, inference time, dropped frames, memory, count corrections, and dismissals.
- Test on a mid-tier phone and a laptop; report results per device tier.
- Target budgets: overlay update ≤ 100 ms, no long task over 50 ms from camera work, no sustained jank while scrolling or counting.
- Frustration budget: at most one visible hint at a time, no repeated hint for the same issue inside the cooldown, and no blocking modal for guidance.

## Guidance UX principles

1. **Guide, do not judge.** Framing help is deterministic. Stitch correctness waits for validated recognition.
2. **Manual first.** The learner can finish every lesson with the camera off and without AI.
3. **One message.** Show one short, actionable hint. Never stack warnings.
4. **Confidence is visible.** “Not sure” is a valid result; do not guess silently.
5. **Stability over speed.** Use hysteresis and cooldowns so overlays do not flicker or nag.
6. **Never auto-advance.** Recognition proposes; the learner confirms, corrects, or ignores.
7. **Explain briefly.** State the reason for a hint, for example “hook tip is outside the frame.”
8. **Allow disagreement.** Every automated suggestion has undo, dismiss, and “I disagree” paths.
9. **Quiet by default.** No sound, vibration, or repeated prompts unless the learner enables them.
10. **Test with real beginners.** Include left-handed users, phone tripods, cluttered backgrounds, and poor lighting.

## Next sprint checklist

1. Build the phase-based stitch model and timeline controls for chain and single crochet.
2. Ship the camera setup guide with one-hint-at-a-time UX.
3. Instrument overlay and inference performance before adding a model.
4. Collect consented foundation-chain clips and label the defined phases.
5. Run a small benchmark, then set final precision gates from measured results.

**Principle:** Make the course genuinely useful without AI. Add computer vision only when it is reliable and measurably helps learners.

## Related documents

- [Product specification](SPEC.md) — requirements and acceptance criteria
- [Architecture](ARCHITECTURE.md) — current runtime and proposed CV extension
- [README](../README.md) — setup, deployment, and limitations
