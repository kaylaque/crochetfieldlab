# Video playback for every course lesson

## Purpose

A beginner with no crochet experience can watch, pause, and repeat the relevant part of a real-hand tutorial for each of the eight main-course lessons. A learner using the lab as a journey tracker can return to a lesson without losing their video position. Build on current `main`; the older playback branch is inspiration, not a replacement.

## Learner experience

Embed the existing [beginner tutorial](https://www.youtube.com/watch?v=aAxGTnVNJiE) in the main-course lesson view. Each lesson opens at its relevant point in the video. Provide play and pause, seeking, previous and next instructional phase, and restart; phase labels explain unfamiliar terms in beginner-friendly language. The existing course navigation continues to move between lessons. Preserve the existing illustrated stitch viewer as a complementary aid, including its current controls and behavior; this project does not require new illustrations or animations.

The eight lessons cover materials, slip knot, grip, chain motion, foundation chain, single crochet, rows, and finishing. The README documents six broad chapter timestamps, not a complete eight-lesson transcript. Before implementation, inspect the actual tutorial and record verified start, end, and instructional phase timestamps for each lesson. Reuse a relevant segment where lessons overlap. Do not invent timestamps or imply that a technique appears in the video unless verified. Keep lessons useful through their existing written instructions even if the tutorial does not cover a particular action.

Playback starts paused on entry, including when restoring a saved position. Previous and next phase navigate within the lesson's verified segment; restart returns to its beginning. Seeking and end-of-segment behavior must not silently mark a lesson complete or advance the course. Follow reduced-motion preferences and provide keyboard-accessible controls and an accessible player title. Do not copy or rehost the video.

If the player cannot load or embedding is unavailable, show an actionable direct link to the relevant tutorial chapter. Existing instructions, illustrations, and manual tracking remain usable without YouTube. Loading the embed contacts YouTube; explain this clearly before the player loads and allow the learner to choose whether to load it.

## Architecture and state

Add a lesson-to-video mapping to the existing course data: stable lesson identifier, verified segment bounds, and verified phase timestamps and labels. Use the YouTube embedded player API to control playback and seek to those positions. Manage player readiness and errors explicitly: do not offer functioning-looking custom playback controls until the player is ready; provide the direct chapter link on failure. Clean up or reuse the player safely across lesson changes. Preserve the existing stitch-motion and renderer implementations.

Store video position separately for each lesson in browser local storage, using stable lesson identifiers. Save on meaningful changes, including pausing, seeking, phase navigation, lesson changes, and page hiding, without writing on every animation frame. Treat absent, invalid, and out-of-segment values as the lesson start. Restore the saved position paused. Playback remains usable if storage is unavailable; indicate that the position could not be saved. Storage is local to the browser profile, not synced across devices.

Playback must not change lesson completion, stitch or row counts, journal entries, or existing course progress. Manual course actions continue to own those values. Existing saved course data must remain readable; do not erase or reset it.

## Testing and acceptance

- Inspect the tutorial and document evidence for every lesson segment and phase timestamp. Exercise all eight lessons in a real browser, checking that each selection seeks to the intended action.
- Verify player readiness, play/pause, seeking, phase navigation, restart, segment boundaries, lesson switching, and direct-link fallback on player failure. Confirm the user is informed before the embed contacts YouTube.
- Verify per-lesson positions survive reload and navigation, reopen paused, and handle invalid data and unavailable storage. Confirm playback never alters completion, counts, rows, or journal entries; existing manual controls and saved progress remain intact.
- Exercise keyboard access, reduced motion, responsive layout, and existing illustrated viewer controls. Inspect desktop and narrow viewports.
- Run the existing relevant smoke tests and static build. Update course documentation to describe video playback, third-party requests, and limitations.

## Out of scope

New animated illustrations for every lesson, automatic stitch recognition or counting, camera-based correctness judgments, cross-device synchronization, hosting tutorial footage, and changes to the separate workshop page.
