# ADR 0005 — Split the single file into modules

**Status:** Accepted
**Date:** 2026-08-07
**Supersedes:** the single-file structure described in ADR 0001's rejected
alternatives.

## Context

The site began as one `index.html` containing markup, a `<style>` block and a
`<script>` block. At around 1,600 lines that stopped being a virtue. The three
concerns were interleaved, the animation sequencer sat 900 lines below the
elements it drove, and every timing constant was a magic number at its call
site.

The specific trigger: this repository is part of a job application, and a
reviewer opening a 1,600-line HTML file forms a judgement before reading a word
of it.

## Decision

Split by concern, keeping the no-build constraint from ADR 0001 intact:

```
assets/css/   tokens · base · layout · components · cold-open · no-js
assets/js/    config · env · dom · particle-field · vibration
              shard-burst · cold-open · trace · marquee · reveal · main
```

Rules the split enforces:

- **`config.js` is the only place a timing, threshold or flag is written.** No
  module contains a magic number belonging to the sequence.
- **`dom.js` is the only module that constructs DOM.** It exposes no
  HTML-parsing helper, so injection sinks have nowhere to enter.
- **`env.js` is the only module that performs capability or preference
  detection.** Features ask; they do not probe.
- **`main.js` is the only module that queries the document for concrete
  elements.** Everything else receives collaborators as arguments.

## Rationale

`cold-open.js` is the clearest payoff. It previously owned the timeline, the
shake maths, the fragment layout, the constellation geometry and the particle
system. It now owns *when things happen* and nothing else; the field, the
vibration ramp and the fragment burst are injected. It can be read top to
bottom as a score, and the sequence can be retimed without reading a line of
the effects it triggers.

That injection is also what makes the modules independently exercisable — the
sequencer runs against a stub field, and `createParticleField` returns an inert
implementation of the same shape when animation is unavailable, so no caller
branches on reduced-motion itself.

## Consequences

**Good.** Each file has one reason to change. The CSS cascade is predictable
because layer order is explicit in the `<link>` sequence. Deleting the cold
open means deleting two files and three lines — no other stylesheet or module
references it.

**Bad.** Sixteen requests instead of one. Irrelevant over HTTP/2 for files this
size, and no request leaves the origin. Slightly more ceremony to add a
feature: a module, an import in `main.js`, and its constants in `config.js`.

**Constraint retained.** No build step, so no bundling and no tree-shaking.
Module count is kept deliberately low for that reason.
