# ADR 0004 — A single committed dark surface, not a light/dark pair

**Status:** Accepted
**Date:** 2026-08-07

## Context

Respecting `prefers-color-scheme` is the default expectation for a modern site,
and shipping only one theme invites the question of whether the other was
skipped out of laziness.

## Decision

One palette. `<meta name="color-scheme" content="dark">`, a near-black ground,
and no `prefers-color-scheme` branch.

## Rationale

The opening sequence is the argument. It begins in absolute darkness with a
single point of light, detonates through a colour spectrum, and cools into the
two accents the rest of the page is built from. Every one of those beats
depends on the ground being near-black: a white singularity is invisible on
white, an additive `screen`-blended chromatic aberration does nothing on a
light background, and a glow bloom has nothing to bloom against.

A light theme would therefore need a completely different opening, not a
recoloured one. That is a second design, maintained in parallel, for a
single-page document. The honest choice is to commit and say why.

## Alternatives considered

**Full light/dark pair.** Rejected: doubles the design surface and would still
require dropping or redesigning the cold open in light mode.

**Light theme for print only.** Partially adopted in spirit — but the page is
not designed to be printed; the downloadable CV is the printable artefact.

## Consequences

**Good.** One palette to keep consistent. Every colour decision can assume a
dark ground, which is what makes the accent glows and the outline type work.

**Bad.** Visitors who strongly prefer light interfaces get a dark page. Judged
acceptable for a document read once, for a few minutes.

**Obligation.** Committing to dark makes contrast non-negotiable, since there
is no light fallback to rescue a weak pairing. Body text is `--body` on
`--void` and both accents are used at large sizes or with sufficient weight.
Any new colour must be checked against the ground before it ships.
