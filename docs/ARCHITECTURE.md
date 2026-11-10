# Crochet Field Lab — Architecture

## v1: static browser app served by Cloudflare Workers

```text
index.html + styles.css + app.js + stitch-motion.js + stitch-renderer.js + webmcp.js
   ├─→ lesson state ──────────────────────────→ localStorage
   ├─→ canvas stitch viewer + camera + optional MediaPipe overlay
   ├─→ stitch-motion.js poses ──→ stitch-renderer.js ──→ Canvas 2D
   └─→ document.modelContext ─────────────────→ browser-agent tools

scripts/build-static.mjs ──→ dist/
wrangler.toml ────────────→ Cloudflare Worker (static assets)
```

**Current implementation:** `index.html` (UI), `styles.css` (design and responsive layout), `app.js` (curriculum, lesson-local playback, canvas-based 3D-coordinate illustration, camera, controls, persistence), `stitch-motion.js` (keyframed knot/chain poses), `stitch-renderer.js` (depth-ordered Canvas drawing for the animated scenes), and `webmcp.js` (optional agent tools). `scripts/build-static.mjs` copies the browser files into `dist/`, and `wrangler.toml` serves that directory from a static-assets-only Worker. The Worker runs no application backend.

**Deployment:** Cloudflare Workers Builds deploys the `cf-pages` branch with `npm run build` and `npx wrangler deploy`. `main` does not trigger production builds. `npm run deploy` publishes directly from an authenticated local environment.

**Data stored locally:** Current lesson, completed lessons, stitch/row totals, activity events, and paused state. Progress does **not** sync across devices. Camera frames are not recorded or uploaded by the app. Optional MediaPipe assets load from external hosts.

**WebMCP:** Eight tools expose progress, lesson navigation, counting, row turns, completion, the journal, and self-checks. A native `document.modelContext` is used when present; `vendor/webmcp-polyfill.js` supplies the API otherwise. No tool can start the camera or read video.

## Guided stitch motion (shipped, lessons 2, 4, 5)

Two browser globals extend the viewer without a framework, build step, or new dependency. `index.html` loads them in order before `app.js`, so the animated lessons never run without their model and renderer.

- **`stitch-motion.js` → `window.StitchMotion`** — `{KNOT_MOTION, CHAIN_MOTION, sampleMotion, mirrorPose, phaseAt}`. The file is a pure data-and-math module: keyframed poses of `tail`, `working`, and `active` paths plus a hook transform, sampled by time. Loading it also validates that every motion has one more keyframe than labeled phases and equal point counts, so a malformed pose fails loudly instead of drawing broken geometry. It touches no DOM, no timer, no storage, and no lesson state.
- **`stitch-renderer.js` → `window.StitchRenderer`** — `{render(ctx, options)}`. `render` draws the pastel stage, completed chain Vs, the sampled strands in declared back-to-front order, the hook, the `ILLUSTRATIVE 3D` badge, and the `Last 11 of N counted` label. It returns `{phaseIndex, visibleCompletedVs}`. It reads only its options object; it never touches counters, the journal, or `localStorage`.

**One-way data flow.** The lesson, playhead, speed, angle, handedness, and manual chain count live in `app.js` and are passed down as a plain options object:

```text
lesson step (2 / 4 / 5) + playhead ms + yaw/pitch/zoom + mirror + manual chain count
        │  app.js
        ▼
StitchMotion.sampleMotion(motion, playhead)  →  pose (or mirrorPose(pose))
        ▼
StitchRenderer.render(ctx, options)          →  Canvas 2D pixels
```

Nothing flows back: the renderer cannot advance the playhead, change a count, or write storage. Playback, scrubbing, angle changes, and handedness changes are viewer-local and are never persisted; only explicit lesson navigation and manual counting write to `localStorage`. The five non-animated lessons keep their original per-scene drawing path and render no playback controls.

## Proposed computer-vision extension (not implemented)

```text
Camera video
   ├─→ Hand landmarks (MediaPipe)
   └─→ Hook, yarn & loop detection/segmentation
                  ↓
       Temporal stitch-phase recognition
                  ↓
       State machine + confidence threshold
                  ↓
       Verified count / correction / "Not sure"
                  ↓
             Progress journal
```

**First recognition target:** Foundation-chain completion, not all stitch types. Preserve manual confirmation whenever confidence is low. A future optional VLM can explain uncertain frames, but must not substitute for validated motion recognition.

**Validation:** Test on unseen beginners, left/right hands, camera angles, yarn colors, hook sizes and lighting; report counting error, false corrections, latency and user override rate.

**Design sources:** [ESP32 Field Lab](https://ardchain.github.io/esp32-field-lab/) (guided UX), [Garis Tepi Cangkang](https://bsw.kadcom.dev/trik/garis-tepi-cangkang/) (outlined 3D styling), [beginner tutorial](https://youtu.be/aAxGTnVNJiE) (lesson sequence), [CrochetPARADE](https://crochetparade.org/) (possible future geometry workflow).

## Related documents

- [Product specification](SPEC.md) — requirements, acceptance criteria, and scope
- [Roadmap](ROADMAP.md) — phases, exit criteria, and next sprint
- [README](../README.md) — setup, preview, deployment, and limitations
