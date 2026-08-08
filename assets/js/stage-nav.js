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
import { qsa, stagger } from './dom.js';

/**
 * @typedef {object} StageNav
 * @property {() => DOMPoint[]} targets
 *   Where each piece will sit, as an offset from the viewport centre. The
 *   fragments converge on these, so the debris arrives exactly where the
 *   buttons resolve rather than somewhere approximately similar.
 * @property {() => void} form  Resolve the pieces into view.
 * @property {(handler: () => void) => void} onEnter
 *   Called when the visitor chooses to read on.
 */

/**
 * @param {HTMLElement | null} root
 * @returns {StageNav}
 */
export function createStageNav(root) {
  if (!root) {
    return Object.freeze({
      /** @returns {DOMPoint[]} */ targets: () => [],
      form() {},
      onEnter() {}
    });
  }

  const items = /** @type {HTMLAnchorElement[]} */ (qsa('[data-action]', root));

  return Object.freeze({
    /** @returns {DOMPoint[]} */
    targets() {
      // The nav is laid out but transparent at this point, so it already has
      // real geometry to measure — no guessing, and no hard-coded offsets.
      return items.map((item) => {
        const box = item.getBoundingClientRect();
        return new DOMPoint(
          box.left + box.width / 2 - window.innerWidth / 2,
          box.top + box.height / 2 - window.innerHeight / 2
        );
      });
    },

    form() {
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
