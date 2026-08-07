/**
 * reveal.js — reveals sections as they enter the viewport.
 *
 * Progressive enhancement: `.reveal` elements are only hidden once the
 * document is marked with `.js`, so the page is fully readable with
 * scripting disabled or unavailable. Each element is unobserved after it
 * fires, so the observer sheds work as the visitor scrolls.
 *
 * @module reveal
 */

import { REVEAL } from './config.js';
import { qsa } from './dom.js';
import { supportsObserver } from './env.js';

/**
 * @param {ParentNode} [scope=document]
 * @returns {void}
 */
export function mountReveals(scope = document) {
  const elements = qsa('.reveal', scope);
  if (elements.length === 0) return;

  if (!supportsObserver()) {
    elements.forEach((element) => element.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: REVEAL.rootMargin, threshold: REVEAL.threshold });

  elements.forEach((element) => observer.observe(element));
}
