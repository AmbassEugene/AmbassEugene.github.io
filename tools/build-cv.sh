#!/usr/bin/env bash
#
# Generates assets/ambassador-eugene-cv.pdf from the canonical CV markdown.
#
# The markdown lives OUTSIDE this repository, alongside the private
# write-ups and cover letter. That is deliberate: the CV is the source of
# truth, the site is a port of it, and the source is not published. Pass a
# different path as the first argument if it moves.
#
#   ./tools/build-cv.sh [path/to/master-cv.md] [--with-phone]
#
# Phone numbers are stripped by default — this PDF is served from a public
# site, where a number is scraped rather than read. Pass --with-phone for a
# copy going directly to a named recipient.

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

source_md="${1:-$root/../cv/master-cv.md}"
[ "${1:-}" = "--with-phone" ] && source_md="$root/../cv/master-cv.md"

phone_flag=""
for arg in "$@"; do
  [ "$arg" = "--with-phone" ] && phone_flag="--with-phone"
done

if [ ! -f "$source_md" ]; then
  echo "error: CV markdown not found at $source_md" >&2
  echo "       pass its path: ./tools/build-cv.sh path/to/master-cv.md" >&2
  exit 1
fi

chrome=""
for candidate in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "$(command -v google-chrome || true)" \
  "$(command -v chromium || true)"
do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then chrome="$candidate"; break; fi
done

[ -n "$chrome" ] || { echo "error: no Chrome/Chromium found" >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "→ rendering markdown"
# The stylesheet is copied next to the HTML so the relative <link> resolves.
cp "$root/tools/cv.css" "$tmp/cv.css"
node "$root/tools/md-to-html.mjs" "$source_md" "$tmp/cv.html" $phone_flag

out="$root/assets/ambassador-eugene-cv.pdf"
rm -f "$out"

echo "→ printing to PDF"
# Headless Chrome writes the file and then, on some builds, declines to exit.
# Bounded the same way as tools/build-share-card.sh.
"$chrome" \
  --headless=new --disable-gpu --no-first-run --no-default-browser-check \
  --no-pdf-header-footer --print-to-pdf-no-header \
  --user-data-dir="$tmp/profile" \
  --print-to-pdf="$out" \
  "file://$tmp/cv.html" >/dev/null 2>&1 &
pid=$!

previous=0
for _ in $(seq 1 60); do
  sleep 0.5
  [ -f "$out" ] || continue
  current=$(wc -c < "$out")
  [ "$current" -gt 0 ] && [ "$current" = "$previous" ] && break
  previous=$current
done

kill "$pid" 2>/dev/null || true
wait "$pid" 2>/dev/null || true

[ -s "$out" ] || { echo "error: PDF was not produced" >&2; exit 1; }

pages=$(strings "$out" | grep -c '/Type[[:space:]]*/Page[^s]' || true)
printf '  %s  (%s KB, %s pages)\n' \
  "assets/ambassador-eugene-cv.pdf" \
  "$(( $(wc -c < "$out") / 1024 ))" \
  "${pages:-?}"

echo "done."
