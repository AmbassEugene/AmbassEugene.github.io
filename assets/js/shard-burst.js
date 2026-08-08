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

import {
  FRAGMENTS, FRAGMENT_POOL, FRAGMENT_CYCLE, SHARD_LAYOUT, CADENCE, CONVERGE, RESPAWN
} from './config.js';
import { el, svgEl, appendAll, setVars, stagger } from './dom.js';

/**
 * @typedef {object} ShardBurst
 * @property {(wave: number) => number[]} pop  Land one wave of fragments.
 * @property {() => number[]} wire             Draw the constellation.
 * @property {() => void} fade                 Recede, to clear room for copy.
 * @property {() => void} startCycling         Begin shattering and reforming.
 * @property {() => void} stopCycling          Halt the cycle.
 * @property {(targets: DOMPoint[]) => Promise<void>} converge
 *   Shake every fragment apart and draw the pieces to the given points.
 * @property {() => void} respawn
 *   Bring fresh fragments back, clear of the panel, and resume cycling.
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
      fade() {},
      startCycling() {},
      stopCycling() {},
      converge: () => Promise.resolve(),
      respawn() {}
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
    svg?.classList.add('is-dim');
    for (const shard of elements) shard.classList.add('is-faded');
  }

  /* ---------------------------------------------------------------
     Cycling: a fragment shatters, and comes back carrying something
     else. Labels are drawn from the pool without repeating anything
     currently on screen, so the field keeps moving without the eye
     catching the same word twice.
     --------------------------------------------------------------- */

  /** @type {number[]} */
  let cycleTimers = [];
  let cycling = false;
  /** How many fragments are mid-shatter right now. */
  let mutating = 0;

  /** @returns {string} A label not currently displayed. */
  function nextLabel() {
    const onScreen = new Set(elements.map((shard) => shard.textContent));
    const available = FRAGMENT_POOL.filter((label) => !onScreen.has(label));
    const source = available.length > 0 ? available : FRAGMENT_POOL;
    return source[Math.floor(Math.random() * source.length)];
  }

  /** @param {HTMLElement} shard */
  function shatter(shard) {
    mutating += 1;
    shard.classList.add('is-shattering');

    cycleTimers.push(window.setTimeout(() => {
      shard.textContent = nextLabel();
      shard.classList.remove('is-shattering');
      shard.classList.add('is-reforming');

      cycleTimers.push(window.setTimeout(() => {
        shard.classList.remove('is-reforming');
        mutating -= 1;
      }, FRAGMENT_CYCLE.shatterDuration));
    }, FRAGMENT_CYCLE.shatterDuration));
  }

  /**
   * Long random delays still cluster, so a fragment whose turn arrives while
   * another is mid-shatter waits rather than doubling up. The field never has
   * more than `maxConcurrent` things moving in it.
   *
   * @param {HTMLElement} shard
   */
  function scheduleCycle(shard) {
    const { minDelay, maxDelay, maxConcurrent } = FRAGMENT_CYCLE;
    const delay = minDelay + Math.random() * (maxDelay - minDelay);

    cycleTimers.push(window.setTimeout(() => {
      if (!cycling) return;
      if (mutating < maxConcurrent) shatter(shard);
      scheduleCycle(shard);
    }, delay));
  }

  function startCycling() {
    if (cycling) return;
    cycling = true;
    for (const shard of elements) scheduleCycle(shard);
  }

  function stopCycling() {
    cycling = false;
    mutating = 0;
    cycleTimers.forEach(window.clearTimeout);
    cycleTimers = [];
    for (const shard of elements) {
      shard.classList.remove('is-shattering', 'is-reforming');
    }
  }

  /**
   * Everything shakes, then the pieces are drawn to the given points.
   *
   * @param {DOMPoint[]} targets Offsets from the viewport centre. Fragments
   *   are dealt round-robin across them, so any number of targets works.
   * @returns {Promise<void>} Resolves once the pieces have arrived.
   */
  function converge(targets) {
    stopCycling();
    svg?.classList.add('is-dim');

    const points = targets.length > 0 ? targets : [new DOMPoint(0, 0)];
    for (const shard of elements) shard.classList.add('is-quaking');

    return new Promise((resolve) => {
      window.setTimeout(() => {
        elements.forEach((shard, i) => {
          const target = points[i % points.length];
          shard.classList.remove('is-quaking', 'is-faded');
          setVars(shard, {
            '--x': `${target.x.toFixed(0)}px`,
            '--y': `${target.y.toFixed(0)}px`
          });
          shard.classList.add('is-converging');
        });

        window.setTimeout(resolve, CONVERGE.duration);
      }, CONVERGE.formDelay);
    });
  }

  /**
   * Bring fragments back after the reassembly, so the stage keeps breathing
   * rather than emptying out. They return further out than the first burst
   * and clear of the vertical band the panel now occupies, then resume
   * cycling.
   */
  function respawn() {
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const isNarrow = window.innerWidth < SHARD_LAYOUT.narrowBreakpoint;
    const base = isNarrow ? RESPAWN.radiusRatioNarrow : RESPAWN.radiusRatio;
    const guard = RESPAWN.panelBand * vmin;

    elements.forEach((shard, i) => {
      const angle = (i / elements.length) * Math.PI * 2 + Math.random() * 0.4;
      const radius = base * vmin + Math.random() * SHARD_LAYOUT.radiusJitter * vmin;

      let y = Math.sin(angle) * radius;
      // Push clear of the panel rather than landing on top of the copy.
      if (Math.abs(y) < guard) y = Math.sign(y || 1) * guard;

      shard.classList.remove('is-converging', 'is-popped', 'is-faded');
      shard.textContent = nextLabel();
      setVars(shard, {
        '--x': `${(Math.cos(angle) * radius * SHARD_LAYOUT.horizontalStretch).toFixed(0)}px`,
        '--y': `${y.toFixed(0)}px`,
        '--rot': `${((Math.random() - 0.5) * SHARD_LAYOUT.maxRotation).toFixed(0)}deg`
      });
    });

    // Let the class removal commit before re-adding, or the pop animation
    // is never restarted.
    requestAnimationFrame(() => {
      stagger(elements, RESPAWN.stagger, (shard) => shard.classList.add('is-popped'));
      window.setTimeout(startCycling, elements.length * RESPAWN.stagger);
    });
  }

  return Object.freeze({
    pop, wire, fade, startCycling, stopCycling, converge, respawn
  });
}
