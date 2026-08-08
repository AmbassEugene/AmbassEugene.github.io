/**
 * view-mode.js — skim or full.
 *
 * Skim collapses each case study to its masthead and its load-bearing
 * decision: the two things worth reading in thirty seconds. Full restores the
 * prose. The choice persists for the session, so following a nav link and
 * coming back does not silently reset it.
 *
 * Implemented as a class on <body> with CSS doing the hiding, rather than by
 * removing nodes — the prose stays in the DOM, so skim mode never costs a
 * crawler or a screen reader access to the full text.
 *
 * @module view-mode
 */

import { VIEW } from './config.js';
import { qsa } from './dom.js';
import { session } from './env.js';

/** @typedef {'skim' | 'full'} Mode */

/**
 * @param {HTMLElement | null} group Container of the mode buttons.
 * @returns {void}
 */
export function mountViewMode(group) {
  if (!group) return;

  const buttons = /** @type {HTMLButtonElement[]} */ (qsa('[data-mode]', group));
  if (buttons.length === 0) return;

  /**
   * @param {Mode} mode
   * @param {boolean} remember Skip persisting when restoring a stored value.
   */
  function apply(mode, remember = true) {
    document.body.classList.toggle('is-skim', mode === 'skim');

    for (const button of buttons) {
      const isCurrent = button.dataset.mode === mode;
      button.setAttribute('aria-pressed', String(isCurrent));
      button.classList.toggle('btn--solid', isCurrent);
    }

    if (remember) session.set(VIEW.storageKey, mode);
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      apply(/** @type {Mode} */ (button.dataset.mode ?? VIEW.defaultMode));
    });
  }

  const stored = session.get(VIEW.storageKey);
  apply(stored === 'skim' || stored === 'full'
    ? stored
    : /** @type {Mode} */ (VIEW.defaultMode), false);
}
