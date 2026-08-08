/**
 * stage-nav.js — the two pieces everything reassembles into.
 *
 * Once the bio has been typed, every fragment shakes apart and its pieces are
 * drawn to two points. This module resolves those points into the only two
 * choices the opening stage offers: read the case studies, or take the CV.
 *
 * The elements exist in the markup rather than being constructed here, so the
 * links are real anchors a crawler can follow and a keyboard can reach even
 * though the stage is decorative. This module only positions and reveals them.
 *
 * @module stage-nav
 */

import { CONVERGE } from './config.js';
import { qsa, setVars, stagger } from './dom.js';

/**
 * @typedef {object} StageNav
 * @property {(points: { left: DOMPoint, right: DOMPoint }) => void} form
 *   Place the pieces at the convergence points and resolve them into view.
 * @property {(handler: () => void) => void} onEnter
 *   Called when the visitor chooses to read on.
 */

/**
 * @param {HTMLElement | null} root
 * @returns {StageNav}
 */
export function createStageNav(root) {
  if (!root) {
    return Object.freeze({ form() {}, onEnter() {} });
  }

  const items = /** @type {HTMLAnchorElement[]} */ (qsa('[data-action]', root));

  return Object.freeze({
    /** @param {{ left: DOMPoint, right: DOMPoint }} points */
    form(points) {
      items.forEach((item, i) => {
        const target = i === 0 ? points.left : points.right;
        setVars(item, {
          '--x': `${target.x.toFixed(0)}px`,
          '--y': `${target.y.toFixed(0)}px`
        });
      });

      root.classList.add('is-formed');
      stagger(items, CONVERGE.stagger, (item) => item.classList.add('is-formed'));
    },

    /** @param {() => void} handler */
    onEnter(handler) {
      for (const item of items) {
        if (item.dataset.action !== 'enter') continue;
        item.addEventListener('click', (event) => {
          // The stage is released before the jump, or the page it scrolls to
          // is still locked behind `overflow: hidden`.
          event.preventDefault();
          handler();
        });
      }
    }
  });
}
