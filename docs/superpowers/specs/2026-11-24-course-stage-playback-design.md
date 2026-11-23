# Playback for every course lesson

## Purpose

A beginner with no crochet experience can follow, pause, and repeat each action in all eight main-course lessons. A learner using the lab as a journey tracker can return to each demonstration without losing their place. This builds on the current `main` course and its existing knot-and-chain playback, not on the older branch as a replacement.

## Experience

Each lesson provides a distinct, meaningful illustrated sequence and beginner-friendly phase labels. The existing viewer supplies play/pause, a scrubber, previous and next phase, playback speed, viewing angle, and handedness controls. Navigation stays within the current lesson; the existing course controls navigate between lessons. Restart returns the demonstration to its beginning without changing course progress.

The sequences cover:

1. Materials: identify the hook, yarn, scissors, and needle and prepare a working space.
2. Slip knot: form a loop, pull through a bight, place it on the hook, and adjust it.
3. Grip: position hook and yarn in the hands and show relaxed tension.
4. Chain motion: yarn over, turn the hook, and pull through the existing loop.
5. Foundation chain: repeat the chain movement and show how to identify completed V shapes without counting the loop on the hook.
6. Single crochet: insert into the second chain, yarn over, pull up a loop, yarn over, and pull through both loops.
7. Rows: work across, chain one, turn, and start the next row.
8. Finish: leave a tail, fasten off, and weave the tail through the fabric.

Use simple language and explain unfamiliar terms in concise phase guidance. The sequences are original instructional illustrations, not physically exact simulations or proof that a learner performed a stitch correctly. Right- and left-handed views should remain understandable for each sequence. Reduced-motion preferences start playback paused, with all phases still reachable manually.

The existing external beginner tutorial remains an optional real-hand reference. Link to the relevant available chapter timestamps already documented in the README; do not copy or rehost its footage. The eight lessons are an app curriculum rather than a transcript, so reuse a relevant chapter when there is no separate timestamp. The course remains usable if the external video is unavailable.

## Architecture and state

Extend the existing lesson manifest, `stitch-motion.js` pose sampling, and `stitch-renderer.js` rendering instead of introducing a second playback engine. Define phase labels and visual poses for each lesson, preserving the established timeline controls and rendering conventions. Each phase must have a visually meaningful pose or transition; static repeated frames with different labels do not satisfy this design. Keep the model explanatory rather than promising physical accuracy.

Store normalized playback position separately for each lesson in browser local storage, using stable lesson identifiers and defaulting missing or invalid positions to the start. Restore a lesson's saved position paused when entering it or reloading; a new lesson likewise starts paused. User-initiated play starts from the restored position. Record positions on meaningful changes such as scrubbing, phase stepping, pausing, leaving a lesson, and page hiding; avoid writing on every animation frame. Playback remains usable if storage is unavailable, and the interface reports that the position could not be saved.

Playback state must not change lesson completion, stitch or row counts, journal entries, or existing progress. Manual course actions continue to own those values. Existing saved course data must remain readable; no migration should erase or reset it. Playback state is local to the same browser profile, not synced across devices.

## Testing and acceptance

- Exercise all eight lessons: play and pause, move both directions through phases, scrub, change speed, restart, and switch lessons. Confirm that phase labels and visible illustrations correspond to the described actions.
- Verify per-lesson positions survive reload and navigation, reopen paused, and fall back safely for missing or invalid saved values. Verify an unavailable storage path leaves playback usable and reports the failure.
- Verify playback controls do not change counts, completed lessons, rows, or journal events; existing manual controls still work and prior saved progress remains intact.
- Exercise keyboard controls, reduced motion, handedness, viewing angles, and responsive layout. Inspect each demonstration in a browser, including a narrow viewport.
- Run the existing focused motion, renderer, and course smoke tests plus the static build. Update course documentation to describe the new behavior and its limitations.

## Out of scope

Automatic stitch recognition or counting, camera-based correctness judgments, cross-device synchronization, hosting tutorial footage, and changes to the separate workshop page.
