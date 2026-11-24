# Crochet Field Lab — Architecture

## v1: static browser app served by Cloudflare Workers

```text
index.html + styles.css + app.js + course-video.js + webmcp.js
   ├─→ lesson state ──────────────────────────→ localStorage
   ├─→ opt-in YouTube player + independent lesson positions
   ├─→ camera + optional MediaPipe overlay
   └─→ document.modelContext ─────────────────→ browser-agent tools

scripts/build-static.mjs ──→ dist/
wrangler.toml ────────────→ Cloudflare Worker (static assets)
```

**Current implementation:** `index.html` (UI), `styles.css` (design and responsive layout), `app.js` (curriculum, camera, controls, progress), `course-video.js` (opt-in YouTube playback and lesson positions), and `webmcp.js` (optional agent tools). `scripts/build-static.mjs` copies the browser files into `dist/`, and `wrangler.toml` serves that directory from a static-assets-only Worker. The Worker runs no application backend.

**Deployment:** Cloudflare Workers Builds deploys the `cf-pages` branch with `npm run build` and `npx wrangler deploy`. `main` does not trigger production builds. `npm run deploy` publishes directly from an authenticated local environment.

**Data stored locally:** Current lesson, completed lessons, stitch/row totals, activity events, paused state, and separately saved video positions. Progress does **not** sync across devices. Camera frames are not recorded or uploaded by the app. YouTube loads only on request; optional MediaPipe assets load from external hosts.

**WebMCP:** Eight tools expose progress, lesson navigation, counting, row turns, completion, the journal, and self-checks. A native `document.modelContext` is used when present; `vendor/webmcp-polyfill.js` supplies the API otherwise. No tool can start the camera or read video.

## Tutorial playback

`course-video.js` owns the lesson segments, opt-in YouTube player, phase navigation and video-position storage. `app.js` notifies it of lesson changes and pauses it when leaving the learning view; counting and rendering do not reopen the player. Playback never changes course progress.

Native player controls can seek outside a segment. While playing, the controller samples position every 250 ms and pauses at the nearest boundary when a position outside the segment is observed; this is not sample-accurate clipping. Video positions are stored separately by stable lesson ID, and a new page requires explicit consent again.

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
