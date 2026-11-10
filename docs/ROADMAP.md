# Crochet Field Lab — Development Roadmap

| Priority | Focus | Deliverable / exit criterion | Prototype status |
|---|---|---|---|
| **P0 — Fundamental course** | Improve lesson clarity, mobile layout, guided 3D motion and self-checks | Beginners can finish slip knot → foundation chain → single crochet → first rows without AI | Started — eight steps, responsive layout, self-checks; illustrations are not physically accurate |
| **P1 — Progress & projects** | Better row/stitch correction, checkpoints, resumable project state, optional export | Users can leave mid-row and reliably recover their place | Partial — manual counts, undo, rows, pause/resume, journal; no named checkpoints or export |
| **P2 — Camera assistance** | Angle/framing guide; test hand, hook and yarn tracking | Useful framing guidance across phone/laptop cameras | Partial — camera preview and optional hand landmarks; no hook or yarn tracking |
| **P3 — Stitch recognition** | Label short videos; recognize foundation-chain phases; automate counting cautiously | Measure counting error, false corrections, latency on unseen users | Not started |
| **P4 — AI tutor** | Evidence-based mistake explanations, next-action hints, optional voice | Feedback improves learning versus static guidance in user testing | Not started |
| **P5 — Product exploration** | Pattern import, procedural 3D, custom projects, community content | Validate demand before building a broader pattern platform | Not started |

## Next development sprint

1. Refine **chain and single-crochet** guides into clear, controllable substeps.
2. Test the lesson flow with 3–5 first-time crocheters; document where they get stuck.
3. Improve row history and undo/checkpoint behavior based on those tests.
4. Collect consented, labeled foundation-chain practice videos for a small CV feasibility benchmark.

**Principle:** Make the course genuinely useful without AI. Add computer vision only when it is reliable and measurably helps learners.

## Related documents

- [Product specification](SPEC.md) — requirements and acceptance criteria
- [Architecture](ARCHITECTURE.md) — current runtime and proposed CV extension
- [README](../README.md) — setup, deployment, and limitations
