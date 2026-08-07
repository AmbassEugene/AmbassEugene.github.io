# ADR 0002 — One particle system with two phases, not two systems

**Status:** Accepted
**Date:** 2026-08-07

## Context

The page has two particle effects: the explosion that opens it, and the
drifting node graph behind the content. They have different requirements — the
blast is fast, dense, radial and prismatic; the ambient field is slow, sparse,
wandering and two-tone.

Treating them as separate features is the obvious decomposition: a
`BlastEffect` that plays once and tears down, and a `FieldEffect` that runs for
the session.

## Decision

One `createParticleField` module holding one array of particles, with a `mode`
of `bang` or `ambient`. Detonation reseeds the existing particles at the centre
with radial velocity and spectral colour; cooling relaxes drag, fades the
connecting edges in, culls surplus debris and interpolates each particle's
colour toward the palette.

## Rationale

The continuity *is* the concept. The background the visitor reads the page on
is the debris from the explosion that opened it, cooled down — the two accent
colours in `tokens.css` are literally where the spectrum settles. Two systems
would render the same idea as a coincidence of styling; one system makes it
true at runtime.

Secondarily, it is less code and less state. There is no handover, no moment
where one effect must be destroyed as another initialises, and no possibility
of both running at once on a slow device.

## Alternatives considered

**Two modules with a shared renderer.** Cleaner on paper, and would satisfy
single-responsibility more literally. Rejected: the "responsibility" here is
one thing — *simulate this page's particles* — and splitting it would require
transferring particle state between the modules at the exact moment of
cooling, which is more coupling than it removes.

**Canvas blast, CSS ambient field.** Cheaper. Rejected: no continuity, and two
rendering models to maintain.

## Consequences

**Good.** One place to reason about particle behaviour. The transition is a
continuous interpolation rather than a swap, so it cannot visibly seam. Colour
is provably consistent: `FIELD.settled` in `config.js` and `--mint`/`--violet`
in `tokens.css` are the same two values.

**Bad.** The module carries phase state and therefore branches internally,
which is marginally harder to read than two single-purpose modules would be.
Mitigated by keeping the phase surface tiny — two public methods, `bang()` and
`ambient()`, and one private `mode` flag.

**Watch.** The dense phase runs an O(n²) edge pass over roughly 120 particles.
Edges are skipped entirely while `edgeAlpha` is near zero — which covers the
densest moments — and debris is culled back to ambient density within a few
seconds. If profiling on low-end mobile shows frame drops, reduce
`FIELD.burstMultiplier` or gate `maxParticles` by viewport width; both are
single values in `config.js`.
