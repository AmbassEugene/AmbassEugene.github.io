/**
 * main.js — the composition root.
 *
 * The only module that reaches into the document for concrete elements and
 * wires collaborators together. Every other module receives what it needs as
 * an argument, which is what keeps them independently testable and lets the
 * cold open run against a stub field.
 *
 * Nothing here is exported: this is the entry point, not a library.
 *
 * @module main
 */

import { qs, qsSvg } from './dom.js';
import { prefersReducedMotion } from './env.js';
import { createParticleField } from './particle-field.js';
import { createVibration } from './vibration.js';
import { createShardBurst } from './shard-burst.js';
import { createColdOpen } from './cold-open.js';
import { createTrace } from './trace.js';
import { mountMarquee } from './marquee.js';
import { mountReveals } from './reveal.js';

/**
 * Marks the document as scripted. Every progressive-enhancement rule in the
 * CSS keys off this class, so with scripting unavailable the page renders
 * complete and static rather than blank.
 */
document.documentElement.classList.add('js');

const motionAllowed = !prefersReducedMotion();

const field = createParticleField(
  /** @type {HTMLCanvasElement | null} */ (qs('#field')),
  { enabled: motionAllowed }
);

const vibration = createVibration(qs('#intro'));

const burst = createShardBurst(qs('#shards'), qsSvg('#constellation'));

const trace = createTrace(qs('#trace'), qs('#trace-state'));

const coldOpen = createColdOpen({ field, vibration, burst, trace });

mountMarquee(qs('#marquee'));
mountReveals();

qs('#replay-intro')?.addEventListener('click', coldOpen.replay);

coldOpen.play();
