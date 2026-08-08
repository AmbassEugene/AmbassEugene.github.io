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
import { BIO, TEMPO } from './config.js';
import { prefersReducedMotion } from './env.js';
import { createParticleField } from './particle-field.js';
import { createVibration } from './vibration.js';
import { createShardBurst } from './shard-burst.js';
import { createColdOpen } from './cold-open.js';
import { createTrace } from './trace.js';
import { createTypewriter } from './typewriter.js';
import { createStageNav } from './stage-nav.js';
import { mountViewMode } from './view-mode.js';
import { mountMarquee } from './marquee.js';
import { mountReveals } from './reveal.js';

/**
 * Marks the document as scripted. Every progressive-enhancement rule in the
 * CSS keys off this class, so with scripting unavailable the page renders
 * complete and static rather than blank.
 */
document.documentElement.classList.add('js');

/**
 * Publish the tempo to CSS so keyframe durations scale with the same number
 * the JS timeline uses. Without this the two halves of the sequence would
 * drift apart the moment TEMPO changed.
 */
document.documentElement.style.setProperty('--tempo', String(TEMPO));

const motionAllowed = !prefersReducedMotion();

const field = createParticleField(
  /** @type {HTMLCanvasElement | null} */ (qs('#field')),
  { enabled: motionAllowed }
);

const vibration = createVibration(qs('#intro'));

const burst = createShardBurst(qs('#shards'), qsSvg('#constellation'));

const trace = createTrace(qs('#trace'), qs('#trace-state'));

// Types the positioning line already present in the markup.
const bio = createTypewriter(qs('#intro-bio'), BIO);

const stageNav = createStageNav(qs('#intro-nav'));

const coldOpen = createColdOpen({ field, vibration, burst, trace, bio, stageNav });

mountMarquee(qs('#marquee'));
mountReveals();
mountViewMode(qs('#view-mode'));

qs('#replay-intro')?.addEventListener('click', coldOpen.replay);

coldOpen.play();
