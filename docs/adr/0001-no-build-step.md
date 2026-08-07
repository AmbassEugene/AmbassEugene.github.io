# ADR 0001 — No build step, no dependencies

**Status:** Accepted
**Date:** 2026-08-07

## Context

This site is part of a job application. A reviewer may well open the repository
before they finish reading the page, so the source is a deliverable in its own
right.

The default choice for a portfolio is a framework — Next.js, Astro, Vite plus a
component library. That brings a `node_modules` tree, a lockfile, a build
pipeline and a deployment action, for a site that is four screens of static
prose and one animation.

## Decision

No framework, no bundler, no package manager, no build step. Plain HTML,
modular CSS loaded with `<link>`, and ES modules loaded with
`<script type="module">`. GitHub Pages serves the working tree exactly as
committed.

## Alternatives considered

**Next.js static export.** Familiar, and the site would double as evidence of
framework fluency. Rejected: the three case studies already carry that
evidence far better than a scaffold would, and it would add hundreds of
transitive dependencies to a site that fetches nothing at runtime.

**A bundler with no framework.** Would allow npm packages and minification.
Rejected: nothing here needs a package, and minifying a repository whose
purpose is being read is working against the goal.

**Single-file HTML.** The previous state of this repository. Rejected once the
file passed a thousand lines: see ADR 0005.

## Consequences

**Good.** Zero supply chain, so no dependency CVEs and nothing to audit. What
is committed is what is served, so no source-map indirection when reading it.
No build means no build breakage. The security posture in `docs/security.md`
becomes trivially defensible.

**Bad.** No minification, so bytes are larger than they need to be — irrelevant
at this size, and the comments are part of the deliverable. No TypeScript
compiler; types are expressed in JSDoc and checked with `tsc --checkJs` rather
than enforced by a build. No automatic vendor prefixing, so the handful of
`-webkit-` prefixes are written by hand.

**Constraint accepted.** ES modules require an HTTP origin — opening
`index.html` over `file://` will not run the scripts. Contributors must use a
local server, documented in the README.
