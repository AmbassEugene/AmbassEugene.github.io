/**
 * marquee.js — the scrolling capability strip.
 *
 * The track is duplicated so the CSS `translateX(-50%)` loop is seamless.
 * That duplication is a rendering detail, which is why it happens here
 * rather than being written out twice in the markup.
 *
 * @module marquee
 */

import { MARQUEE_ITEMS } from './config.js';
import { el, appendAll } from './dom.js';

/**
 * @param {HTMLElement | null} track
 * @returns {void}
 */
export function mountMarquee(track) {
  if (!track) return;

  const items = MARQUEE_ITEMS.map((label) => el('span', { text: label }));
  const loop = MARQUEE_ITEMS.map((label) => el('span', { text: label }));

  appendAll(track, [...items, ...loop]);
}
