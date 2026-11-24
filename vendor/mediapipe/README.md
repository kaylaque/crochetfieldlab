# MediaPipe Tasks Vision 0.10.35 (vendored)

Copied unchanged from the npm package `@mediapipe/tasks-vision@0.10.35`
(`vision_bundle.mjs` and the SIMD + no-SIMD wasm files). License: Apache-2.0,
https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE

`workshop.js` loads these first, so hand tracking does not depend on jsDelivr,
and falls back to the CDN only if a file is missing. The hand model itself
(`hand_landmarker.task`) is loaded from Google's model storage; to make the page
fully self-hosted, place a copy at `vendor/mediapipe/hand_landmarker.task`.
