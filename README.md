# ambassadoreugene

Engineering portfolio. Three case studies on agent systems, LLM guardrails and
platform migration, behind an opening sequence.

The source is part of the application — it is written to be read.

## Principles

**No dependencies.** No `package.json`, no lockfile, no framework, no build
step. GitHub Pages serves the working tree exactly as committed.
See [ADR 0001](docs/adr/0001-no-build-step.md).

**No third-party requests.** No CDN, no webfonts, no analytics, no beacons.
Once the document loads, the page makes no network calls — and
`connect-src 'none'` in the CSP means it cannot.

**Content lives in the markup.** Prose is semantic HTML, never rendered from
JavaScript, so the page is complete for crawlers, assistive technology and
anyone with scripting disabled.
See [ADR 0003](docs/adr/0003-content-in-markup.md).

**Progressive enhancement.** JavaScript adds the opening sequence, the console,
the scroll reveals and the particle field. Without it the page is a complete,
readable document.

**Motion is opt-out.** `prefers-reduced-motion` removes the opening entirely,
disables every transition and takes the canvas off the page.

## Layout

```
index.html                  All content. The only file with prose in it.
assets/css/
  tokens.css                Design tokens. No selectors.
  base.css                  Reset, element typography, accessibility.
  layout.css                Backdrop, shell, section rhythm.
  components.css            Every reusable UI piece.
  cold-open.css             The opening sequence, self-contained.
  no-js.css                 Loaded only from <noscript>.
assets/js/
  config.js                 Timings, flags and sequence data. Single source of truth.
  env.js                    Capability and preference detection.
  dom.js                    The only module that constructs DOM.
  particle-field.js         Two-phase particle system: bang → ambient.
  vibration.js              The escalating shake, and haptics.
  shard-burst.js            Fragments and the constellation that wires them.
  cold-open.js              The sequencer. Owns *when*, nothing else.
  trace.js                  Hero console.
  typewriter.js             Types text already present in the markup.
  view-mode.js              Skim / full reading depth.
  marquee.js                Capability strip.
  reveal.js                 Scroll reveals.
  main.js                   Composition root. The only module that queries the DOM.
tools/
  share-card.html           Source for the social card. Imports the site's tokens.
  build-share-card.sh       Renders it to PNG with headless Chrome.
docs/
  security.md               Threat model, CSP, and a known limitation.
  adr/                      Architecture decision records.
```

Dependency direction is one-way: `main` → features → (`config`, `dom`, `env`).
No feature module imports another feature module, except `cold-open`, which
receives its collaborators as arguments rather than importing them.

## Running locally

ES modules need an HTTP origin — opening `index.html` from the filesystem will
not execute the scripts.

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

To view on a phone on the same network, bind to all interfaces and use the
machine's LAN address:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

## Reading depth

`Skim` collapses each case study to its masthead and its load-bearing decision;
`Full` restores the prose. The choice persists for the session. Skim hides the
prose with CSS rather than removing nodes, so a crawler and a screen reader
always receive the complete text regardless of mode.

## The social card

`assets/share-card.png` is generated, not hand-drawn:

```bash
./tools/build-share-card.sh
```

`tools/share-card.html` imports `assets/css/tokens.css`, so the card cannot
drift from the palette it advertises — rerun the script after changing tokens.
Chrome is a local tool, not a project dependency; the PNGs are committed so
deployment stays a plain file copy.

**One value to change if the repository name changes.** `og:url`, `og:image`
and `canonical` in `index.html` are absolute — most scrapers reject relative
image URLs. They currently assume `https://ambasseugene.github.io/`.

## Tuning the opening

Every beat is one number in [`assets/js/config.js`](assets/js/config.js).
`TIMELINE` holds the six acts in milliseconds from start; `CADENCE` holds the
per-element staggers; `VIBRATION` holds the shake ramp; `FIELD` holds the
particle physics and the spectrum.

`FEATURES.playIntroOncePerSession` controls whether the sequence replays on
reload. It defaults to `false`, so it plays every time.

## Verifying the claims

**No injection sinks.** Returns exactly one line — the comment in `dom.js`
that documents the policy:

```bash
grep -rnE 'innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function' assets/
```

**No inline script, style or event handlers**, which is what lets the CSP omit
`'unsafe-inline'`. Returns nothing:

```bash
grep -nE '<style|<script[^>]*>[^<]| style="|on(click|load|error|mouse)=' index.html
```

**No external resources.** Returns only the SVG namespace URI and the three
profile links:

```bash
grep -rhoE 'https?://[^"'\'' )]+' index.html assets/ | sort -u
```

**Types check**, using the JSDoc annotations and no build step:

```bash
npx -y -p typescript@5 tsc -p jsconfig.json
```

`tsc` is used purely as a checker here — `noEmit` is set and no TypeScript is
produced. It is not a dependency; nothing is installed into the repository.

## Deployment

Push to `main`. GitHub Pages serves from the branch root. `.nojekyll` disables
Jekyll processing, which the site does not need.

## Source of truth for content

The long-form case studies are maintained as Markdown outside this repository
and are the canonical text; `index.html` is a port of them. Edit the Markdown
first, then bring the change across — not the other way round.

## Licence

Code is [MIT](LICENSE). The written case studies and CV content are not —
they are personal and not licensed for reuse.
