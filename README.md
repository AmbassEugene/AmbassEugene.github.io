# ambassadoreugene — portfolio

Single-page engineering portfolio. Three case studies on agent systems, LLM
guardrails and platform migration.

## Design constraints

- **One file.** `index.html` contains the markup, styles and behaviour.
- **No build step.** Nothing to compile; GitHub Pages serves the file directly.
- **No third-party requests.** No CDN, no webfonts, no analytics, no trackers.
  The page makes zero network calls after the initial document load.
- **Progressive enhancement.** All content is in the HTML. JavaScript adds the
  agent trace, the scroll reveals and the generative background — with
  JS disabled the page is fully readable.
- **Motion is opt-out.** `prefers-reduced-motion` disables the canvas field,
  the typewriter trace and every transition.

## Local preview

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Deployment

Pushed to `main`; GitHub Pages serves from the branch root.
`.nojekyll` disables Jekyll processing, which the site does not need.

## Source of truth

The long-form case studies live in [`../write-ups/`](../write-ups/) as Markdown.
Edit those first, then port changes here — not the other way round.
