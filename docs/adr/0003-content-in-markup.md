# ADR 0003 — Prose stays in the markup, never rendered from data

**Status:** Accepted
**Date:** 2026-08-07

## Context

The three case studies share an identical structure: masthead, chips, stack
line, context, problem, what I built, a load-bearing decision, and a review
note. Roughly 250 lines of near-identical markup, differing only in content.

The instinct is to treat this as duplication: move the case studies into a
data file and render them from a template. That is what DRY appears to demand,
and it is what a component framework would do by default.

## Decision

Case-study prose stays in `index.html` as semantic HTML. Only genuinely
repeated *structure with no content of its own* — the marquee items, the trace
script, the fragment labels, the timeline — lives in `config.js`.

## Rationale

DRY is about single sources of truth for **knowledge**, not about never typing
a similar tag twice. Three case studies are three distinct pieces of knowledge
that happen to share a shape. Extracting them into a renderer would create one
template that must anticipate every future case study, which is a worse
abstraction than a little markup repetition.

The decisive argument is not architectural but functional. If prose is
rendered by JavaScript then:

- a crawler that does not execute scripts sees an empty page — for a document
  whose entire purpose is being found and read by hiring managers and search
  engines, this is disqualifying;
- "view source" shows a template rather than the writing, and view-source is
  the review path this repository is optimised for;
- a script error takes the résumé offline rather than degrading an animation;
- assistive technology waits on the main thread for content that could have
  been in the initial payload.

Every one of those costs is paid to avoid typing `<h4 class="sub-head">` three
times.

## Consequences

**Good.** The page is complete and readable with JavaScript disabled, blocked
or failed. Content is diffable in review — a prose change shows as a prose
change. The Markdown originals and the HTML stay diffable against each other.

**Bad.** Editing shared case-study structure means three edits. Accepted: the
structure has been stable across several revisions, and a mistake in one is
visible immediately.

**Mitigation.** Presentation stays fully DRY even though markup does not — the
type scale, chips, decision block and subheadings are single CSS rules reused
across all three, so a design change is still one edit.
