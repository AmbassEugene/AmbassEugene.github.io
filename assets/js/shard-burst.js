/**
 * shard-burst.js — the fragments thrown outward by the blast, and the
 * constellation that wires them together.
 *
 * Each fragment is a real artefact from one of the systems documented on the
 * page, so even the explosion argues the case. Owns its own layout maths and
 * exposes four verbs to the sequencer; it holds no timers of its own, because
 * *when* each wave lands is the sequencer's concern.
 *
 * @module shard-burst
 */

import { FRAGMENTS, SHARD_LAYOUT, CADENCE } from './config.js';
import { el, svgEl, appendAll, setVars, stagger } from './dom.js';

/**
 * @typedef {object} ShardBurst
 * @property {(wave: number) => number[]} pop  Land one wave of fragments.
 * @property {() => number[]} wire             Draw the constellation.
 * @property {() => void} fade                 Recede, to clear room for copy.
 */

/**
 * Scatter fragments on a ring, avoiding the horizontal band where the
 * statement will appear.
 *
 * @param {number} index
 * @param {number} total
 * @returns {{ x: number, y: number, rotation: number }}
 */
function placeFragment(index, total) {
  const {
    radiusRatio, radiusRatioNarrow, narrowBreakpoint, radiusJitter,
    horizontalStretch, copyBand, copyBandPush, maxRotation
  } = SHARD_LAYOUT;

  const vmin = Math.min(window.innerWidth, window.innerHeight);
  const isNarrow = window.innerWidth < narrowBreakpoint;

  let angle = (index / total) * Math.PI * 2 + 0.35;
  // Anything landing near the centre line is pushed off it.
  if (Math.abs(Math.sin(angle)) < copyBand) angle += copyBandPush;

  const base = isNarrow ? radiusRatioNarrow : radiusRatio;
  const radius = base * vmin + Math.random() * radiusJitter * vmin;

  return {
    x: Math.cos(angle) * radius * horizontalStretch,
    y: Math.sin(angle) * radius,
    rotation: (Math.random() - 0.5) * maxRotation
  };
}

/**
 * @param {HTMLElement | null} container Holds the fragment elements.
 * @param {SVGElement | null} svg        Holds the constellation lines.
 * @returns {ShardBurst}
 */
export function createShardBurst(container, svg) {
  if (!container) {
    return Object.freeze({
      /** @returns {number[]} */ pop: () => [],
      /** @returns {number[]} */ wire: () => [],
      fade() {}
    });
  }

  const elements = FRAGMENTS.map((fragment, index) => {
    const { x, y, rotation } = placeFragment(index, FRAGMENTS.length);
    return el('span', {
      className: ['shard', fragment.tone ? `shard--${fragment.tone}` : ''],
      text: fragment.label,
      vars: {
        '--x': `${x.toFixed(0)}px`,
        '--y': `${y.toFixed(0)}px`,
        '--rot': `${rotation.toFixed(0)}deg`
      }
    });
  });

  appendAll(container, elements);

  /**
   * @param {number} wave Index into SHARD_LAYOUT.waves.
   * @returns {number[]} Timer ids.
   */
  function pop(wave) {
    const range = SHARD_LAYOUT.waves[wave];
    if (!range) return [];

    return stagger(elements.slice(range[0], range[1]), CADENCE.shardStagger,
      (shard) => shard.classList.add('is-popped'));
  }

  /**
   * Wire the landed fragments into a graph: the ring, plus a few chords
   * across it so the shape reads as a network rather than a circle.
   *
   * @returns {number[]} Timer ids.
   */
  function wire() {
    if (!svg) return [];

    svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);

    const points = elements.map((shard) => {
      const box = shard.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    });

    /** @type {Array<[number, number]>} */
    const pairs = points.map((_, i) => [i, (i + 1) % points.length]);
    for (let i = 0; i < points.length; i += 3) {
      pairs.push([i, (i + 5) % points.length]);
    }

    const lines = pairs.map(([from, to]) => {
      const a = points[from];
      const b = points[to];
      const line = svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      setVars(line, { '--len': Math.hypot(b.x - a.x, b.y - a.y).toFixed(0) });
      return line;
    });

    appendAll(svg, lines);

    return stagger(lines, CADENCE.constellationStagger,
      (line) => line.classList.add('is-drawn'));
  }

  /** Recede so the statement has the stage. */
  function fade() {
    if (svg) svg.classList.add('is-dim');
    for (const shard of elements) {
      shard.style.transition = 'opacity 900ms ease';
      shard.style.opacity = String(SHARD_LAYOUT.fadedOpacity);
    }
  }

  return Object.freeze({ pop, wire, fade });
}
