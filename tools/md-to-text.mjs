/**
 * md-to-text.mjs — the CV as plain text, for pasting into job boards.
 *
 * Applicant tracking systems parse pasted text more reliably than they parse
 * PDFs, and several refuse PDFs above a size they never document. A text
 * version costs nothing to keep in step, because it comes from the same
 * markdown the PDF does.
 *
 * Usage:
 *   node tools/md-to-text.mjs <input.md> <output.txt> [--with-phone]
 *
 * @module tools/md-to-text
 */

import { readFileSync, writeFileSync } from 'node:fs';

const [, , inputPath, outputPath, ...flags] = process.argv;

if (!inputPath || !outputPath) {
  console.error('usage: node tools/md-to-text.mjs <input.md> <output.txt> [--with-phone]');
  process.exit(1);
}

const withPhone = flags.includes('--with-phone');
const PHONE = /\+?\d[\d\s()-]{8,}\d/g;

/**
 * Strip inline markup, keeping the link text and dropping the URL — except
 * where the URL is the useful part, in which case the text already is one.
 *
 * @param {string} line
 * @returns {string}
 */
function inline(line) {
  return line
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
      href.startsWith('mailto:') || href.includes(label.replace(/^www\./, ''))
        ? label
        : `${label} (${href})`)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

const source = readFileSync(inputPath, 'utf8');
const cleaned = withPhone
  ? source
  : source.replace(PHONE, '').replace(/\s+·\s*$/gm, '').replace(/·\s*\n/g, '\n');

/** @type {string[]} */
const out = [];

for (const raw of cleaned.split('\n')) {
  const line = raw.trimEnd();

  if (line.trim() === '') { out.push(''); continue; }
  if (/^---+$/.test(line.trim())) { continue; }

  const heading = /^(#{1,4})\s+(.*)$/.exec(line);
  if (heading) {
    const text = inline(heading[2]);
    const level = heading[1].length;
    if (level === 1) {
      out.push(text.toUpperCase(), '='.repeat(text.length));
    } else if (level === 2) {
      out.push('', text.toUpperCase(), '-'.repeat(text.length));
    } else {
      out.push('', text);
    }
    continue;
  }

  const item = /^[-*]\s+(.*)$/.exec(line);
  if (item) { out.push(`  - ${inline(item[1])}`); continue; }

  out.push(inline(line.trim()));
}

// Collapse runs of blank lines; a form field does not need the whitespace.
const text = out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

writeFileSync(outputPath, text, 'utf8');
console.log(`  ${outputPath}  (${text.length.toLocaleString()} chars, phone ${withPhone ? 'kept' : 'stripped'})`);
