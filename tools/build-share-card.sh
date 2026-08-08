#!/usr/bin/env bash
#
# Renders tools/share-card.html to assets/share-card.png (1200x630) and
# assets/apple-touch-icon.png (180x180) using headless Chrome.
#
# The card imports the site's own tokens.css, so it cannot drift from the
# palette it advertises — rerun this after any change to the design tokens.
#
# Chrome is a local tool, not a project dependency: nothing is installed and
# the site itself has no build step (docs/adr/0001-no-build-step.md). The
# generated PNGs are committed so deployment stays a plain file copy.

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

chrome=""
for candidate in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  "$(command -v google-chrome || true)" \
  "$(command -v chromium || true)"
do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then chrome="$candidate"; break; fi
done

if [ -z "$chrome" ]; then
  echo "error: no Chrome/Chromium found. Install one, or render" >&2
  echo "       tools/share-card.html to 1200x630 by any other means." >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Headless Chrome writes the screenshot and then, on some builds, declines to
# exit. Rather than waiting on it, the render is bounded: launch detached,
# wait for the file to appear and stop growing, then terminate the process.
# Each run also gets its own profile, since Chrome locks the directory.
shoot() { # shoot <out> <w> <h> <url>
  local out="$1" width="$2" height="$3" url="$4"
  rm -f "$out"

  "$chrome" \
    --headless=new --disable-gpu --hide-scrollbars --no-first-run \
    --no-default-browser-check --disable-extensions \
    --virtual-time-budget=3000 \
    --force-device-scale-factor=1 \
    --user-data-dir="$(mktemp -d "$tmp/profile.XXXXXX")" \
    --window-size="$width,$height" \
    --screenshot="$out" \
    "$url" >/dev/null 2>&1 &
  local pid=$!

  local previous=0 current=0
  for _ in $(seq 1 60); do
    sleep 0.5
    [ -f "$out" ] || continue
    current=$(wc -c < "$out")
    # Two equal, non-zero readings means the write has finished.
    [ "$current" -gt 0 ] && [ "$current" = "$previous" ] && break
    previous=$current
  done

  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true

  [ -s "$out" ] || { echo "error: $out was not rendered" >&2; exit 1; }
}

echo "→ share-card.png (1200x630)"
shoot "$root/assets/share-card.png" 1200 630 "file://$root/tools/share-card.html"

# Chrome letterboxes a bare SVG, so the icon is rendered through a wrapper
# that pins it edge to edge.
cat > "$tmp/icon.html" <<HTML
<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;width:180px;height:180px;overflow:hidden}
img{width:180px;height:180px;display:block}</style>
<img src="file://$root/assets/favicon.svg" alt="">
HTML

echo "→ apple-touch-icon.png (180x180)"
shoot "$root/assets/apple-touch-icon.png" 180 180 "file://$tmp/icon.html"

for f in share-card apple-touch-icon; do
  printf '  %-20s %s\n' "$f.png" \
    "$(sips -g pixelWidth -g pixelHeight "$root/assets/$f.png" 2>/dev/null \
       | awk '/pixel/ {printf "%s ", $2}')"
done

echo "done."
