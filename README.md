# Crochet Field Lab — browser-based crochet guide (prototype v1)

A responsive, single-page beginner course based on the *topics and chapter links* in [simplydaisy's introductory crochet lesson](https://www.youtube.com/watch?v=aAxGTnVNJiE). No video footage, graphics, or source code from the reference websites is copied or rehosted.

## What runs now

- Eight guided steps: materials → slip knot → holding hook/yarn → yarn over → 11 foundation chains → single crochet → rows → fastening off.
- A rotatable, zoomable 3D-coordinate stitch illustration for each step. **Illustrative only**, not a physically accurate crochet simulation or 3D model generated from the camera.
- On-device browser camera with front/back switch; requires HTTPS or localhost on modern browsers.
- *Optional* MediaPipe Hand Landmarker overlay activated by the user. The model runs in the browser, uses up to two hands, and reports whether hands are in frame. Model and WebAssembly assets are fetched from an external CDN when activated. **No automatic stitch counting, correctness detection, hook position detection, or yarn tracking.** No camera upload or recording in this app.
- Manual chain/single crochet counters, row number and next-row control, undo counts, lesson check-offs, self-check and tips, activity journal.
- Optional WebMCP tool layer: eight page tools that let a browser agent read progress, open lessons, adjust counted stitches, finish rows, complete lessons, open the journal, and record a self-check. Tool calls reuse the same state functions as the buttons, so the visible UI updates immediately. (See [Optional WebMCP tools](#optional-webmcp-tools).)
- Pause, resume and automatic persistence via `localStorage` in the **same browser/profile**. No sync between devices and not recoverable after local data is cleared.
- Responsive layout, keyboard controls for 3D view (left/right), reduced-motion preference, chapter-level links to the source tutorial.

## Files

- `index.html` — semantic layout
- `styles.css` — design tokens, responsive UI; Google Fonts are optional
- `app.js` — lesson content, progress, projection renderer, camera and optional hand detection
- `webmcp.js` — optional WebMCP tool definitions built on the same app actions
- `vendor/webmcp-polyfill.js` — vendored W3C WebMCP polyfill 0.1.0 (Apache-2.0; license beside it)

No build tooling or server application required.

## Preview

Run a local static server from the directory:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`. For camera access from a phone, deploy to HTTPS first; a plain `http://<LAN-IP>` page may be refused by the browser.

## Optional WebMCP tools

The page registers eight tools through `document.modelContext` from the [WebMCP draft](https://webmachinelearning.github.io/webmcp/). Where the browser already provides native WebMCP, registration goes to that native context. Elsewhere, `vendor/webmcp-polyfill.js` (the W3C [`@w3c/webmcp-polyfill@0.1.0`](https://github.com/w3c-oss/webmcp-polyfill), Apache-2.0) installs the API for in-page agents and same-origin frames. A browser-integrated agent still needs native support; the polyfill cannot add it.

WebMCP is a Community Group draft, not a W3C Standard. Both the draft and the polyfill can change.

| Tool | Access | Effect |
|---|---|---|
| `get-crochet-progress` | read-only | Current lesson, counter, totals, completion, recent journal entries |
| `list-crochet-lessons` | read-only | All eight lessons with 1-based numbers, phases, and targets |
| `open-crochet-lesson` | write | Switches lesson and returns to the learning view |
| `adjust-stitch-count` | write | Adds/removes foundation chains (lesson 5) or single crochet (lessons 6–7) |
| `finish-crochet-row` | write | Ends the current single-crochet row and starts the next |
| `complete-crochet-lesson` | write | Marks the lesson done and advances; last lesson opens the journal |
| `open-crochet-journal` | write | Shows totals and the activity log |
| `self-check-crochet-stitch` | write | Records the learner's "looks good" or "need a tip" choice and returns coaching text |

Every tool reuses the button handlers, so the visible UI and `localStorage` stay in sync. Tools reject calls while the session is paused or while the journal view is open (except the two read-only tools, which always answer), and `adjust-stitch-count` refuses a stitch type the current lesson does not count. `self-check-crochet-stitch` records the learner's claim; it does not inspect stitches or verify correctness. No tool turns the camera on or reads video.

The vendored polyfill is the package's standalone `dist/polyfill.js`. Replace that one file to update it, keeping `vendor/webmcp-polyfill.LICENSE` in sync.

## Publish to GitHub Pages

This is a **standalone prototype**, not a direct edit of the reference site's repository. The requested ESP32 and design-reference pages were not retrievable from this environment, so this is a design interpretation rather than an extraction of their exact code or tokens.

Option A — new Pages repository: put these three root files in a repository, configure **Settings → Pages → Deploy from branch** (`main` / root), then visit the Pages URL.

Option B — add as a route under a site you control: copy `index.html`, `styles.css`, `app.js` into a `crochet/` folder in your existing site and link to `/crochet/` (or `<site-base>/crochet/` if the project site has a path prefix). **Do not overwrite the existing ESP32 site.**

## Scope and architecture

```
Camera (getUserMedia) ───────► video panel
              └─ opt-in hand landmarker (MediaPipe) ► hand landmark overlay

Lesson manifest ─────► chapter-linked tutorial + illustrative 3D viewport
          └──────► next actions + manual self-check
Manual counter ─────► localStorage ◄──── lesson navigation / pause
                                └──────► history + resume

Browser agent ─────► document.modelContext ► webmcp.js ──► same actions + UI
```

### For a real computer-vision stitch tutor (future work)

1. Collect consented, labeled multi-angle user clips. Class definitions should describe *action phase*, not just stitch name: hook insert → yarn over → pull up loop → yarn over → pull through two, with negatives (wrong insertion point, dropped loop, stitch too tight, hand occlusion).
2. Add yarn/hook detection and tracking (segmentation + tool tip pose), alongside the hand landmarks. Hands alone cannot identify a correct stitch.
3. Add short-video phase classification and temporal smoothing: a finite-state action recognizer with uncertainty and an explicit *not sure* output. A low-confidence result must never silently advance a learner.
4. Evaluate on unseen learners, yarn colors, hook styles, camera angles, handedness, and lighting. Report phase F1, false-correction rate, manual override rate, latency, and on-device performance.
5. Add opt-in still-image/VLM feedback for confusing steps, with disclosure and retention controls if cloud processing is used. Keep the manual path always available.

Source chapter timestamps:
`00:23` materials, `00:53` slip knot, `01:15` holding hook, `01:52` chain, `03:35` single crochet, `07:02` weave in ends. Substeps and the 11-chain practice are an **app curriculum**, not a transcript of the video.

US terminology: `ch` = chain, `sc` = single crochet. A *slip knot* is not a *slip stitch*. Double crochet (`dc`) is beyond the first course.

## Privacy and limitations

- Video is displayed locally by the browser's camera API. The app does not send frames to a server.
- Enabling optional hand tracking fetches JavaScript, WebAssembly and model weights from external hosts (jsDelivr / Google Storage). Browser privacy practices still apply to those resource requests.
- Progress is stored only locally and is subject to browser storage policies, deletion, private browsing, and device changes.
- The WebMCP tools expose lesson progress, stitch counts, and journal entries to the agent the browser provides. They do not expose video, camera controls, or anything from `getUserMedia`, and they make no network requests.
- A person can manually mark a lesson completed without mastering it; the interface deliberately avoids presenting an unsupported AI correctness score.
- The visuals are original procedural illustrations, not a copy of CrochetPARADE or the linked web design references.
