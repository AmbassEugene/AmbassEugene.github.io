/**
 * trace.js — the hero console that types out an agent run assembling the page.
 *
 * Renders TRACE_SCRIPT from config. Purely decorative: the console carries no
 * information that isn't stated in prose elsewhere on the page, and the
 * element is aria-hidden with a description on its container.
 *
 * @module trace
 */

import { TRACE_SCRIPT, CADENCE } from './config.js';
import { el, appendAll } from './dom.js';
import { prefersReducedMotion } from './env.js';

/** Maps a script line's kind to its modifier class. */
const LINE_CLASS = Object.freeze({
  note: 'trace__ln--note',
  arg: 'trace__ln--arg',
  result: 'trace__ln--res',
  call: ''
});

/**
 * @typedef {object} Trace
 * @property {() => void} start Begin typing. Safe to call more than once.
 */

/**
 * @param {HTMLElement | null} body   Container the lines are written into.
 * @param {HTMLElement | null} status Small element showing running/complete.
 * @returns {Trace}
 */
export function createTrace(body, status) {
  if (!body) return Object.freeze({ start() {} });

  /**
   * Build one line. Text is set via textContent, so a script entry can never
   * be interpreted as markup.
   *
   * @param {import('./config.js').TraceLine} line
   * @returns {HTMLElement}
   */
  function renderLine(line) {
    const node = el('span', {
      className: ['trace__ln', LINE_CLASS[line.kind]].filter(Boolean),
      text: line.text
    });

    if (line.ok) {
      node.appendChild(el('span', { className: 'trace__ok', text: ` ✔ ${line.ok}` }));
    }
    return node;
  }

  function complete() {
    if (status) status.textContent = 'complete';
  }

  /** Render everything at once — used when motion is not wanted. */
  function renderAll() {
    appendAll(body, TRACE_SCRIPT.map(renderLine));
    complete();
  }

  let started = false;

  function start() {
    if (started) return;
    started = true;

    if (prefersReducedMotion()) {
      renderAll();
      return;
    }

    /** @type {HTMLElement | null} */
    let caret = null;
    let index = 0;

    const tick = () => {
      if (caret) caret.remove();

      if (index >= TRACE_SCRIPT.length) {
        complete();
        return;
      }

      body.appendChild(renderLine(TRACE_SCRIPT[index]));
      caret = el('span', { className: 'caret' });
      body.appendChild(caret);
      index += 1;

      // Irregular gaps read as a live stream; a fixed interval reads as a loop.
      window.setTimeout(tick, CADENCE.traceMinGap + Math.random() * CADENCE.traceJitter);
    };

    window.setTimeout(tick, CADENCE.traceLeadIn);
  }

  return Object.freeze({ start });
}
