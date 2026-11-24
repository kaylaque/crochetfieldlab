# Course Video Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional, lesson-specific YouTube playback with phase navigation and independently persisted positions to all eight course lessons.

**Architecture:** Replace the illustrated viewer with a video-playback module alongside the existing course application. It owns the YouTube player, lesson segment mapping, and independent storage; `app.js` informs it of course navigation without changing tracking.

**Tech Stack:** Vanilla browser JavaScript, YouTube IFrame Player API, HTML/CSS, localStorage, existing Node smoke harness.

**Spec:** `docs/superpowers/specs/2026-11-24-course-stage-playback-design.md`

## Global Constraints

- Use the existing tutorial `aAxGTnVNJiE`; do not copy or rehost it.
- Ask the learner to load the YouTube player before any YouTube request; disclose the third-party request.
- The player starts paused; playback does not change course progress, stitch counts, rows, or journal.
- Remove the superseded illustrated viewer and its unused code; preserve saved course state. Support keyboard access, reduced motion, and mobile.
- Verify actual tutorial content before defining segment and phase timestamps; do not guess.

## Review Focus

1. Embedded video disabled, blocked, or script never ready: retain a usable direct chapter link and manual course.
2. A lesson changes while player initialization is pending: stale callbacks cannot load or save the previous lesson into the new one.
3. Storage contains invalid, stale, or out-of-range positions or throws: begin at the lesson start, preserve controls, and show an unsaved notice on write failure.
4. Scrubbing outside the lesson, seeking to the end, or entering the journal: pause at the segment boundary and never complete a lesson or change counts.
5. Long uninterrupted playback followed by page hiding: save the latest observed position and restore it paused without writing on every frame.

## File map

- Create `course-video.js`: verified segments, consent-gated player lifecycle, playback navigation, independent storage.
- Modify `index.html` and `styles.css`: accessible video section, controls, consent disclosure, fallback link, responsive layout.
- Modify `app.js`: initialize the video module and notify it on lesson and view changes; do not couple it to progress mutations.
- Modify `scripts/build-static.mjs`: include the new script in the static build.
- Modify `tests/test-smoke.cjs` or add `tests/test-course-video.cjs`: use the existing test conventions and an injected fake YouTube player to exercise consumer-visible behavior.
- Modify `README.md`: describe the embed, consent, privacy, saved position, and fallback.
- Remove `stitch-motion.js`, `stitch-renderer.js`, their obsolete tests and build references once all callers are removed; retain unrelated course tests.

### Task 1: Verify tutorial mapping

**Files:** Create `course-video.js`; test `tests/test-course-video.cjs`.

**Interfaces:** Export or expose `COURSE_VIDEO_SEGMENTS`, an eight-element array of `{id, start, end, phases: [{time, label}]}` in seconds. IDs are stable lesson-specific strings; phase times are strictly increasing and lie inside the associated segment.

- [ ] Watch the actual tutorial at the README chapter timestamps (`23`, `53`, `75`, `112`, `215`, `422` seconds) and inspect its intervening content and end. Record the actual observed start/end and meaningful phase times for every lesson; overlapping segments are allowed. If video access is unavailable or content does not cover a lesson, stop and report the missing evidence rather than inventing timings.
- [ ] Add a deterministic test asserting eight unique IDs, finite ordered segment bounds, at least one ordered in-range phase per lesson, and labels. Run it and confirm it fails before the mapping exists.
- [ ] Populate `COURSE_VIDEO_SEGMENTS` with the verified observations and include source links with timestamped URLs in code comments or a compact evidence record. Run the test and confirm it passes.

### Task 2: Consent-gated player and navigation

**Files:** `course-video.js`, `index.html`, `styles.css`, `app.js`, `scripts/build-static.mjs`, `tests/test-course-video.cjs`.

**Interfaces:** `window.CourseVideo.init({getLessonIndex})` attaches controls; `window.CourseVideo.openLesson(index)` changes lesson and pauses; `window.CourseVideo.pause()` pauses when leaving the learning view. The module owns YouTube API loading and state.

- [ ] Add isolated tests using a fake `YT.Player` and simulated readiness, error, and delayed initialization: no API request before the load button; selected lesson is loaded paused; previous/next phase and restart seek only inside the segment; segment end pauses without changing course state; a late ready callback uses the current lesson; errors retain the chapter link and usable course controls. Confirm tests fail before implementation.
- [ ] Replace the illustrated viewer with a labeled, responsive video section and explicit “Load video” control with YouTube privacy notice, accessible status, phase controls, and a normal timestamped link. Keep interactive controls disabled until the player is ready.
- [ ] Implement the iframe API loader with a timeout and error handling, a single player lifecycle, clamped seeking, segment-end monitoring, paused lesson changes, and current-lesson validation in asynchronous callbacks. Native YouTube player controls provide play/pause and seeking; custom buttons provide phase navigation and restart. Do not autoplay.
- [ ] Wire `changeStep` and learning-view transitions in `app.js`; avoid resetting the player on ordinary `render()` calls such as stitch counting. Remove obsolete viewer code, assets, tests, and build references, preserving unrelated course behavior. Include `course-video.js` in the build and load it before `app.js`.
- [ ] Run the focused tests and `npm test`; confirm they pass. Exercise the embed in a browser on desktop and narrow viewport, including keyboard controls, reduced motion, blocked YouTube, and a lesson change while the player loads.

### Task 3: Per-lesson resume without progress mutations

**Files:** `course-video.js`, `tests/test-course-video.cjs`, `README.md`.

**Interfaces:** Persist a JSON object under `crochet-field-lab-video-positions-v1`, mapping stable lesson IDs to absolute video seconds; storage failures must not throw into the course.

- [ ] Add tests with isolated fake storage for independent lesson positions, reload and paused restoration, malformed JSON, nonfinite and out-of-range values, storage write errors, page hiding after uninterrupted play, and lesson switches. Snapshot existing course progress before and after playback interactions and assert equality. Confirm tests fail before implementation.
- [ ] Implement guarded reads and writes, validate positions against verified segment bounds, sample playback position without storage writes on every frame, and save on pause, seek, phase selection, lesson changes, and page hiding. Surface a clear unsaved notice when writes fail; never use the course progress store for video positions.
- [ ] Update `README.md` to explain opt-in YouTube loading, external requests, independently saved video positions, fallback link, and the fact that playback does not count stitches or complete lessons.
- [ ] Run the focused video tests, `npm test`, and `npm run build`. Manually verify consent, player behavior, saved resume, fallback, and lesson tracking in the built site. Record any environment-limited check rather than claiming it passed.

## Handoff

After all tasks pass, review the resulting branch against the spec and report verified behavior and any limitations. Do not merge or deploy without a separate request.
