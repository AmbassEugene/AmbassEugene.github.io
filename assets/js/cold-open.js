/**
 * cold-open.js — the sequencer.
 *
 * Owns *when* each beat fires and nothing else. The particle field, the
 * vibration ramp and the fragment burst are injected, not constructed here,
 * so this module can be reasoned about — and the sequence retimed — without
 * touching any of them.
 *
 * Bypass rules, in order. The opening must never gate the content:
 *   1. reduced motion  → skip entirely
 *   2. deep link       → the visitor asked for a section, take them there
 *   3. already seen    → only when FEATURES.playIntroOncePerSession is on
 *
 * The full page sits in the DOM beneath an aria-hidden overlay throughout,
 * so crawlers and assistive technology are never waiting on any of this.
 *
 * @module cold-open
 */

import {
  TIMELINE, CADENCE, HANDOFF, FEATURES, INTRO_COPY, IMPLODE
} from './config.js';
import { qs, qsa, el, appendAll, setVars, stagger } from './dom.js';
import { prefersReducedMotion, isDeepLink, session } from './env.js';
import { impact } from './vibration.js';

/**
 * @typedef {object} ColdOpenDeps
 * @property {import('./particle-field.js').ParticleField} field
 * @property {import('./vibration.js').Vibration} vibration
 * @property {import('./shard-burst.js').ShardBurst} burst
 * @property {import('./trace.js').Trace} trace
 * @property {import('./typewriter.js').Typewriter} bio
 * @property {import('./stage-nav.js').StageNav} stageNav
 */

/**
 * @typedef {object} ColdOpen
 * @property {() => void} play    Run the sequence, or bypass it.
 * @property {() => void} end     Cut to the page immediately.
 * @property {() => void} replay  Restart from the beginning.
 */

/** Keys that cut straight to the page. */
const DISMISS_KEYS = new Set(['Escape', 'Enter', ' ']);

/**
 * @param {ColdOpenDeps} deps
 * @returns {ColdOpen}
 */
export function createColdOpen({ field, vibration, burst, trace, bio, stageNav }) {
  const scrim = qs('#intro-scrim');
  const intro = qs('#intro');
  const hero = qs('.hero .wrap');

  const singularity = qs('#singularity');
  const readout = qs('#readout');
  const copy = qs('#intro-copy');
  const statement = qs('#intro-statement');
  const shout = qs('#intro-shout');
  const bioBlock = qs('#intro-bio');
  const flash = qs('#flash');
  const skip = qs('#skip-intro');
  const rings = CADENCE.ringDurations.map((_, i) => qs(`#ring-${i + 1}`));
  const aberrations = intro ? qsa('.intro__ca', intro) : [];
  const shocks = intro ? qsa('.intro__shock', intro) : [];

  /** @type {number[]} */
  let timers = [];
  /** @type {number | undefined} */
  let readoutTimer;
  let ended = false;

  /**
   * Schedule a beat, keeping the id so a skip can cancel everything.
   * @param {number} ms
   * @param {() => void} fn
   */
  const at = (ms, fn) => timers.push(window.setTimeout(fn, ms));

  /** @param {number[]} ids Timer ids owned by a collaborator. */
  const track = (ids) => timers.push(...ids);

  /**
   * Schedule relative to now rather than to the start of the sequence.
   * @param {() => void} fn
   * @param {number} ms
   */
  const after = (fn, ms) => timers.push(window.setTimeout(fn, ms));

  function clearTimers() {
    timers.forEach(window.clearTimeout);
    timers = [];
  }

  /**
   * Swap the readout line, briefly fading through empty.
   *
   * The pending swap is tracked separately from the main timeline so that
   * silencing the readout at detonation also cancels a swap already in
   * flight — otherwise the last line reappears a beat after the blast.
   *
   * @param {string} text
   * @param {boolean} [hot] Render in the alert colour.
   */
  function say(text, hot = false) {
    if (!readout) return;
    window.clearTimeout(readoutTimer);
    readout.classList.remove('is-shown');
    readoutTimer = window.setTimeout(() => {
      readout.textContent = text;
      readout.classList.toggle('is-hot', hot);
      readout.classList.add('is-shown');
    }, CADENCE.readoutSwap);
    timers.push(readoutTimer);
  }

  /** Silence the readout, including any swap already scheduled. */
  function hush() {
    window.clearTimeout(readoutTimer);
    readout?.classList.remove('is-shown');
  }

  /**
   * Collapse one ring over its configured duration.
   * @param {number} index Zero-based; maps to #ring-1, #ring-2, #ring-3.
   */
  function collapseRing(index) {
    const ring = rings[index];
    if (!ring) return;
    setVars(ring, { '--dur': `${CADENCE.ringDurations[index]}ms` });
    ring.classList.add('is-collapsing');
  }

  /**
   * Split the statement into words and the shout into characters, keeping
   * references to what we build. Act V animates these directly rather than
   * querying the document for elements this function just created.
   *
   * @returns {{ words: HTMLElement[], chars: HTMLElement[] }}
   */
  function buildCopy() {
    /** @type {HTMLElement[]} */ let words = [];
    /** @type {HTMLElement[]} */ let chars = [];

    if (statement) {
      const parts = INTRO_COPY.statement.split(' ');
      words = parts.map((word) => el('span', { className: 'intro__word', text: word }));
      // Interleave real spaces so the line still wraps and reads as prose.
      appendAll(statement, words.flatMap((node, i) =>
        i < words.length - 1 ? [node, document.createTextNode(' ')] : [node]));
    }

    if (shout) {
      chars = Array.from(INTRO_COPY.shout, (character, i) => {
        const rotation = (i % 2 ? 1 : -1) * (8 + Math.random() * 14);
        return el('span', {
          className: 'intro__char',
          text: character,
          vars: { '--r': `${rotation.toFixed(1)}deg` }
        });
      });
      appendAll(shout, chars);
    }

    return { words, chars };
  }

  function detonate() {
    vibration.stop();
    intro?.classList.add('is-quaking');
    impact();

    hush();
    flash?.classList.add('is-firing');
    for (const layer of [...aberrations, ...shocks]) layer.classList.add('is-firing');

    singularity?.classList.remove('is-critical');
    singularity?.classList.add('is-blown');

    field.bang();
  }

  /**
   * Bring the hero in. Called on every path, including bypass, so the hero
   * has exactly one way of becoming visible.
   *
   * @param {number} delay Milliseconds before the first element rises.
   */
  function revealHero(delay) {
    document.body.classList.remove('is-intro');
    if (!hero || prefersReducedMotion()) return;

    const children = /** @type {HTMLElement[]} */ (Array.from(hero.children));
    for (const child of children) child.classList.add('is-pending');

    children.forEach((child, i) => {
      timers.push(window.setTimeout(
        () => child.classList.replace('is-pending', 'is-revealed'),
        delay + i * CADENCE.heroStagger
      ));
    });
  }

  /**
   * Release the stage and hand the page over. Reached by choosing
   * "Case studies", by skipping, or by a dismiss key — never by a timer.
   */
  function end() {
    if (ended) return;
    ended = true;

    clearTimers();
    burst.stopCycling();
    document.removeEventListener('keydown', onKey);
    vibration.stop();
    field.ambient();

    scrim?.classList.add('is-out');
    intro?.classList.add('is-out');
    revealHero(HANDOFF.heroDelay);

    at(HANDOFF.removeOverlay, () => {
      intro?.remove();
      scrim?.remove();
    });
    at(HANDOFF.startTrace, () => trace.start());
  }

  /**
   * Act VII. The closing line lands, every fragment shakes apart, and the
   * pieces are drawn to two points that resolve into the only two choices
   * the stage offers. Nothing is on a timer from here — the sequence waits
   * for the visitor rather than deciding for them.
   */
  function reassemble() {
    after(() => {
      burst.converge().then((points) => stageNav.form(points));
    }, HANDOFF.holdAfterBio);
  }

  /** Take the visitor straight to the page. */
  function bypass() {
    scrim?.remove();
    intro?.remove();
    revealHero(0);
    bio.finish();
    trace.start();
  }

  function play() {
    if (!scrim || !intro) return;

    const seen = FEATURES.playIntroOncePerSession &&
      session.get(FEATURES.introSessionKey) === '1';

    if (prefersReducedMotion() || isDeepLink() || seen) {
      bypass();
      return;
    }

    if (FEATURES.playIntroOncePerSession) {
      session.set(FEATURES.introSessionKey, '1');
    }

    document.body.classList.add('is-intro');
    const { words, chars } = buildCopy();

    // ---- Act I — the void ----
    at(TIMELINE.sayAwaiting, () => say(INTRO_COPY.readout.awaiting));
    at(TIMELINE.sayIntent, () => say(INTRO_COPY.readout.intent));

    // ---- Act II — compression ----
    at(TIMELINE.sayCompressing, () => say(INTRO_COPY.readout.compressing));
    at(TIMELINE.vibrationStart, () => vibration.ramp());
    at(TIMELINE.ring1, () => collapseRing(0));
    at(TIMELINE.ring2, () => collapseRing(1));
    at(TIMELINE.ring3, () => collapseRing(2));
    at(TIMELINE.sayDensity, () => say(INTRO_COPY.readout.density, true));
    at(TIMELINE.critical, () => singularity?.classList.add('is-critical'));
    at(TIMELINE.sayCriticalMass, () => say(INTRO_COPY.readout.critical, true));

    // ---- Act III — detonation ----
    at(TIMELINE.detonate, detonate);

    // ---- Act IV — matter ----
    at(TIMELINE.shardWave1, () => track(burst.pop(0)));
    at(TIMELINE.fieldCools, () => field.ambient());
    at(TIMELINE.shardWave2, () => track(burst.pop(1)));
    at(TIMELINE.shardWave3, () => track(burst.pop(2)));
    at(TIMELINE.constellation, () => track(burst.wire()));

    // ---- Act V — the statement ----
    at(TIMELINE.matterRecedes, () => burst.fade());
    at(TIMELINE.statement, () => {
      track(stagger(words, CADENCE.wordStagger,
        (word) => word.classList.add('is-in')));
    });
    at(TIMELINE.shout, () => {
      track(stagger(chars, CADENCE.charStagger,
        (character) => character.classList.add('is-in')));
    });
    at(TIMELINE.bloom, () => shout?.classList.add('is-blooming'));

    // ---- Act VI — handoff ----
    at(TIMELINE.copyRecedes, () => copy?.classList.add('is-receding'));

    // ---- Act VI — the bio, typed while the fragments keep turning over ----
    at(TIMELINE.bio, () => {
      bioBlock?.classList.add('is-shown');
      burst.startCycling();
      bio.run().then(reassemble);
    });

    skip?.addEventListener('click', end, { once: true });
    stageNav.onEnter(() => {
      end();
      // Wait for the overlay to clear before jumping, or the scroll lands
      // against a page that is still behind `overflow: hidden`.
      window.setTimeout(
        () => qs('#work')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        HANDOFF.removeOverlay
      );
    });
    document.addEventListener('keydown', onKey);
  }

  /** @param {KeyboardEvent} event */
  function onKey(event) {
    if (DISMISS_KEYS.has(event.key)) end();
  }

  /**
   * The reverse big bang. The field runs the detonation backwards while the
   * page collapses toward the same point, and only then does the document
   * reload into the opening.
   *
   * Reload rather than teardown-and-rebuild: the sequence mutates a great
   * deal of one-shot CSS animation state, and reconstructing it correctly
   * costs more code than it saves for something triggered at most twice.
   * The collapse is what makes the reload read as intentional.
   */
  function replay() {
    if (FEATURES.playIntroOncePerSession) {
      session.set(FEATURES.introSessionKey, '0');
    }

    // Drop any hash, or the deep-link bypass would swallow the replay.
    const target = window.location.pathname + window.location.search;

    if (prefersReducedMotion()) {
      window.location.replace(target);
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.classList.add('is-imploding');
    field.implode();
    window.setTimeout(() => window.location.replace(target), IMPLODE.duration);
  }

  return Object.freeze({ play, end, replay });
}
