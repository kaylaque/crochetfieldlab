# Crochet Field Lab — Architecture

## v1: static browser app served by Cloudflare Workers

```text
index.html + styles.css + app.js + webmcp.js
   ├─→ lesson state ──────────────────────────→ localStorage
   ├─→ canvas stitch viewer + camera + optional MediaPipe overlay
   └─→ document.modelContext ─────────────────→ browser-agent tools

scripts/build-static.mjs ──→ dist/
wrangler.toml ────────────→ Cloudflare Worker (static assets)
```

**Current implementation:** `index.html` (UI), `styles.css` (design and responsive layout), `app.js` (curriculum, canvas-based 3D-coordinate illustration, camera, controls, persistence), and `webmcp.js` (optional agent tools). `scripts/build-static.mjs` copies the browser files into `dist/`, and `wrangler.toml` serves that directory from a static-assets-only Worker. The Worker runs no application backend.

**Deployment:** Cloudflare Workers Builds deploys the `cf-pages` branch with `npm run build` and `npx wrangler deploy`. `main` does not trigger production builds. `npm run deploy` publishes directly from an authenticated local environment.

**Data stored locally:** Current lesson, completed lessons, stitch/row totals, activity events, and paused state. Progress does **not** sync across devices. Camera frames are not recorded or uploaded by the app. Optional MediaPipe assets load from external hosts.

**WebMCP:** Eight tools expose progress, lesson navigation, counting, row turns, completion, the journal, and self-checks. A native `document.modelContext` is used when present; `vendor/webmcp-polyfill.js` supplies the API otherwise. No tool can start the camera or read video.

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
