/**
 * typewriter.js — types text that is already in the markup.
 *
 * The source of truth stays the HTML: this walks the element's existing text
 * nodes, empties them, and refills them character by character. Nothing is
 * duplicated into a config string, so the typed line is the same line a
 * crawler, a screen reader and a JS-disabled visitor see (ADR 0003), and
 * inline markup such as <b> survives the animation intact.
 *
 * @module typewriter
 */

import { el } from './dom.js';
import { prefersReducedMotion } from './env.js';

/**
 * @typedef {object} Typewriter
 * @property {() => Promise<void>} run  Type the text. Resolves when done.
 * @property {() => void} finish        Jump to the end immediately.
 */

/**
 * @param {HTMLElement | null} target
 * @param {object} [options]
 * @param {number} [options.charDelay=22] Milliseconds between characters.
 * @param {number} [options.pauseOnPunctuation=180] Extra pause after . , — :
 * @returns {Typewriter}
 */
export function createTypewriter(target, { charDelay = 22, pauseOnPunctuation = 180 } = {}) {
  if (!target) {
    return { run: () => Promise.resolve(), finish() {} };
  }

  // Capture the text nodes and their content before anything is cleared.
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  /** @type {Array<{ node: Text, text: string }>} */
  const segments = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    segments.push({ node: /** @type {Text} */ (node), text: node.textContent ?? '' });
  }

  const caret = el('span', { className: 'caret' });
  /** @type {number | undefined} */
  let timer;
  let done = false;

  /** Restore every segment and remove the caret. */
  function finish() {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    for (const segment of segments) segment.node.textContent = segment.text;
    caret.remove();
  }

  function run() {
    if (segments.length === 0) return Promise.resolve();

    if (prefersReducedMotion()) {
      finish();
      return Promise.resolve();
    }

    for (const segment of segments) segment.node.textContent = '';
    target.appendChild(caret);

    return new Promise((resolve) => {
      let segmentIndex = 0;
      let charIndex = 0;

      const tick = () => {
        if (done) { resolve(); return; }

        const segment = segments[segmentIndex];
        if (!segment) { finish(); resolve(); return; }

        if (charIndex >= segment.text.length) {
          segmentIndex += 1;
          charIndex = 0;
          timer = window.setTimeout(tick, 0);
          return;
        }

        const character = segment.text[charIndex];
        segment.node.textContent += character;
        charIndex += 1;

        // Punctuation gets a beat, which is what stops it reading as a machine.
        const pause = '.,—:'.includes(character) ? pauseOnPunctuation : 0;
        timer = window.setTimeout(tick, charDelay + pause);
      };

      tick();
    });
  }

  return { run, finish };
}
