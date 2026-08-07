# Security

The site is static and has no backend, no forms, no cookies, no storage of
personal data and no third-party code. That removes most of the usual attack
surface by construction. What remains is documented here.

## Threat model

| Asset | Threat | Mitigation |
| --- | --- | --- |
| Page integrity | Injected script via a compromised dependency | No dependencies. Nothing is fetched at runtime. |
| Page integrity | XSS through dynamic content | No `innerHTML`, no `eval`, no `Function`, no inline handlers. All text via `textContent`. |
| Visitor privacy | Third-party tracking | No analytics, no fonts, no CDN, no beacons. Zero outbound requests. |
| Visitor privacy | Referrer leakage | `strict-origin-when-cross-origin`. |
| Reputation | Clickjacking / framing | `frame-ancestors` — **not enforceable on GitHub Pages**, see below. |

## Content-Security-Policy

Declared as a `<meta http-equiv>` in `index.html`, because GitHub Pages cannot
set response headers.

```
default-src 'none';
script-src  'self';
style-src   'self';
img-src     'self' data:;
font-src    'self';
connect-src 'none';
base-uri    'none';
form-action 'none'
```

`default-src 'none'` denies by default; every directive is an explicit
allowance. Notes on specific choices:

- **No `'unsafe-inline'`, anywhere.** The page contains no inline `<style>`,
  no `style="…"` attribute and no inline script. Runtime style changes — the
  vibration amplitude, shard positions, constellation lengths — are written
  through the CSSOM in `assets/js/dom.js` (`setVars`), which CSP does not
  restrict. This was a design constraint, not a retrofit.
- **`img-src` allows `data:`** for one thing: the SVG grain texture in
  `layout.css`. Inlining it keeps the zero-request property.
- **`connect-src 'none'`** means fetch, XHR, WebSocket and `sendBeacon` are all
  denied. Nothing in the codebase makes a network call, and now nothing can.

### Known limitation

`frame-ancestors` and `X-Frame-Options` are **header-only** — a `<meta>` tag
cannot deliver them, so this page can be framed by a third party. Accepted
rather than mitigated: the content is public, has no authenticated actions and
no state to hijack, so framing yields nothing worth taking. If the site ever
moves to a host that can set headers (Netlify `_headers`, Cloudflare Pages,
nginx), add:

```
Content-Security-Policy: frame-ancestors 'none'
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

GitHub Pages already serves HSTS and `X-Content-Type-Options: nosniff` on
`*.github.io`, and forces HTTPS.

## Injection sinks

There are none, and that is checkable:

```bash
grep -rnE 'innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function' assets/
```

The expected result is a single match: the comment in `dom.js` stating the
policy. `assets/js/dom.js` is the only module that
touches DOM construction APIs and deliberately exposes no HTML-parsing helper,
so there is nowhere for a sink to be introduced without it being obvious in
review.

## Data handling

The site collects nothing. `sessionStorage` is touched only when
`FEATURES.playIntroOncePerSession` is enabled, and stores a single
non-identifying flag recording that an animation has played. Access is wrapped
in `env.js` so a storage exception in private browsing cannot break the page.

The published contact address is an email link only. The phone number on the
master CV is deliberately **not** on this page — a CV is sent to a named
recipient; this page is crawled.

## Dependencies

None. There is no `package.json`, no lockfile and no supply chain. The
dependency-audit story for this repository is that there is nothing to audit —
which is itself the argument for building it this way.
